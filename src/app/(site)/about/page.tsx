import type { Metadata } from "next";
import Image from "next/image";
import { PageIntro } from "@/components/shared/page-intro";
import { Em, SectionHeading } from "@/components/ui/section-heading";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { ButtonLink } from "@/components/ui/button";
import { getCompanySettings, getContactSettings } from "@/server/data/settings";
import { googleMapsLink } from "@/lib/maps";
import { site } from "@/lib/site";
import { whatsappAdviceMessage } from "@/lib/whatsapp";
import { organizationJsonLd } from "@/lib/seo";
import partnerBioenergy from "../../../../public/images/brand/Bioenergy_naujas-logotipas-3.jpg";
import partnerSapropel from "../../../../public/images/brand/partner-433fd162.jpg";
import handsPhoto from "../../../../public/images/field/field-IMG_0561.jpg";
import fieldPhoto from "../../../../public/images/field/field-IMG_0597.jpg";
import { JsonLd } from "@/components/shared/json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "About — the home of healthy soil & healthy crop",
  description:
    "Humuson Complex (MKM Fertilisers) supplies organic fertilisers, biostimulants and foliar feeds to restore Zimbabwe's soils and grow profitable, sustainable farms.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [company, contact] = await Promise.all([getCompanySettings(), getContactSettings()]);
  const paragraphs = company.about.split("\n\n").filter(Boolean);
  const story = paragraphs.filter(
    (p) => !p.startsWith("Our Vision") && !p.startsWith("Our Mission"),
  );
  const vision = paragraphs.find((p) => p.startsWith("Our Vision"))?.replace(/^Our Vision:\s*/, "");
  const mission = paragraphs
    .find((p) => p.startsWith("Our Mission"))
    ?.replace(/^Our Mission:\s*/, "");

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <PageIntro
        tone="dark"
        eyebrow="About Humuson Complex"
        title="Restoring the soil Zimbabwe"
        titleAccent="grows on"
        lede={company.tagline}
        crumbs={[{ label: "About" }]}
      />

      {/* Story */}
      <section className="container-site grid items-center gap-12 py-16 md:py-20 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            eyebrow="Our story"
            title={
              <>
                Born to fill a <Em className="text-brand">gap</Em>
              </>
            }
          />
          <div className="mt-6 space-y-4 leading-relaxed text-ink-soft">
            {story.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="relative">
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-card">
            <Image
              src={handsPhoto}
              alt="Humuson Complex team transplanting seedlings in the field"
              fill
              sizes="(max-width: 1024px) 92vw, 560px"
              className="object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-4 hidden w-56 overflow-hidden rounded-2xl border-4 border-paper shadow-float md:block">
            <Image
              src={fieldPhoto}
              alt="Field scouting in a young maize crop"
              className="h-36 w-full object-cover"
              sizes="224px"
            />
          </div>
        </Reveal>
      </section>

      {/* Vision & mission */}
      {(vision || mission) && (
        <section className="bg-grain bg-humus-950 py-16 text-paper">
          <div className="container-site grid gap-6 md:grid-cols-2">
            {vision && (
              <Reveal className="rounded-3xl border border-paper/10 bg-paper/5 p-8">
                <p className="text-eyebrow text-leaf-400">Our vision</p>
                <p className="mt-4 text-editorial text-xl leading-relaxed text-paper/90">
                  {vision}
                </p>
              </Reveal>
            )}
            {mission && (
              <Reveal delay={0.1} className="rounded-3xl border border-paper/10 bg-paper/5 p-8">
                <p className="text-eyebrow text-leaf-400">Our mission</p>
                <p className="mt-4 text-editorial text-xl leading-relaxed text-paper/90">
                  {mission}
                </p>
              </Reveal>
            )}
          </div>
        </section>
      )}

      {/* Values */}
      {company.values.length > 0 && (
        <section className="container-site py-16 md:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="What we stand for"
              title={
                <>
                  Values that <Em className="text-brand">hold</Em>
                </>
              }
            />
          </Reveal>
          <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
            {company.values.map((value, i) => (
              <RevealItem key={value.name}>
                <div className="h-full rounded-2xl border border-line bg-cream p-6">
                  <span className="font-display text-sm font-semibold text-leaf-700">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">{value.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{value.text}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>
      )}

      {/* Partners */}
      <section className="border-y border-line bg-cream py-14">
        <div className="container-site flex flex-col items-center gap-8 text-center">
          <SectionHeading
            align="center"
            eyebrow="Our producers"
            title={
              <>
                Renowned <Em className="text-brand">European brands</Em>
              </>
            }
            lede="Humuson Complex distributes for established European producers of organic and biological crop nutrition."
          />
          <div className="flex flex-wrap items-center justify-center gap-10">
            <Image
              src={partnerBioenergy}
              alt="Bioenergy LT"
              className="h-16 w-auto rounded-lg object-contain"
              sizes="160px"
            />
            <Image
              src={partnerSapropel}
              alt="Sapropel Organics"
              className="h-10 w-auto object-contain"
              sizes="180px"
            />
          </div>
        </div>
      </section>

      {/* Visit / contact strip */}
      <section className="container-site flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-center">
        <div>
          <h2 className="text-display-3 text-ink">Come and talk crops</h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            <a
              href={googleMapsLink(`${site.name}, ${contact.address ?? "Harare, Zimbabwe"}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-leaf-600/40 underline-offset-4 transition-colors hover:text-brand"
            >
              {contact.address ?? "Harare, Zimbabwe"}
            </a>
            {contact.hours && (
              <>
                <br />
                <span className="text-sm text-ink-faint">{contact.hours}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <WhatsAppButton message={whatsappAdviceMessage()} label="WhatsApp us" size="lg" />
          <ButtonLink href="/contact" variant="outline" size="lg">
            Contact details
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
