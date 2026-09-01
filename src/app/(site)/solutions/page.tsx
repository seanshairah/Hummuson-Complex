import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake, Leaf, Microscope, Package, Truck, Users } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { Em, SectionHeading } from "@/components/ui/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ButtonLink } from "@/components/ui/button";
import { getCompanySettings } from "@/server/data/settings";
import { getFilterOptions } from "@/server/data/products";
import { whatsappAdviceMessage } from "@/lib/whatsapp";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Solutions & services",
  description:
    "Beyond products: consultation, delivery, farm visits, project management and distribution partnerships from Humuson Complex.",
  alternates: { canonical: "/solutions" },
};

const SERVICE_ICONS = [Package, Truck, Users, Microscope, Handshake, Leaf];

export default async function SolutionsPage() {
  const [company, options] = await Promise.all([getCompanySettings(), getFilterOptions()]);

  return (
    <>
      <PageIntro
        eyebrow="Solutions & services"
        title="More than a"
        titleAccent="product supplier"
        lede="Products only work when they’re used right. Humuson pairs the range with consultation, delivery and field support — as published on our services."
        crumbs={[{ label: "Solutions" }]}
      />

      <section className="container-site pb-16">
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {company.services.map((service, i) => {
            const Icon = SERVICE_ICONS[i % SERVICE_ICONS.length]!;
            return (
              <RevealItem key={service.title}>
                <div className="flex h-full flex-col rounded-2xl border border-line bg-cream p-6">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-leaf-300/40 text-leaf-800">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <h2 className="mt-4 font-display text-lg leading-snug font-semibold text-ink">
                    {service.title}
                  </h2>
                  {service.description && (
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {service.description}
                    </p>
                  )}
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </section>

      {/* Ranges */}
      <section className="border-t border-line bg-paper-dim/60 py-16">
        <div className="container-site">
          <Reveal>
            <SectionHeading
              eyebrow="The ranges"
              title={
                <>
                  Choose your <Em className="text-brand">range</Em>
                </>
              }
              lede="Filter the full catalogue by range, crop or the outcome you’re after."
            />
          </Reveal>
          <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.06}>
            {options.categories.map((category) => (
              <RevealItem key={category.slug}>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="group bg-grain flex h-full flex-col justify-between rounded-2xl bg-humus-950 p-6 text-paper transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
                >
                  <h3 className="font-display text-xl font-semibold">{category.name}</h3>
                  <p className="mt-6 flex items-center justify-between text-sm text-paper/60">
                    {category.count} product{category.count === 1 ? "" : "s"}
                    <ArrowRight className="size-4 text-leaf-400 transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="container-site flex flex-col items-start justify-between gap-6 py-16 md:flex-row md:items-center">
        <div>
          <h2 className="text-display-3 text-ink">Not sure where to start?</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Four questions match you with the right products — or ask an adviser directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/product-finder" size="lg">
            Product finder
          </ButtonLink>
          <WhatsAppButton
            message={whatsappAdviceMessage()}
            label="WhatsApp an adviser"
            size="lg"
            variant="outline"
          />
        </div>
      </section>
    </>
  );
}
