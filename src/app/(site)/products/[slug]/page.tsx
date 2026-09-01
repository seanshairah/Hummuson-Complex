import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  Info,
  Leaf,
  ListChecks,
  MessageCircleQuestion,
  Sprout,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProductCard } from "@/components/shared/product-card";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { VideoEmbed } from "@/components/shared/video-embed";
import { Reveal } from "@/components/motion/reveal";
import { ProductGallery } from "@/components/products/gallery";
import { StickyProductActions } from "@/components/products/sticky-actions";
import { ViewTracker } from "@/components/products/view-tracker";
import { AskHumusonLauncher } from "@/components/ask/launcher";
import { getProductBySlug, getProductSlugs } from "@/server/data/products";
import { getContactSettings } from "@/server/data/settings";
import { faqJsonLd, productJsonLd } from "@/lib/seo";
import { humanize } from "@/lib/utils";
import { whatsappProductMessage } from "@/lib/whatsapp";
import { JsonLd } from "@/components/shared/json-ld";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? `${product.name} — ${product.category?.name ?? "Humuson product"}`,
    description:
      product.seoDescription ??
      product.shortDescription ??
      `${product.name} from Humuson Complex — composition, application guidance and crop suitability.`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: product.image ? { images: [{ url: product.image.url }] } : undefined,
  };
}

const CONFIRM_NOTE =
  "Please confirm the recommended application for your crop and conditions with Humuson technical support — basic consultation is free.";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, contact] = await Promise.all([getProductBySlug(slug), getContactSettings()]);
  if (!product) notFound();

  const gallery =
    product.gallery.length > 0 ? product.gallery : product.image ? [product.image] : [];
  const sections = [
    { id: "overview", label: "Overview", show: Boolean(product.descriptionHtml) },
    { id: "composition", label: "Composition", show: product.composition.length > 0 },
    { id: "application", label: "How to apply", show: true },
    { id: "crops", label: "Crops", show: product.cropNames.length > 0 },
    { id: "faq", label: "FAQ", show: product.faqs.length > 0 },
    { id: "related", label: "Related", show: product.related.length > 0 },
  ].filter((section) => section.show);

  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      {product.faqs.length > 0 && (
        <JsonLd data={faqJsonLd(product.faqs)} />
      )}
      <ViewTracker type="PRODUCT_VIEW" entityType="product" entityId={product.id} />

      {/* Hero */}
      <section className="bg-paper pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="container-site">
          <Breadcrumbs
            crumbs={[{ label: "Products", href: "/products" }, { label: product.name }]}
            className="mb-8"
          />
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16">
            <Reveal y={20}>
              <ProductGallery images={gallery} name={product.name} />
            </Reveal>

            <Reveal y={20} delay={0.08}>
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <Link href={`/products?category=${product.category.slug}`}>
                    <Badge variant="leaf">{product.category.name}</Badge>
                  </Link>
                )}
                {product.methods.map((method) => (
                  <Badge key={method} variant="outline">
                    {humanize(method)}
                  </Badge>
                ))}
              </div>

              <h1 className="mt-4 text-display-2 text-ink">{product.name}</h1>
              {product.shortDescription && (
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-soft">
                  {product.shortDescription}
                </p>
              )}

              {/* Verified quick facts */}
              <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                {product.packageSizes.length > 0 && (
                  <div>
                    <dt className="text-eyebrow text-[0.62rem] text-ink-faint">Package sizes</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-2">
                      {product.packageSizes.map((pack) => (
                        <span
                          key={pack.size}
                          className="rounded-lg border border-line bg-cream px-3 py-1.5 font-display text-sm font-medium text-ink"
                        >
                          {pack.size}
                          {pack.priceUsd !== null && (
                            <span className="ml-1.5 text-leaf-700">${pack.priceUsd}</span>
                          )}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                {product.priceUsd !== null &&
                  product.packageSizes.every((p) => p.priceUsd === null) && (
                    <div>
                      <dt className="text-eyebrow text-[0.62rem] text-ink-faint">Price</dt>
                      <dd className="mt-1.5 font-display text-2xl font-semibold text-ink">
                        ${product.priceUsd}
                      </dd>
                    </div>
                  )}
                {product.cropNames.length > 0 && (
                  <div>
                    <dt className="text-eyebrow text-[0.62rem] text-ink-faint">Listed for</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft capitalize">
                      {product.cropNames.join(", ")}
                    </dd>
                  </div>
                )}
                {product.guides.length > 0 && (
                  <div>
                    <dt className="text-eyebrow text-[0.62rem] text-ink-faint">Application rate</dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                      {product.guides[0]!.rate}
                      {product.guides[0]!.unit && ` ${product.guides[0]!.unit}`}
                      {product.guides.length > 1 && " · see full guidance below"}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <WhatsAppButton
                  message={whatsappProductMessage(product.name)}
                  label="Ask about this product"
                  size="lg"
                  entityType="product"
                  entityId={product.id}
                />
                <AskHumusonLauncher
                  tone="dark"
                  productSlug={product.slug}
                  productName={product.name}
                  label="Ask Humuson"
                />
                <Link
                  href={`/contact?product=${product.slug}`}
                  className="text-sm font-medium text-ink-faint underline-offset-4 hover:text-ink hover:underline"
                >
                  Request application advice
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* In-page nav */}
      <nav
        aria-label="Product sections"
        className="sticky top-16 z-30 border-y border-line bg-paper/85 backdrop-blur-md md:top-[4.5rem]"
      >
        <div className="container-site scrollbar-none flex gap-1 overflow-x-auto py-2">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 rounded-full px-4 py-1.5 font-display text-sm font-medium text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-site grid gap-14 py-14 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div className="min-w-0 space-y-16">
          {/* Overview */}
          {product.descriptionHtml && (
            <section id="overview" className="scroll-mt-32">
              <SectionTitle icon={Info} title="Overview" />
              <div
                className="rich-text mt-5"
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </section>
          )}

          {/* Benefits (verbatim claims) */}
          {product.benefitClaims.length > 0 && (
            <section id="benefits" className="scroll-mt-32">
              <SectionTitle icon={ListChecks} title="Benefits" />
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {product.benefitClaims.map((claim) => (
                  <li
                    key={claim}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-cream p-4 text-sm leading-relaxed text-ink-soft"
                  >
                    <Leaf className="mt-0.5 size-4 shrink-0 text-leaf-600" strokeWidth={2} />
                    {claim}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Composition */}
          {product.composition.length > 0 && (
            <section id="composition" className="scroll-mt-32">
              <SectionTitle icon={FlaskConical} title="Composition" />
              <p className="mt-2 text-sm text-ink-faint">As published by the producer.</p>
              <ul className="mt-5 overflow-hidden rounded-2xl border border-line">
                {product.composition.map((item, i) => (
                  <li
                    key={item}
                    className={`flex items-center gap-3 px-5 py-3 text-sm text-ink-soft ${i % 2 === 0 ? "bg-cream" : "bg-paper-dim/60"}`}
                  >
                    <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-leaf-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* How it works */}
          {product.operatingPrinciple && (
            <section id="how-it-works" className="scroll-mt-32">
              <SectionTitle icon={Sprout} title="How it works" />
              <p className="mt-5 leading-relaxed text-ink-soft">{product.operatingPrinciple}</p>
            </section>
          )}

          {/* Application */}
          <section id="application" className="scroll-mt-32">
            <SectionTitle icon={FileText} title="How to apply" />
            {product.methods.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.methods.map((method) => (
                  <Badge key={method} variant="soil">
                    {humanize(method)}
                  </Badge>
                ))}
              </div>
            )}
            {product.instructionsHtml && (
              <div
                className="rich-text mt-5"
                dangerouslySetInnerHTML={{ __html: product.instructionsHtml }}
              />
            )}
            {product.guides.length > 0 ? (
              <>
                <div className="mt-5">
                  <Table>
                    <THead>
                      <Tr>
                        <Th>Rate</Th>
                        <Th>Basis</Th>
                        <Th>Notes</Th>
                      </Tr>
                    </THead>
                    <TBody>
                      {product.guides.map((guide, i) => (
                        <Tr key={i}>
                          <Td className="font-display font-semibold whitespace-nowrap text-ink">
                            {guide.rate}
                          </Td>
                          <Td className="whitespace-nowrap">
                            {[
                              guide.unit,
                              guide.crop,
                              guide.stage,
                              guide.method ? humanize(guide.method) : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </Td>
                          <Td>{guide.notes ?? "—"}</Td>
                        </Tr>
                      ))}
                    </TBody>
                  </Table>
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {CONFIRM_NOTE}
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line bg-cream p-5">
                <p className="text-sm leading-relaxed text-ink-soft">{CONFIRM_NOTE}</p>
                <div className="mt-4">
                  <WhatsAppButton
                    message={`Hello Humuson Complex, what is the recommended application for ${product.name}?`}
                    label="Confirm on WhatsApp"
                    entityType="product"
                    entityId={product.id}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Crops */}
          {product.cropSlugs.length > 0 && (
            <section id="crops" className="scroll-mt-32">
              <SectionTitle icon={Leaf} title="Suitable crops" />
              <p className="mt-2 text-sm text-ink-faint">
                As listed in the product’s published guidance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2.5">
                {product.cropSlugs.map((cropSlug, i) => (
                  <Link
                    key={cropSlug}
                    href={`/crops/${cropSlug}`}
                    className="group flex items-center gap-2 rounded-full border border-line bg-cream px-4 py-2 text-sm font-medium text-ink capitalize transition-all hover:border-leaf-600 hover:bg-leaf-300/30"
                  >
                    {product.cropNames[i]}
                    <ArrowRight className="size-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-leaf-700" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Stage suitability */}
          {product.stageNames.length > 0 && (
            <section className="scroll-mt-32">
              <SectionTitle icon={Sprout} title="Growth stages" />
              <p className="mt-2 text-sm text-ink-faint">
                Stages referenced in the product’s own guidance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {product.stageNames.map((stage) => (
                  <Badge key={stage} variant="default" className="px-3.5 py-1.5 text-sm">
                    {stage}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {product.faqs.length > 0 && (
            <section id="faq" className="scroll-mt-32">
              <SectionTitle icon={MessageCircleQuestion} title={`${product.name} questions`} />
              <Accordion type="single" collapsible className="mt-4">
                {product.faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} trigger={faq.question}>
                    <div
                      className="rich-text text-sm"
                      dangerouslySetInnerHTML={{ __html: faq.answerHtml }}
                    />
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* Documents */}
          {product.documents.length > 0 && (
            <section className="scroll-mt-32">
              <SectionTitle icon={FileText} title="Technical documents" />
              <ul className="mt-5 space-y-2">
                {product.documents.map((doc) => (
                  <li key={doc.url}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-leaf-600"
                    >
                      <FileText className="size-4 text-leaf-700" /> {doc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          <div className="bg-grain rounded-3xl bg-humus-950 p-6 text-paper">
            <p className="text-eyebrow text-[0.62rem] text-leaf-400">Need certainty?</p>
            <p className="mt-2.5 font-display text-lg leading-snug font-semibold">
              Talk to a Humuson agronomist about {product.name}.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-paper/65">
              Free basic consultation — rates, timing, and whether it suits your crop.
            </p>
            <div className="mt-5 space-y-2.5">
              <WhatsAppButton
                message={whatsappProductMessage(product.name)}
                label="WhatsApp Humuson"
                className="w-full"
                entityType="product"
                entityId={product.id}
              />
              <Link
                href={`/contact?product=${product.slug}`}
                className="flex h-11 w-full items-center justify-center rounded-full border border-paper/25 font-display text-sm font-medium text-paper transition-colors hover:border-paper/60 hover:bg-paper/10"
              >
                Request advice
              </Link>
              <a
                href={contact.whatsappCatalogueUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 pt-1 text-sm font-medium text-leaf-300 transition-colors hover:text-leaf-200"
              >
                Browse the WhatsApp catalogue <ArrowRight className="size-3.5" />
              </a>
            </div>
          </div>

          {product.articles.length > 0 && (
            <div className="rounded-3xl border border-line bg-cream p-6">
              <p className="text-eyebrow text-[0.62rem] text-ink-faint">Related reading</p>
              <ul className="mt-3 space-y-3">
                {product.articles.map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/knowledge/${article.slug}`}
                      className="group block text-sm font-medium text-ink hover:text-brand"
                    >
                      {article.title}
                      <ArrowRight className="ml-1 inline size-3.5 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.videos.length > 0 && (
            <VideoEmbed youtubeId={product.videos[0]!.youtubeId} title={product.videos[0]!.title} />
          )}
        </aside>
      </div>

      {/* Related products */}
      {product.related.length > 0 && (
        <section id="related" className="scroll-mt-32 border-t border-line bg-paper-dim/60 py-14">
          <div className="container-site">
            <h2 className="text-display-3 text-ink">Related products</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {product.related.slice(0, 4).map((related) => (
                <ProductCard key={related.id} product={related} className="h-full" />
              ))}
            </div>
          </div>
        </section>
      )}

      <div className="h-20 lg:hidden" aria-hidden />
      <StickyProductActions
        productSlug={product.slug}
        productName={product.name}
        productId={product.id}
      />
    </>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Info; title: string }) {
  return (
    <h2 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-ink">
      <span className="flex size-9 items-center justify-center rounded-xl bg-leaf-300/40 text-leaf-800">
        <Icon className="size-4.5" strokeWidth={1.9} />
      </span>
      {title}
    </h2>
  );
}
