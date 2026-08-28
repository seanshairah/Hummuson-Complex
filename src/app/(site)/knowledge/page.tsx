import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { MediaImage } from "@/components/shared/media-image";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getAllArticles } from "@/server/data/content";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Knowledge centre — agronomy articles & guides",
  description:
    "Agronomy advice, product education and soil-health guidance from Humuson Complex: fulvic acid, seedling nurseries, feeding the soil and more.",
  alternates: { canonical: "/knowledge" },
};

export default async function KnowledgePage() {
  const articles = await getAllArticles();
  const [featured, ...rest] = articles;

  return (
    <>
      <PageIntro
        eyebrow="Knowledge centre"
        title="Learn the agronomy behind"
        titleAccent="healthy soil"
        lede="Practical guidance from the Humuson team — soil biology, application know-how and crop advice you can act on this season."
        crumbs={[{ label: "Knowledge" }]}
      />
      <section className="container-site pb-20">
        {articles.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Articles are on the way"
            description="In the meantime, our advisers are happy to answer questions directly."
            action={<ButtonLink href="/contact">Ask a question</ButtonLink>}
          />
        ) : (
          <>
            {featured && (
              <Link
                href={`/knowledge/${featured.slug}`}
                className="group grid overflow-hidden rounded-3xl border border-line bg-cream shadow-card transition-all duration-300 hover:shadow-pop lg:grid-cols-2"
              >
                {featured.cover && (
                  <div className="relative aspect-[16/10] overflow-hidden bg-paper-dim lg:aspect-auto lg:min-h-80">
                    <MediaImage
                      image={featured.cover}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 1024px) 92vw, 620px"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="flex flex-col justify-center p-7 md:p-10">
                  <div className="flex flex-wrap items-center gap-2">
                    {featured.category && <Badge variant="leaf">{featured.category.name}</Badge>}
                    {featured.readingMinutes && (
                      <span className="text-xs text-ink-faint">{featured.readingMinutes} min read</span>
                    )}
                  </div>
                  <h2 className="text-display-3 mt-4 text-ink group-hover:text-brand">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="mt-3 line-clamp-3 leading-relaxed text-ink-soft">{featured.excerpt}</p>
                  )}
                  <p className="mt-6 flex items-center gap-2 text-sm font-medium text-leaf-700">
                    Read article
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </p>
                </div>
              </Link>
            )}

            <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
              {rest.map((article) => (
                <RevealItem key={article.id}>
                  <Link
                    href={`/knowledge/${article.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
                  >
                    {article.cover && (
                      <div className="relative aspect-[16/9] overflow-hidden bg-paper-dim">
                        <MediaImage
                          image={article.cover}
                          alt=""
                          fill
                          sizes="(max-width: 768px) 92vw, 400px"
                          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-5">
                      <div className="flex items-center gap-2 text-[0.65rem] font-medium tracking-widest text-leaf-700 uppercase">
                        {article.category?.name ?? "Article"}
                        {article.readingMinutes && (
                          <span className="text-ink-faint normal-case">· {article.readingMinutes} min</span>
                        )}
                      </div>
                      <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-ink group-hover:text-brand">
                        {article.title}
                      </h3>
                      {article.excerpt && (
                        <p className="mt-2 line-clamp-2 text-sm text-ink-faint">{article.excerpt}</p>
                      )}
                      <p className="mt-auto pt-4 text-xs text-ink-faint">{formatDate(article.publishedAt)}</p>
                    </div>
                  </Link>
                </RevealItem>
              ))}
            </RevealGroup>
          </>
        )}
      </section>
    </>
  );
}
