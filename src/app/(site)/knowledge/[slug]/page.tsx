import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { MediaImage } from "@/components/shared/media-image";
import { ReadingProgress } from "@/components/shared/reading-progress";
import { ViewTracker } from "@/components/products/view-tracker";
import { WhatsAppButton } from "@/components/shared/whatsapp-button";
import { getAllArticles, getArticleBySlug } from "@/server/data/content";
import { articleJsonLd } from "@/lib/seo";
import { formatDate } from "@/lib/utils";
import { whatsappAdviceMessage } from "@/lib/whatsapp";
import { JsonLd } from "@/components/shared/json-ld";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Article not found" };
  return {
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    alternates: { canonical: `/knowledge/${article.slug}` },
    openGraph: article.cover ? { images: [{ url: article.cover.url }] } : undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const others = (await getAllArticles()).filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <JsonLd data={articleJsonLd(article)} />
      <ReadingProgress />
      <ViewTracker type="ARTICLE_VIEW" entityType="article" entityId={article.id} />

      <article className="pt-28 pb-16 md:pt-36">
        <header className="container-site max-w-3xl">
          <Breadcrumbs
            crumbs={[{ label: "Knowledge", href: "/knowledge" }, { label: article.title }]}
            className="mb-6"
          />
          <div className="flex flex-wrap items-center gap-2.5">
            {article.category && <Badge variant="leaf">{article.category.name}</Badge>}
            <span className="text-xs text-ink-faint">
              {formatDate(article.publishedAt)}
              {article.readingMinutes && ` · ${article.readingMinutes} min read`}
            </span>
          </div>
          <h1 className="mt-5 text-display-2 text-balance text-ink">{article.title}</h1>
          {article.excerpt && (
            <p className="mt-5 text-editorial text-xl leading-relaxed text-ink-soft">
              {article.excerpt}
            </p>
          )}
        </header>

        {article.cover && (
          <div className="container-site mt-10 max-w-4xl">
            <div className="relative aspect-[16/8.5] overflow-hidden rounded-3xl shadow-card">
              <MediaImage
                image={article.cover}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 92vw, 900px"
                className="object-cover"
              />
            </div>
          </div>
        )}

        <div className="container-site mt-12 max-w-3xl">
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: article.bodyHtml }} />

          {(article.products.length > 0 || article.crops.length > 0) && (
            <aside className="mt-12 rounded-3xl border border-line bg-cream p-6">
              <p className="text-eyebrow text-[0.65rem] text-ink-faint">
                Mentioned in this article
              </p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {article.products.map((product) => (
                  <Link
                    key={product.slug}
                    href={`/products/${product.slug}`}
                    className="group flex items-center gap-2 rounded-full bg-humus-900 px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-humus-700"
                  >
                    {product.name}
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
                {article.crops.map((crop) => (
                  <Link
                    key={crop.slug}
                    href={`/crops/${crop.slug}`}
                    className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium text-ink capitalize transition-colors hover:border-leaf-600"
                  >
                    {crop.name}
                  </Link>
                ))}
              </div>
            </aside>
          )}

          <div className="bg-grain mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-humus-950 p-6 text-paper">
            <div>
              <p className="font-display text-lg font-semibold">Questions about your own field?</p>
              <p className="mt-1 text-sm text-paper/65">Basic consultation is free.</p>
            </div>
            <WhatsAppButton message={whatsappAdviceMessage(article.title)} label="Ask an adviser" />
          </div>
        </div>
      </article>

      {others.length > 0 && (
        <section className="border-t border-line bg-paper-dim/60 py-14">
          <div className="container-site">
            <h2 className="text-display-3 text-ink">Keep reading</h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.id}
                  href={`/knowledge/${other.slug}`}
                  className="group rounded-2xl border border-line bg-cream p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
                >
                  <p className="text-[0.65rem] font-medium tracking-widest text-leaf-700 uppercase">
                    {other.category?.name ?? "Article"}
                  </p>
                  <h3 className="mt-2 line-clamp-2 font-display text-base font-semibold text-ink group-hover:text-brand">
                    {other.title}
                  </h3>
                  <p className="mt-3 text-xs text-ink-faint">{formatDate(other.publishedAt)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
