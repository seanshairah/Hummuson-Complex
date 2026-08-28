import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  MessageCircle,
  Phone,
  Mail,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { footerNav } from "@/lib/nav";
import { site } from "@/lib/site";
import { Logo } from "@/components/layout/logo";
import { Em } from "@/components/ui/section-heading";
import { getContactSettings } from "@/server/data/settings";
import { whatsappLink, whatsappAdviceMessage } from "@/lib/whatsapp";

const SOCIAL_ICONS = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
} as const;

export async function Footer() {
  const contact = await getContactSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-humus-950 bg-grain text-paper">
      {/* CTA band */}
      <div className="relative overflow-hidden border-b border-paper/10">
        <div className="glow-leaf absolute inset-0" aria-hidden />
        <div className="container-site relative flex flex-col items-start gap-8 py-16 md:flex-row md:items-end md:justify-between md:py-20">
          <div className="max-w-2xl">
            <p className="text-eyebrow text-leaf-400">Talk to an agronomist</p>
            <h2 className="text-display-2 mt-3 text-paper">
              Ready for <Em className="text-leaf-300">healthier soil</Em> and stronger crops?
            </h2>
            <p className="mt-4 max-w-xl text-paper/70">
              Get product guidance, application support and field advice — directly from the
              Humuson team on WhatsApp.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href={whatsappLink(whatsappAdviceMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-leaf-400 px-7 font-display font-medium text-humus-950 transition-colors hover:bg-leaf-300"
            >
              <MessageCircle className="size-5" strokeWidth={1.8} /> WhatsApp us
            </a>
            <Link
              href="/products"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-paper/25 px-7 font-display font-medium text-paper transition-colors hover:border-paper/60 hover:bg-paper/10"
            >
              Explore products <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="container-site grid gap-12 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
        <div>
          <Link href="/" aria-label="Humuson Complex — home">
            <Logo tone="light" />
          </Link>
          <p className="text-editorial mt-5 text-lg text-leaf-300">{site.tagline}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-paper/60">{site.description}</p>
        </div>

        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={group.heading}>
            <h3 className="text-eyebrow text-paper/50">{group.heading}</h3>
            <ul className="mt-4 space-y-2.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-paper/75 transition-colors hover:text-leaf-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3 className="text-eyebrow text-paper/50">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-paper/75">
            {contact.phones.map((phone) => (
              <li key={phone}>
                <a
                  href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-leaf-300"
                >
                  <Phone className="size-4 shrink-0 text-leaf-400" strokeWidth={1.8} />
                  {phone}
                </a>
              </li>
            ))}
            <li>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 transition-colors hover:text-leaf-300"
              >
                <MessageCircle className="size-4 shrink-0 text-leaf-400" strokeWidth={1.8} />
                WhatsApp catalogue & chat
              </a>
            </li>
            {contact.emails.map((email) => (
              <li key={email}>
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-leaf-300"
                >
                  <Mail className="size-4 shrink-0 text-leaf-400" strokeWidth={1.8} />
                  {email}
                </a>
              </li>
            ))}
            {contact.address && (
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-leaf-400" strokeWidth={1.8} />
                <span>{contact.address}</span>
              </li>
            )}
          </ul>
          <div className="mt-5 flex gap-2.5">
            {(Object.keys(SOCIAL_ICONS) as (keyof typeof SOCIAL_ICONS)[]).map((key) => {
              const href = contact.socials[key];
              if (!href) return null;
              const Icon = SOCIAL_ICONS[key];
              return (
                <a
                  key={key}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Humuson on ${key}`}
                  className="flex size-9 items-center justify-center rounded-full border border-paper/15 text-paper/70 transition-colors hover:border-leaf-400 hover:text-leaf-300"
                >
                  <Icon className="size-4" strokeWidth={1.8} />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-paper/10">
        <div className="container-site flex flex-col items-center justify-between gap-3 py-6 text-xs text-paper/45 sm:flex-row">
          <p>
            © {year} {site.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-4">
            <Link href="/faq" className="hover:text-paper/80">
              FAQ
            </Link>
            <Link href="/contact" className="hover:text-paper/80">
              Contact
            </Link>
            <Link href="/search" className="hover:text-paper/80">
              Search
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
