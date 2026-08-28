/**
 * Content contract: the shape of content/*.json produced by the old-site
 * audit (docs/audit/AUDIT.md documents provenance). The importer
 * (scripts/migration/import.ts) is the only consumer.
 */

export interface SourceImage {
  sourceUrl: string;
  localPath: string; // e.g. "images/products/in5/1.jpg" (under /public)
  alt?: string | null;
}

export interface SourceProduct {
  name: string;
  slug: string;
  oldUrls: string[];
  categorySlugs: string[];
  shortDescription: string | null;
  descriptionHtml: string | null;
  composition: string[];
  packSizes: { size: string; priceUsd: number | null }[];
  applicationRates: { context: string | null; rate: string; notes: string | null }[];
  applicationMethods: string[];
  suitableCrops: string[];
  benefits: string[];
  priceUsd: number | null;
  images: SourceImage[];
  featured?: boolean;
  notes?: string | null;
  sourceUrl: string;
}

export interface SourceCategory {
  name: string;
  slug: string;
  description: string | null;
  count?: number;
}

export interface SourceCrop {
  name: string;
  slug: string;
  aka?: string[];
}

export interface SourceFaq {
  question: string;
  answer: string;
  productSlugs?: string[];
  category?: string;
  aliases?: string[];
  keywords?: string[];
  cropSlugs?: string[];
}

export interface SourceArticle {
  title: string;
  slug: string;
  oldUrl: string;
  excerpt: string | null;
  bodyHtml: string;
  coverImage: SourceImage | null;
  publishedAt: string;
  category?: string;
  relatedProductSlugs?: string[];
}

export interface SourceVideo {
  youtubeUrl: string;
  youtubeId: string;
  title: string | null;
  description?: string | null;
  category?: string;
  sourceUrl?: string;
}

export interface SourceProject {
  title: string;
  slug: string;
  crop?: string | null;
  location?: string | null;
  summary?: string | null;
  bodyHtml?: string | null;
  productSlugs?: string[];
  images?: SourceImage[];
  outcome?: string | null;
  sourceUrl?: string;
}

export interface SourceTestimonial {
  name: string;
  role?: string | null;
  location?: string | null;
  quote: string;
  sourceUrl?: string;
}

export interface SourceCompany {
  name?: string;
  taglines?: string[];
  about?: string;
  whatsappNumbers?: string[];
  phones?: string[];
  emails?: string[];
  address?: string | null;
  socials?: Record<string, string | null>;
  hours?: string | null;
  services?: (string | { title: string; description?: string })[];
  whyChooseUs?: string[];
  workingProcess?: (string | { title: string; description?: string })[];
  values?: { name: string; text: string }[];
}

export interface OldUrlMapEntry {
  oldUrl: string;
  pageType?: string;
  newPath: string;
  redirect?: boolean;
  notes?: string;
}
