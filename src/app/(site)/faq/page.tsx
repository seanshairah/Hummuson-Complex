import type { Metadata } from "next";
import { PageIntro } from "@/components/shared/page-intro";
import { FaqExplorer } from "@/components/faq/faq-explorer";
import { getAllFaqs } from "@/server/data/content";
import { faqJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "FAQ — verified answers about the Humuson range",
  description:
    "Delivery, consultation, composition, application, shelf life and more — answered by Humuson Complex.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await getAllFaqs();

  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <PageIntro
        eyebrow="Questions & answers"
        title="Asked and"
        titleAccent="answered"
        lede="Every answer here is published by Humuson Complex. Can’t find yours? Ask Humuson in the corner of any page, or reach an adviser on WhatsApp."
        crumbs={[{ label: "FAQ" }]}
      />
      <section className="container-site max-w-4xl pb-20">
        <FaqExplorer faqs={faqs} />
      </section>
    </>
  );
}
