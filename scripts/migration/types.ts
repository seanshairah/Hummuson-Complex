/**
 * Content contract: the shape of content/*.json produced by the old-site
 * audit (docs/audit/AUDIT.md documents provenance). The importer
 * (scripts/migration/import.ts) is the only consumer.
 */

export interface SourceImage {
  sourceUrl: string;
  localPath: string; // e.g. "images/products/in5/1.jpg" (under /public)
  alt?: string | null;
  /**
   * "primary"   → product hero/card image
   * "catalogue" → the plate used on this product's catalogue/flipbook page
   * "gallery"/unset → ordinary gallery image
   */
  role?: "primary" | "catalogue" | "gallery" | (string & {}) | null;
}

export interface SourceProduct {
  name: string;
  slug: string;
  /** Supplier brand the product is sold under, where the owner has stated it. */
  brand?: string | null;
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
  /**
   * Growth stages the owner has stated for this product, for the cases its own
   * published text cannot evidence.
   *
   * The importer otherwise derives stages from the product's own words, which
   * is the right default — but it leaves no way to record something the owner
   * knows and the label does not say. The alternative was to plant a phrase in
   * the description so the matcher would find it, which would put words in a
   * manufacturer's mouth. These are unioned with the derived stages, and the
   * product's `notes` should say who stated them and when.
   */
  growthStageKeys?: string[];
  featured?: boolean;
  notes?: string | null;
  sourceUrl: string;
}

export interface SourceCategory {
  name: string;
  slug: string;
  description: string | null;
  count?: number;
  /** Why this range exists or changed — provenance, not shown on the site. */
  note?: string;
}

export interface SourceCrop {
  name: string;
  slug: string;
  aka?: string[];
  /**
   * The group this crop sits under ("cabbage" → "brassicas"). One level only,
   * and the parent must appear in this same list. Omit for a top-level crop.
   */
  parentSlug?: string;
  /** Botanical family of a group ("Brassicaceae"). Groups only. */
  familyName?: string;
  /** How the family is recognised in the field. */
  signature?: string;
  /** Agronomy notes for the family — root depth, feeding, pests. One per line. */
  notes?: string[];
  /**
   * Crops of this family that no product's own guidance names yet, listed as
   * text on the family page. They deliberately do not become crop records: a
   * crop page with nothing to show is a dead end, and inventing a product-crop
   * claim to fill it would be worse.
   */
  alsoIncludes?: string[];
}

/** A shop that sells Humuson product. See the Distributor model. */
export interface SourceDistributor {
  name: string;
  slug: string;
  town: string;
  address?: string;
  phones?: string[];
  notes?: string;
  /** Decimal degrees, once read off the map. Both or neither. */
  mapsLat?: number;
  mapsLng?: number;
  mapsUrl?: string;
  /** Where the row came from and how far to trust it. Admin-only. */
  sourceNote?: string;
  /** Defaults to PUBLISHED. DRAFT holds a row back from the public page. */
  status?: "PUBLISHED" | "DRAFT";
  /**
   * YYYY-MM-DD, set when the address has been confirmed against a primary
   * source. Omitting it leaves whatever the admin recorded alone.
   */
  verifiedOn?: string;
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
  featured?: boolean;
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
  /** WhatsApp Business catalogue share link (wa.me/c/…). */
  whatsappCatalogueUrl?: string;
  phones?: string[];
  emails?: string[];
  address?: string | null;
  /**
   * The map pin in decimal degrees, read off Google Maps. An address is a
   * string Google has to interpret; these are the gate.
   */
  mapsLat?: number | null;
  mapsLng?: number | null;
  /** Optional Google Maps share link (maps.app.goo.gl/…) for "open" actions. */
  mapsUrl?: string | null;
  socials?: Record<string, string | null>;
  hours?: string | null;
  services?: (string | { title: string; description?: string })[];
  whyChooseUs?: string[];
  workingProcess?: (string | { title: string; description?: string })[];
  values?: { name: string; text: string }[];
  partnerBrands?: { name: string; note?: string }[];
}

export interface OldUrlMapEntry {
  oldUrl: string;
  pageType?: string;
  newPath: string;
  redirect?: boolean;
  notes?: string;
}

/**
 * A product taken off the catalogue (content/delisted-products.json).
 *
 * This is the record that makes a delisting actually happen: the importer only
 * upserts, so a product dropped from products.json would otherwise stay live in
 * the database forever. Listing it here is the owner saying "remove this",
 * which is a different statement from "this file happens not to mention it".
 */
export interface DelistedProduct {
  slug: string;
  name: string;
  brand?: string | null;
  delistedOn: string;
  reason?: string;
  /** Where the product's own URL should now send people. Defaults to /products. */
  redirectTo?: string;
}
