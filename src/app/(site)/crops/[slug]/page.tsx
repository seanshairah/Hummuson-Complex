import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MessageCircleQuestion, Newspaper, PlayCircle } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { ProductCard } from "@/components/shared/product-card";
import { GrowthTimeline } from "@/components/crops/growth-timeline";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { VideoEmbed } from "@/components/shared/video-embed";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { MediaImage } from "@/components/shared/media-image";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { ViewTracker } from "@/components/products/view-tracker";
import { getCropBySlug, getCropSlugs } from "@/server/data/crops";
import { getProjectBySlug } from "@/server/data/content";
import { faqJsonLd } from "@/lib/seo";
import { whatsappAdviceMessage } from "@/lib/whatsapp";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getCropSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const crop = await getCropBySlug(slug);
  if (!crop) return { title: "Crop not found" };
  return {
    title: `${crop.name.charAt(0).toUpperCase() + crop.name.slice(1)} — products & guidance`,
    description: `Humuson Complex products listed for ${crop.name}: growth-stage guidance, application questions and field results.`,
    alternates: { canonical: `/crops/${crop.slug}` },
  };
}

export default async function CropPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const crop = await getCropBySlug(slug);
  if (!crop) notFound();

  // The old site's portfolio charts are stored as projects sharing the crop —
  // surface the application-program artwork when it exists.
  const program = crop.projects[0] ? await getProjectBySlug(crop.projects[0].slug) : null;
  const displayName = crop.name.charAt(0).toUpperCase() + crop.name.slice(1);

  return (
    <>
      {crop.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(crop.faqs)) }}
        />
      )}
      <ViewTracker type="CROP_VIEW" entityType="crop" entityId={crop.id} />

      <PageIntro
        eyebrow="Crop guidance"
        title={displayName}
        lede={
          crop.description ??
          `${crop.products.length} Humuson product${crop.products.length === 1 ? "" : "s"} list ${crop.name} in their published guidance — explore them by growth stage below.`
        }
        crumbs={[{ label: "Crops", href: "/crops" }, { label: displayName }]}
        actions={
          <WhatsAppButton
            message={whatsappAdviceMessage(`growing ${crop.name}`)}
            label={`Ask about ${crop.name}`}
            entityType="crop"
            entityId={crop.id}
          />
        }
      />

      {/* Growth-stage timeline */}
      <section className="container-site pb-16">
        <Reveal>
          <h2 className="text-display-3 text-ink">Season timeline</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-faint">
            Stages are matched from each product’s own published guidance — a product appears at a
            stage only when its documentation references it.
          </p>
        </Reveal>
        <div className="mt-8">
          <GrowthTimeline stages={crop.stages} cropName={crop.name} />
        </div>
      </section>

      {/* Program chart from the old site's portfolio */}
      {program?.image && (
        <section className="container-site pb-16">
          <Reveal className="overflow-hidden rounded-3xl border border-line bg-cream shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">
                  Humuson application program — {displayName.toLowerCase()}
                </h2>
                <p className="text-xs text-ink-faint">
                  Published program chart. Confirm rates and timing with Humuson technical support.
                </p>
              </div>
              <Link
                href={`/projects/${program.slug}`}
                className="text-sm font-medium text-leaf-700 hover:underline"
              >
                View details →
              </Link>
            </div>
            <div className="bg-white p-4">
              <MediaImage
                image={program.image}
                alt={`Humuson application program chart for ${crop.name}`}
                sizes="(max-width: 1024px) 92vw, 960px"
                className="mx-auto h-auto w-full max-w-4xl rounded-lg"
              />
            </div>
          </Reveal>
        </section>
      )}

      {/* All products for this crop */}
      {crop.products.length > 0 && (
        <section className="border-t border-line bg-paper-dim/60 py-16">
          <div className="container-site">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-display-3 text-ink">Products listed for {crop.name}</h2>
              <Link
                href={`/products?crop=${crop.slug}`}
                className="mb-1 text-sm font-medium text-leaf-700 hover:underline"
              >
                Open in product filter →
              </Link>
            </Reveal>
            <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" stagger={0.05}>
              {crop.products.slice(0, 8).map((product) => (
                <RevealItem key={product.id}>
                  <ProductCard product={product} className="h-full" />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}

      {/* Knowledge row */}
      {(crop.faqs.length > 0 || crop.articles.length > 0 || crop.videos.length > 0) && (
        <section className="container-site grid gap-12 py-16 lg:grid-cols-2">
          {crop.faqs.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-ink">
                <MessageCircleQuestion className="size-5 text-leaf-700" /> {displayName} questions
              </h2>
              <Accordion type="single" collapsible className="mt-3">
                {crop.faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} trigger={faq.question}>
                    <div
                      className="rich-text text-sm"
                      dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                    />
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}
          <div className="space-y-8">
            {crop.videos.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-ink">
                  <PlayCircle className="size-5 text-leaf-700" /> Watch
                </h2>
                <div className="mt-4">
                  <VideoEmbed youtubeId={crop.videos[0]!.youtubeId} title={crop.videos[0]!.title} />
                </div>
              </div>
            )}
            {crop.articles.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-ink">
                  <Newspaper className="size-5 text-leaf-700" /> Read
                </h2>
                <ul className="mt-4 space-y-2.5">
                  {crop.articles.map((article) => (
                    <li key={article.slug}>
                      <Link
                        href={`/knowledge/${article.slug}`}
                        className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream px-5 py-3.5 transition-colors hover:border-leaf-600/60"
                      >
                        <span className="text-sm font-medium text-ink group-hover:text-brand">
                          {article.title}
                        </span>
                        <ArrowRight className="size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
