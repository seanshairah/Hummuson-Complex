"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Menu, X } from "lucide-react";
import { mainNav, secondaryNav } from "@/lib/nav";
import { routeTone } from "@/lib/route-tone";
import { useActiveScreen } from "@/lib/screens";
import { getLenis } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";
import { AskHumusonLauncher } from "@/components/ask/launcher";
import { SearchLauncher } from "@/components/search/launcher";

export function Header() {
  const pathname = usePathname();
  const barRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  /*
   * Tone. On a page built from screens (the homepage) the header follows
   * whatever screen is beneath its own bar: transparent and light-on-dark over
   * a dark screen, frosted cream over a light one, switching as each boundary
   * passes underneath. Elsewhere it starts light-on-dark on the routes that
   * open with a dark hero (see src/lib/route-tone.ts — the route veil uses the
   * same list) and turns frosted once scrolled.
   */
  const { active: screen } = useActiveScreen(
    () => (barRef.current?.offsetHeight ?? 72) / 2,
    pathname,
  );
  const onDark = screen ? screen.tone === "dark" : routeTone(pathname) === "dark" && !scrolled;
  const frosted = scrolled && !open && !onDark;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    // A hidden overflow stops native scrolling only; Lenis would still glide
    // the page under the menu on a wheel, so it is stopped too — and started
    // again only if nothing else (a dialog) still holds the body locked.
    const release = () => {
      if (!document.body.hasAttribute("data-scroll-locked")) getLenis()?.start();
    };
    if (open) getLenis()?.stop();
    else release();
    return () => {
      document.documentElement.style.overflow = "";
      release();
    };
  }, [open]);

  return (
    <>
      <header
        ref={barRef}
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-300",
          // Above the mobile menu panel, which is a sibling below: the bar keeps
          // the logo and the close button visible over the open menu.
          open && "z-50",
          // ...but transparent while it is open, so the dark panel behind shows
          // through and the light logo and close button keep their contrast.
          // The panel used to sit inside the header and cover this itself.
          frosted && "shadow-card glass-light",
          frosted && "supports-[backdrop-filter]:bg-cream/70",
          // Over a dark screen, once content is moving under the bar, a soft
          // scrim keeps the logo legible without turning the bar into a slab.
          onDark && scrolled && !open && "bg-gradient-to-b from-humus-950/75 to-transparent",
        )}
      >
        <div className="container-wide flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
          <Link href="/" aria-label="Humuson Complex — home" className="shrink-0">
            <Logo tone={onDark || open ? "light" : "dark"} />
          </Link>

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul
              className={cn(
                "flex items-center gap-0.5 rounded-full border p-1 transition-colors",
                onDark
                  ? "border-paper/15 bg-humus-950/40 backdrop-blur-md"
                  : "border-ink/8 bg-paper-dim/70",
              )}
            >
              {mainNav.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-full px-4 py-2 font-display text-sm font-medium transition-colors",
                        active
                          ? onDark
                            ? "bg-leaf-400 text-humus-950"
                            : "bg-humus-900 text-paper"
                          : onDark
                            ? "text-paper/85 hover:bg-paper/10 hover:text-paper"
                            : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Utilities */}
          <div className="flex items-center gap-2">
            <SearchLauncher tone={onDark ? "light" : "dark"} />
            <a
              href={whatsappLink(whatsappAdviceMessage())}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with Humuson on WhatsApp"
              className={cn(
                "hidden size-10 items-center justify-center rounded-full border transition-colors sm:flex",
                onDark
                  ? "border-paper/20 text-paper hover:bg-paper/10"
                  : "border-ink/12 text-ink hover:bg-ink/5",
              )}
            >
              <MessageCircle className="size-[1.15rem]" strokeWidth={1.8} />
            </a>
            <div className="hidden md:block">
              <AskHumusonLauncher tone={onDark ? "light" : "dark"} />
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border lg:hidden",
                open
                  ? "border-paper/25 text-paper"
                  : onDark
                    ? "border-paper/20 text-paper"
                    : "border-ink/12 text-ink",
              )}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {/*
       * Mobile menu — deliberately a SIBLING of <header>, not a child.
       * `backdrop-filter` (the scrolled header's frosted glass) makes an element
       * a containing block for its `position: fixed` descendants, so while this
       * panel lived inside the header its `inset-0` resolved against the 64px
       * bar instead of the viewport: scrolling, then opening the menu, collapsed
       * it to a strip with the page showing through underneath. Nothing inside a
       * filtered ancestor can be viewport-fixed, so the panel lives out here.
       */}
      <div
        id="mobile-menu"
        className={cn(
          "bg-grain fixed inset-0 z-40 flex flex-col bg-humus-950 transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="absolute inset-0 glow-leaf" aria-hidden />
        <nav data-lenis-prevent aria-label="Mobile" className="relative mt-24 flex-1 overflow-y-auto px-6 pb-10">
          <ul className="space-y-1">
            {mainNav.map((item, i) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="group flex items-baseline justify-between border-b border-paper/10 py-4"
                  style={{ transitionDelay: `${i * 30}ms` }}
                >
                  <span className="font-display text-3xl font-medium tracking-tight text-paper group-hover:text-leaf-300">
                    {item.label}
                  </span>
                  <span className="text-xs text-paper/50">{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
            {secondaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-sm text-paper/70 hover:text-paper">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3">
            <AskHumusonLauncher tone="light" variant="wide" />
            <a
              href={whatsappLink(whatsappAdviceMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full border border-paper/25 font-display font-medium text-paper"
            >
              <MessageCircle className="size-5" strokeWidth={1.8} /> WhatsApp Humuson
            </a>
            <Link
              href="/contact"
              className="flex h-12 items-center justify-center rounded-full border border-paper/25 font-display font-medium text-paper"
            >
              Request advice
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
