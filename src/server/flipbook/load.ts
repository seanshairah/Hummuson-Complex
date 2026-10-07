import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { getPublishedCatalogue, type CatalogueData } from "@/server/data/catalogue";
import { getAllProducts } from "@/server/data/products";
import { getContactSettings } from "@/server/data/settings";
import { site } from "@/lib/site";
import { generateDesign } from "@/lib/flipbook/generate";
import type { FlipbookDesign } from "@/lib/flipbook/model";
import { parseDesign } from "@/lib/flipbook/schema";
import type { FlipbookContext, FlipbookImage, FlipbookProduct } from "@/lib/flipbook/resolve";

/**
 * Everything a flipbook is drawn from: the design (published, draft, or laid
 * out from the chapters when there is none) and the live data its tokens
 * read — products, their catalogue plates, the contact details.
 */

/**
 * Bumped when a renderer changes what it draws, so cached downloads from the
 * old code are not served under the new one.
 */
const RENDER_VERSION = 1;

export interface LoadedFlipbook {
  catalogueId: string;
  title: string;
  slug: string;
  design: FlipbookDesign;
  /** Which design this is. */
  source: "published" | "draft" | "generated";
  /** Published design version (0 before the first publish). */
  version: number;
  /** Whether readers see a published design (rather than the automatic layout). */
  hasPublished: boolean;
  context: FlipbookContext;
  /**
   * Fingerprint of the design and the data it reads. Download addresses carry
   * it, so a cached file always matches what the flipbook shows.
   */
  hash: string;
}

/** "+263 77 665 6433" from the stored digits. */
export function formatWhatsapp(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("263") && d.length === 12) {
    return `+263 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  }
  return `+${d}`;
}

const toImage = (
  image: { url: string; alt: string | null; width: number | null; height: number | null; blurDataUrl: string | null } | null,
): FlipbookImage | null =>
  image
    ? {
        url: image.url,
        alt: image.alt,
        width: image.width,
        height: image.height,
        blurDataUrl: image.blurDataUrl,
      }
    : null;

export async function buildContext(catalogue: CatalogueData | null): Promise<FlipbookContext> {
  const [products, contact] = await Promise.all([getAllProducts(), getContactSettings()]);

  // A product's catalogue plate is the picture its chapter entry carries.
  const plates = new Map<string, FlipbookImage>();
  for (const section of catalogue?.sections ?? []) {
    for (const entry of section.entries) {
      if (entry.product && entry.image && !plates.has(entry.product.id)) {
        plates.set(entry.product.id, toImage(entry.image)!);
      }
    }
  }

  const byId: Record<string, FlipbookProduct> = {};
  for (const product of products) {
    byId[product.id] = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      tagline: product.tagline,
      description: product.shortDescription,
      crops: product.cropNames,
      packs: product.packSizes,
      priceUsd: product.priceUsd,
      pricedPackCount: product.pricedPackCount,
      ranges: product.categories.map((category) => category.name),
      image: toImage(product.image),
      plate: plates.get(product.id) ?? null,
    };
  }

  return {
    title: catalogue?.title ?? "Humuson Product Guide",
    year: catalogue?.year ?? null,
    intro: catalogue?.intro ?? null,
    siteUrl: site.url,
    whatsapp: formatWhatsapp(contact.whatsapp || site.whatsappNumber),
    phone: contact.phones[0] ?? "",
    email: contact.emails[0] ?? "",
    products: byId,
  };
}

/** The flipbook laid out from the chapters, as it was before designs. */
export function designFromChapters(catalogue: CatalogueData): FlipbookDesign {
  return generateDesign({
    year: catalogue.year,
    sections: catalogue.sections.map((section) => {
      const entries = section.entries.filter((entry) => entry.product);
      return {
        title: section.title,
        slug: section.slug,
        intro: section.intro,
        theme: section.theme,
        image: section.image ?? entries[0]?.image ?? entries[0]?.product?.image ?? null,
        products: entries.map((entry) => ({
          id: entry.product!.id,
          slug: entry.product!.slug,
          name: entry.product!.name,
        })),
      };
    }),
  });
}

function fingerprint(design: FlipbookDesign, context: FlipbookContext): string {
  return createHash("sha256")
    .update(JSON.stringify({ r: RENDER_VERSION, design, context }))
    .digest("hex")
    .slice(0, 16);
}

const getPublishedDesignRow = unstable_cache(
  async () =>
    db.catalogue.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, design: true, designVersion: true },
    }),
  ["published-flipbook-design"],
  { tags: ["catalogue"], revalidate: 600 },
);

/** What readers get: the published design, or the chapters laid out. */
export async function loadPublishedFlipbook(): Promise<LoadedFlipbook | null> {
  const catalogue = await getPublishedCatalogue();
  if (!catalogue) return null;
  const [row, context] = await Promise.all([getPublishedDesignRow(), buildContext(catalogue)]);
  const published = row?.id === catalogue.id ? parseDesign(row.design) : null;
  const design = published ?? designFromChapters(catalogue);
  return {
    catalogueId: catalogue.id,
    title: catalogue.title,
    slug: catalogue.slug,
    design,
    source: published ? "published" : "generated",
    version: row?.designVersion ?? 0,
    hasPublished: Boolean(published),
    context,
    hash: fingerprint(design, context),
  };
}

/**
 * What the designer is working on: the draft, else the published design,
 * else the chapters laid out. Read fresh — never from the public cache.
 */
export async function loadDraftFlipbook(): Promise<LoadedFlipbook | null> {
  const row = await db.catalogue.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, design: true, draftDesign: true, designVersion: true },
  });
  if (!row) return null;
  const catalogue = await getPublishedCatalogue();
  const context = await buildContext(catalogue);
  const draft = parseDesign(row.draftDesign);
  const published = parseDesign(row.design);
  const design = draft ?? published ?? (catalogue ? designFromChapters(catalogue) : null);
  if (!design) return null;
  return {
    catalogueId: row.id,
    title: context.title,
    slug: row.slug,
    design,
    source: draft ? "draft" : published ? "published" : "generated",
    version: row.designVersion,
    hasPublished: Boolean(published),
    context,
    hash: fingerprint(design, context),
  };
}
