import { unstable_cache } from "next/cache";
import { buildIndex, search, type SearchDoc, type SearchOptions, type SearchResult } from "@/lib/search/engine";
import { truncate, humanize } from "@/lib/utils";
import { stripHtml } from "@/lib/sanitize";
import { getAllProducts } from "./products";
import { getAllCrops } from "./crops";
import { getAllArticles, getAllFaqs, getAllProjects, getAllVideos } from "./content";

/**
 * Assembles the global search corpus from every published content type.
 * Cached under all content tags — any admin mutation rebuilds it.
 */
export const getSearchDocs = unstable_cache(
  async (): Promise<SearchDoc[]> => {
    const [products, crops, faqs, articles, videos, projects] = await Promise.all([
      getAllProducts(),
      getAllCrops(),
      getAllFaqs(),
      getAllArticles(),
      getAllVideos(),
      getAllProjects(),
    ]);

    const docs: SearchDoc[] = [];

    for (const product of products) {
      docs.push({
        id: `product:${product.id}`,
        type: "product",
        title: product.name,
        keywords: [
          product.category?.name ?? "",
          ...product.benefitNames,
          ...product.methods.map(humanize),
        ].filter(Boolean),
        body: [product.shortDescription ?? "", product.cropNames.join(" "), product.packSizes.join(" ")].join(" \n "),
        href: `/products/${product.slug}`,
        boost: product.featured ? 1.5 : 0.75,
        meta: { subtitle: product.category?.name ?? "Product" },
      });
    }

    for (const crop of crops) {
      docs.push({
        id: `crop:${crop.id}`,
        type: "crop",
        title: crop.name,
        body: crop.description ?? "",
        href: `/crops/${crop.slug}`,
        boost: 0.5,
        meta: {
          subtitle: crop.productCount > 0 ? `${crop.productCount} matching products` : "Crop guidance",
        },
      });
    }

    for (const faq of faqs) {
      docs.push({
        id: `faq:${faq.id}`,
        type: "faq",
        title: faq.question,
        aliases: faq.aliases,
        keywords: [...faq.keywords, faq.productName ?? ""].filter(Boolean),
        body: stripHtml(faq.answerHtml),
        href: faq.productSlug ? `/products/${faq.productSlug}#faq` : `/faq#faq-${faq.id}`,
        meta: { subtitle: truncate(stripHtml(faq.answerHtml), 80) },
      });
    }

    for (const article of articles) {
      docs.push({
        id: `article:${article.id}`,
        type: "article",
        title: article.title,
        keywords: article.category ? [article.category.name] : [],
        body: article.excerpt ?? "",
        href: `/knowledge/${article.slug}`,
        meta: { subtitle: article.category?.name ?? "Article" },
      });
    }

    for (const video of videos) {
      docs.push({
        id: `video:${video.id}`,
        type: "video",
        title: video.title,
        body: video.description ?? "",
        href: `/videos#${video.youtubeId}`,
        meta: { subtitle: humanize(video.category) },
      });
    }

    for (const project of projects) {
      docs.push({
        id: `project:${project.id}`,
        type: "project",
        title: project.title,
        keywords: [project.cropName ?? "", ...project.productNames].filter(Boolean),
        body: [project.summary ?? "", project.outcome ?? ""].join(" "),
        href: `/projects/${project.slug}`,
        meta: { subtitle: project.location ?? "Field result" },
      });
    }

    return docs;
  },
  ["search-docs"],
  {
    tags: ["products", "crops", "faqs", "articles", "videos", "projects"],
    revalidate: 600,
  },
);

export async function searchAll(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  const docs = await getSearchDocs();
  const index = buildIndex(docs);
  return search(index, query, options);
}
