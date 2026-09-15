import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { getAllProducts } from "@/server/data/products";
import { getAllCrops } from "@/server/data/crops";
import { getAllArticles, getAllProjects } from "@/server/data/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, crops, articles, projects] = await Promise.all([
    getAllProducts().catch(() => []),
    getAllCrops().catch(() => []),
    getAllArticles().catch(() => []),
    getAllProjects().catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), priority: 1, changeFrequency: "weekly" },
    { url: absoluteUrl("/products"), priority: 0.9, changeFrequency: "weekly" },
    { url: absoluteUrl("/product-finder"), priority: 0.8 },
    { url: absoluteUrl("/crops"), priority: 0.8 },
    { url: absoluteUrl("/catalogue"), priority: 0.8 },
    { url: absoluteUrl("/catalogue/flipbook"), priority: 0.6 },
    { url: absoluteUrl("/knowledge"), priority: 0.7, changeFrequency: "weekly" },
    { url: absoluteUrl("/videos"), priority: 0.6 },
    { url: absoluteUrl("/projects"), priority: 0.6 },
    { url: absoluteUrl("/solutions"), priority: 0.6 },
    { url: absoluteUrl("/about"), priority: 0.6 },
    { url: absoluteUrl("/contact"), priority: 0.7 },
    { url: absoluteUrl("/faq"), priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    ...products.map((product) => ({
      url: absoluteUrl(`/products/${product.slug}`),
      priority: 0.8,
      changeFrequency: "monthly" as const,
    })),
    ...crops
      .filter((crop) => crop.productCount > 0)
      .map((crop) => ({
        url: absoluteUrl(`/crops/${crop.slug}`),
        priority: 0.7,
        changeFrequency: "monthly" as const,
      })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/knowledge/${article.slug}`),
      priority: 0.6,
      ...(article.publishedAt ? { lastModified: new Date(article.publishedAt) } : {}),
    })),
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      priority: 0.5,
    })),
  ];
}
