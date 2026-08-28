import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { EnquiryForm } from "@/components/contact/enquiry-form";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { getContactSettings } from "@/server/data/settings";
import { getProductBySlug } from "@/server/data/products";
import { whatsappAdviceMessage, whatsappCatalogueLink } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Contact — talk to a Humuson adviser",
  description:
    "Reach Humuson Complex in Harare: WhatsApp, phone, email or an enquiry form. Basic consultation is free.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const params = await searchParams;
  const contact = await getContactSettings();
  const product = params.product ? await getProductBySlug(params.product) : null;

  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="Talk to someone who knows"
        titleAccent="your soil"
        lede="Basic consultation is free — reach us on WhatsApp for the quickest answer, or send an enquiry and the team will come back to you."
        crumbs={[{ label: "Contact" }]}
      />

      <section className="container-site grid gap-12 pb-20 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Details */}
        <div className="space-y-4">
          <a
            href={whatsappCatalogueLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-grain flex items-start gap-4 rounded-3xl bg-humus-950 p-6 text-paper transition-transform hover:-translate-y-0.5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-leaf-400 text-humus-950">
              <MessageCircle className="size-5" strokeWidth={1.9} />
            </span>
            <span>
              <span className="block font-display text-lg font-semibold">WhatsApp</span>
              <span className="mt-1 block text-sm text-paper/70">
                Chat, order and browse the WhatsApp catalogue —{" "}
                {contact.phones[0] ?? "+263 77 665 6433"}
              </span>
            </span>
          </a>

          <div className="space-y-4 rounded-3xl border border-line bg-cream p-6">
            {contact.phones.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                className="flex items-center gap-3.5 text-ink hover:text-brand"
              >
                <Phone className="size-4.5 text-leaf-700" strokeWidth={1.9} />
                <span className="text-sm font-medium">{phone}</span>
              </a>
            ))}
            {contact.emails.map((email) => (
              <a
                key={email}
                href={`mailto:${email}`}
                className="flex items-center gap-3.5 text-ink hover:text-brand"
              >
                <Mail className="size-4.5 text-leaf-700" strokeWidth={1.9} />
                <span className="text-sm font-medium">{email}</span>
              </a>
            ))}
            {contact.address && (
              <p className="flex items-start gap-3.5 text-ink">
                <MapPin className="mt-0.5 size-4.5 shrink-0 text-leaf-700" strokeWidth={1.9} />
                <span className="text-sm">{contact.address}</span>
              </p>
            )}
            {contact.hours && (
              <p className="flex items-start gap-3.5 text-ink">
                <Clock className="mt-0.5 size-4.5 shrink-0 text-leaf-700" strokeWidth={1.9} />
                <span className="text-sm">{contact.hours}</span>
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-dashed border-line p-6 text-sm leading-relaxed text-ink-faint">
            Free basic consultation · farm visits at an agreed amount · delivery available (fees
            depend on distance) — as published by Humuson Complex.
          </div>
        </div>

        {/* Form */}
        <div className="rounded-3xl border border-line bg-cream p-6 md:p-8">
          <h2 className="text-title text-ink">Send an enquiry</h2>
          <p className="mt-1.5 mb-6 text-sm text-ink-faint">
            The team typically responds within business hours.
          </p>
          <EnquiryForm
            productSlug={product?.slug}
            productName={product?.name}
            source={product ? "PRODUCT_PAGE" : "CONTACT_FORM"}
          />
        </div>
      </section>

      <section className="border-t border-line bg-paper-dim/60 py-12">
        <div className="container-site flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-xl text-sm leading-relaxed text-ink-soft">
            Prefer to talk it through? An adviser can recommend products, rates and timing for your
            exact situation.
          </p>
          <WhatsAppButton message={whatsappAdviceMessage()} label="Chat on WhatsApp" size="lg" />
        </div>
      </section>
    </>
  );
}
