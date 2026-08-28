"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, Menu, X } from "lucide-react";
import { mainNav, secondaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";
import { AskHumusonLauncher } from "@/components/ask/launcher";
import { SearchLauncher } from "@/components/search/launcher";

/** Routes that open with a dark immersive hero → header starts light-on-dark. */
const DARK_ROUTE_PREFIXES = ["/catalogue", "/product-finder"];

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const onDarkRoute =
    pathname === "/" || DARK_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const onDark = onDarkRoute && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled && "glass-light shadow-card",
        scrolled && "supports-[backdrop-filter]:bg-cream/70",
      )}
    >
      <div className="container-wide flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <Link href="/" aria-label="Humuson Complex — home" className="shrink-0">
          <Logo tone={onDark || open ? "light" : "dark"} className={cn(open && "relative z-50")} />
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Main" className="hidden lg:block">
          <ul
            className={cn(
              "flex items-center gap-0.5 rounded-full border p-1 transition-colors",
              onDark ? "border-paper/15 bg-humus-950/40 backdrop-blur-md" : "border-ink/8 bg-paper-dim/70",
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
              "relative z-50 flex size-10 items-center justify-center rounded-full border lg:hidden",
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

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={cn(
          "fixed inset-0 z-40 flex flex-col bg-humus-950 bg-grain transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="glow-leaf absolute inset-0" aria-hidden />
        <nav aria-label="Mobile" className="relative mt-24 flex-1 overflow-y-auto px-6 pb-10">
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
            <a
              href={whatsappLink(whatsappAdviceMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-leaf-400 font-display font-medium text-humus-950"
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
    </header>
  );
}
