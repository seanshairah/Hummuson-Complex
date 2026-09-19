import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import type { ImageData } from "./products";

// ─── FAQs ────────────────────────────────────────────────────────────────────

export interface FaqData {
  id: string;
  question: string;
  answerHtml: string;
  category: string;
  aliases: string[];
  keywords: string[];
  productSlug: string | null;
  productName: string | null;
  cropSlugs: string[];
}

export const getAllFaqs = unstable_cache(
  async (): Promise<FaqData[]> => {
    const faqs = await db.faq.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
      include: { product: { select: { slug: true, name: true } }, crops: { include: { crop: true } } },
    });
    return faqs.map((faq) => ({
      id: faq.id,
      question: faq.question,
      answerHtml: faq.answerHtml,
      category: faq.category,
      aliases: faq.aliases,
      keywords: faq.keywords,
      productSlug: faq.product?.slug ?? null,
      productName: faq.product?.name ?? null,
      cropSlugs: faq.crops.map((c) => c.crop.slug),
    }));
  },
  ["all-faqs"],
  { tags: ["faqs"], revalidate: 600 },
);

// ─── Articles ────────────────────────────────────────────────────────────────

export interface ArticleCardData {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover: ImageData | null;
  category: { name: string; slug: string } | null;
  publishedAt: string | null;
  readingMinutes: number | null;
  featured: boolean;
}

const toImage = (media: {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
} | null): ImageData | null =>
  media
    ? {
        url: media.url,
        alt: media.alt,
        width: media.width,
        height: media.height,
        blurDataUrl: media.blurDataUrl,
      }
    : null;

export const getAllArticles = unstable_cache(
  async (): Promise<ArticleCardData[]> => {
    const articles = await db.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { coverImage: true, category: true },
    });
    return articles.map((article) => ({
      id: article.id,
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      cover: toImage(article.coverImage),
      category: article.category ? { name: article.category.name, slug: article.category.slug } : null,
      publishedAt: article.publishedAt?.toISOString() ?? null,
      readingMinutes: article.readingMinutes,
      featured: article.featured,
    }));
  },
  ["all-articles"],
  { tags: ["articles"], revalidate: 600 },
);

export interface ArticleDetailData extends ArticleCardData {
  bodyHtml: string;
  products: { slug: string; name: string; shortDescription: string | null }[];
  crops: { slug: string; name: string }[];
  seoTitle: string | null;
  seoDescription: string | null;
}

export const getArticleBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<ArticleDetailData | null> => {
      const article = await db.article.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
          coverImage: true,
          category: true,
          products: { select: { slug: true, name: true, shortDescription: true } },
          crops: { select: { slug: true, name: true } },
        },
      });
      if (!article) return null;
      return {
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        bodyHtml: article.bodyHtml,
        cover: toImage(article.coverImage),
        category: article.category
          ? { name: article.category.name, slug: article.category.slug }
          : null,
        publishedAt: article.publishedAt?.toISOString() ?? null,
        readingMinutes: article.readingMinutes,
        featured: article.featured,
        products: article.products,
        crops: article.crops,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
      };
    },
    [`article-${slug}`],
    { tags: ["articles"], revalidate: 600 },
  )();

// ─── Videos ──────────────────────────────────────────────────────────────────

export interface VideoData {
  id: string;
  youtubeId: string;
  title: string;
  description: string | null;
  category: string;
  featured: boolean;
  productSlugs: string[];
}

export const getAllVideos = unstable_cache(
  async (): Promise<VideoData[]> => {
    const videos = await db.video.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: { products: { select: { slug: true } } },
    });
    return videos.map((video) => ({
      id: video.id,
      youtubeId: video.youtubeId,
      title: video.title,
      description: video.description,
      category: video.category,
      featured: video.featured,
      productSlugs: video.products.map((p) => p.slug),
    }));
  },
  ["all-videos"],
  { tags: ["videos"], revalidate: 600 },
);

// ─── Projects / results ──────────────────────────────────────────────────────

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  location: string | null;
  cropName: string | null;
  outcome: string | null;
  image: ImageData | null;
  productNames: string[];
}

export interface ProjectDetailData extends ProjectCardData {
  problem: string | null;
  application: string | null;
  bodyHtml: string | null;
  images: (ImageData & { caption: string | null; phase: string | null })[];
  products: { slug: string; name: string; shortDescription: string | null }[];
  testimonial: { name: string; role: string | null; quote: string } | null;
}

export const getAllProjects = unstable_cache(
  async (): Promise<ProjectCardData[]> => {
    const projects = await db.project.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      include: {
        crop: true,
        images: { include: { media: true }, orderBy: { order: "asc" }, take: 1 },
        products: { select: { name: true } },
      },
    });
    return projects.map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      summary: project.summary,
      location: project.location,
      cropName: project.crop?.name ?? null,
      outcome: project.outcome,
      image: toImage(project.images[0]?.media ?? null),
      productNames: project.products.map((p) => p.name),
    }));
  },
  ["all-projects"],
  { tags: ["projects"], revalidate: 600 },
);

export const getProjectBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<ProjectDetailData | null> => {
      const project = await db.project.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
          crop: true,
          images: { include: { media: true }, orderBy: { order: "asc" } },
          products: { select: { slug: true, name: true, shortDescription: true } },
          testimonial: true,
        },
      });
      if (!project) return null;
      return {
        id: project.id,
        slug: project.slug,
        title: project.title,
        summary: project.summary,
        location: project.location,
        cropName: project.crop?.name ?? null,
        outcome: project.outcome,
        problem: project.problem,
        application: project.application,
        bodyHtml: project.bodyHtml,
        image: toImage(project.images[0]?.media ?? null),
        images: project.images.map((image) => ({
          ...toImage(image.media)!,
          caption: image.caption,
          phase: image.phase,
        })),
        products: project.products,
        productNames: project.products.map((p) => p.name),
        testimonial: project.testimonial
          ? {
              name: project.testimonial.name,
              role: project.testimonial.role,
              quote: project.testimonial.quote,
            }
          : null,
      };
    },
    [`project-${slug}`],
    { tags: ["projects"], revalidate: 600 },
  )();

// ─── Testimonials ────────────────────────────────────────────────────────────

export interface TestimonialData {
  id: string;
  name: string;
  role: string | null;
  location: string | null;
  quote: string;
}

export const getAllTestimonials = unstable_cache(
  async (): Promise<TestimonialData[]> => {
    const testimonials = await db.testimonial.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { order: "asc" },
    });
    return testimonials.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      location: t.location,
      quote: t.quote,
    }));
  },
  ["all-testimonials"],
  { tags: ["testimonials"], revalidate: 600 },
);
