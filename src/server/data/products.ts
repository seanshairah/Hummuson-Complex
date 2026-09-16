import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import type { FinderCandidate } from "@/lib/finder/scoring";

export interface ImageData {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  blurDataUrl: string | null;
}

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  /** Supplier brand, where the owner has stated one. */
  brand: string | null;
  tagline: string | null;
  shortDescription: string | null;
  /**
   * Every range this product belongs to, in range order. The first is what a
   * card shows when it has room for one badge; `/products?category=` matches
   * against all of them, so a product filed under two ranges is found under
   * either and still listed once.
   */
  categories: { name: string; slug: string }[];
  image: ImageData | null;
  priceUsd: number | null;
  /**
   * How many package sizes carry a published price. `priceUsd` is the cheapest
   * of them, so a count above one means it reads as a "from" price.
   */
  pricedPackCount: number;
  packSizes: string[];
  cropNames: string[];
  /** Exactly the crops this product's own published text names. */
  cropSlugs: string[];
  /**
   * The groups those crops sit under. Filtering by a group matches these, so a
   * product listed for cabbage is found under Brassicas; filtering by a crop
   * matches `cropSlugs` alone, so that same product is never presented as
   * suitable for broccoli.
   */
  cropGroupSlugs: string[];
  methods: string[];
  benefitSlugs: string[];
  benefitNames: string[];
  stageKeys: string[];
  featured: boolean;
  hasRates: boolean;
}

/** The distinct groups a product's crops belong to. */
function toCropGroups(links: { crop: { parent: { slug: string } | null } }[]): string[] {
  return [...new Set(links.flatMap((link) => (link.crop.parent ? [link.crop.parent.slug] : [])))];
}

/** Ranges in the owner's own order, so the first is the one a card shows. */
function toCategories(
  links: { category: { name: string; slug: string; order: number } }[],
): { name: string; slug: string }[] {
  return [...links]
    .sort((a, b) => a.category.order - b.category.order)
    .map((link) => ({ name: link.category.name, slug: link.category.slug }));
}

function toImage(
  media: {
    url: string;
    alt: string | null;
    width: number | null;
    height: number | null;
    blurDataUrl: string | null;
  } | null,
): ImageData | null {
  if (!media) return null;
  const { url, alt, width, height, blurDataUrl } = media;
  return { url, alt, width, height, blurDataUrl };
}

const productListInclude = {
  categories: { include: { category: true } },
  // The parent comes along so a card knows which groups it belongs to without
  // a second query per product.
  primaryImage: true,
  packageSizes: { orderBy: { order: "asc" as const } },
  crops: { include: { crop: { include: { parent: { select: { slug: true } } } } } },
  benefits: { include: { benefit: true }, orderBy: { order: "asc" as const } },
  growthStages: { include: { growthStage: true } },
  applicationGuides: true,
};

/** All published products, cached under the "products" tag. */
export const getAllProducts = unstable_cache(
  async (): Promise<ProductCardData[]> => {
    const products = await db.product.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: productListInclude,
    });
    return products.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      tagline: product.tagline,
      shortDescription: product.shortDescription,
      categories: toCategories(product.categories),
      image: toImage(product.primaryImage),
      priceUsd: product.priceUsd ? Number(product.priceUsd) : null,
      pricedPackCount: product.packageSizes.filter((p) => p.priceUsd !== null).length,
      packSizes: product.packageSizes.map((p) => p.size),
      cropNames: product.crops.map((c) => c.crop.name),
      cropSlugs: product.crops.map((c) => c.crop.slug),
      cropGroupSlugs: toCropGroups(product.crops),
      methods: product.applicationMethods,
      benefitSlugs: product.benefits.map((b) => b.benefit.slug),
      benefitNames: product.benefits.map((b) => b.benefit.name),
      stageKeys: product.growthStages.map((s) => s.growthStage.key),
      featured: product.featured,
      hasRates: product.applicationGuides.length > 0,
    }));
  },
  ["all-products"],
  { tags: ["products"], revalidate: 600 },
);

export interface ProductFilterParams {
  brand?: string;
  category?: string;
  crop?: string;
  benefit?: string;
  method?: string;
  stage?: string;
  slugs?: string[];
}

/**
 * Ranges that were renamed, pointed at what replaced them.
 *
 * `?category=` is a filter rather than a route, so a stale one fails silently:
 * the page renders the whole catalogue and looks like the link worked. These
 * two were live on the old shop and are in links and bookmarks, so they keep
 * resolving.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  value: "crop-nutrition",
  physio: "microbiological",
};

/** Pure filter over the cached product list. */
export function filterProducts(
  products: ProductCardData[],
  params: ProductFilterParams,
): ProductCardData[] {
  const category = params.category ? (CATEGORY_ALIASES[params.category] ?? params.category) : undefined;
  return products.filter((product) => {
    if (params.brand && product.brand !== params.brand) return false;
    if (category && !product.categories.some((c) => c.slug === category)) return false;
    // A group matches its own listings and its children's; a single crop
    // matches only its own.
    if (
      params.crop &&
      !product.cropSlugs.includes(params.crop) &&
      !product.cropGroupSlugs.includes(params.crop)
    )
      return false;
    if (params.benefit && !product.benefitSlugs.includes(params.benefit)) return false;
    if (params.method && !product.methods.includes(params.method)) return false;
    if (params.stage && !product.stageKeys.includes(params.stage)) return false;
    if (params.slugs && !params.slugs.includes(product.slug)) return false;
    return true;
  });
}

export const getFeaturedProducts = async (limit = 6): Promise<ProductCardData[]> => {
  const all = await getAllProducts();
  const featured = all.filter((p) => p.featured);
  return (featured.length >= 3 ? featured : all).slice(0, limit);
};

export interface FilterOptions {
  brands: { name: string; count: number }[];
  categories: { name: string; slug: string; count: number }[];
  /**
   * The crop taxonomy, parents first with their children after them. `count`
   * is how many products the filter would actually return, which for a parent
   * includes its children's.
   */
  crops: { name: string; slug: string; count: number; parentSlug: string | null }[];
  benefits: { name: string; slug: string; count: number }[];
  methods: { key: string; count: number }[];
  stages: { key: string; name: string; count: number }[];
}

export const getFilterOptions = unstable_cache(
  async (): Promise<FilterOptions> => {
    const [products, stages] = await Promise.all([
      getAllProducts(),
      db.growthStage.findMany({ orderBy: { order: "asc" } }),
    ]);
    const count = <K extends string>(entries: [K, string][]) => {
      const map = new Map<K, { label: string; count: number }>();
      for (const [key, label] of entries) {
        const current = map.get(key) ?? { label, count: 0 };
        current.count += 1;
        map.set(key, current);
      }
      return map;
    };

    const categoryMap = count(
      products.flatMap((p) => p.categories.map((c) => [c.slug, c.name] as [string, string])),
    );
    // Crop counts are worked out against `filterProducts` rather than by
    // tallying associations, so a parent's number is the number of products
    // clicking it returns — anything else and the label lies about the result.
    const cropRows = await db.crop.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { slug: true, name: true, parent: { select: { slug: true } } },
    });
    const benefitMap = count(
      products.flatMap((p) =>
        p.benefitSlugs.map((slug, i) => [slug, p.benefitNames[i] ?? slug] as [string, string]),
      ),
    );
    const methodMap = count(
      products.flatMap((p) => p.methods.map((m) => [m, m] as [string, string])),
    );
    const brandMap = count(
      products.flatMap((p) => (p.brand ? [[p.brand, p.brand] as [string, string]] : [])),
    );
    const stageCounts = new Map<string, number>();
    for (const p of products)
      for (const key of p.stageKeys) stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1);

    return {
      // Alphabetical: brands are peers, so ranking them by how many products
      // each happens to have would read as a ranking of the suppliers.
      brands: [...brandMap]
        .map(([name, v]) => ({ name, count: v.count }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      categories: [...categoryMap].map(([slug, v]) => ({ slug, name: v.label, count: v.count })),
      // Taxonomy order, not popularity: a child has to follow its parent for
      // the grouped picker to read as a tree.
      crops: cropRows
        .map((crop) => ({
          slug: crop.slug,
          name: crop.name,
          parentSlug: crop.parent?.slug ?? null,
          count: filterProducts(products, { crop: crop.slug }).length,
        }))
        .filter((crop) => crop.count > 0),
      benefits: [...benefitMap].map(([slug, v]) => ({ slug, name: v.label, count: v.count })),
      methods: [...methodMap].map(([key, v]) => ({ key, count: v.count })),
      // Only stages that can actually return a product are offered. Crops,
      // benefits and methods are derived from products and are already
      // self-limiting; stages come from their own table, so they need the
      // same guard or the finder would offer a dead-end answer.
      stages: stages
        .map((s) => ({ key: s.key, name: s.name, count: stageCounts.get(s.key) ?? 0 }))
        .filter((s) => s.count > 0),
    };
  },
  ["product-filter-options"],
  { tags: ["products"], revalidate: 600 },
);

export interface ProductDetailData extends ProductCardData {
  descriptionHtml: string | null;
  operatingPrinciple: string | null;
  instructionsHtml: string | null;
  composition: string[];
  benefitClaims: string[];
  whatsappRef: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  gallery: ImageData[];
  packageSizes: { size: string; priceUsd: number | null }[];
  guides: {
    rate: string;
    unit: string | null;
    notes: string | null;
    crop: string | null;
    stage: string | null;
    method: string | null;
  }[];
  faqs: { id: string; question: string; answerHtml: string }[];
  documents: { title: string; url: string }[];
  related: ProductCardData[];
  articles: { title: string; slug: string; excerpt: string | null }[];
  videos: { youtubeId: string; title: string }[];
  stageNames: string[];
}

export const getProductBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<ProductDetailData | null> => {
      const product = await db.product.findUnique({
        where: { slug, status: "PUBLISHED" },
        include: {
          ...productListInclude,
          gallery: { include: { media: true }, orderBy: { order: "asc" } },
          applicationGuides: {
            include: { crop: true, growthStage: true },
            orderBy: { order: "asc" },
          },
          faqs: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" } },
          documents: { orderBy: { order: "asc" } },
          related: {
            where: { status: "PUBLISHED" },
            include: productListInclude,
          },
          articles: {
            where: { status: "PUBLISHED" },
            select: { title: true, slug: true, excerpt: true },
          },
          videos: { where: { status: "PUBLISHED" }, select: { youtubeId: true, title: true } },
        },
      });
      if (!product) return null;

      const toCard = (p: (typeof product.related)[number]): ProductCardData => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        brand: p.brand,
        tagline: p.tagline,
        shortDescription: p.shortDescription,
        categories: toCategories(p.categories),
        image: toImage(p.primaryImage),
        priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
        pricedPackCount: p.packageSizes.filter((pack) => pack.priceUsd !== null).length,
        packSizes: p.packageSizes.map((s) => s.size),
        cropNames: p.crops.map((c) => c.crop.name),
        cropSlugs: p.crops.map((c) => c.crop.slug),
        cropGroupSlugs: toCropGroups(p.crops),
        methods: p.applicationMethods,
        benefitSlugs: p.benefits.map((b) => b.benefit.slug),
        benefitNames: p.benefits.map((b) => b.benefit.name),
        stageKeys: p.growthStages.map((s) => s.growthStage.key),
        featured: p.featured,
        hasRates: p.applicationGuides?.length > 0,
      });

      return {
        ...toCard(product as never),
        hasRates: product.applicationGuides.length > 0,
        descriptionHtml: product.descriptionHtml,
        operatingPrinciple: product.operatingPrinciple,
        instructionsHtml: product.instructionsHtml,
        composition: product.composition,
        benefitClaims: product.benefitClaims,
        whatsappRef: product.whatsappRef,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
        gallery: product.gallery.map((g) => toImage(g.media)!).filter(Boolean),
        packageSizes: product.packageSizes.map((p) => ({
          size: p.size,
          priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
        })),
        guides: product.applicationGuides.map((guide) => ({
          rate: guide.rate,
          unit: guide.unit,
          notes: guide.notes,
          crop: guide.crop?.name ?? null,
          stage: guide.growthStage?.name ?? null,
          method: guide.method,
        })),
        faqs: product.faqs.map((faq) => ({
          id: faq.id,
          question: faq.question,
          answerHtml: faq.answerHtml,
        })),
        documents: product.documents.map((d) => ({ title: d.title, url: d.url })),
        related: product.related.map(toCard),
        articles: product.articles,
        videos: product.videos,
        stageNames: product.growthStages.map((s) => s.growthStage.name),
      };
    },
    [`product-${slug}`],
    { tags: ["products"], revalidate: 600 },
  )();

export const getFinderCandidates = unstable_cache(
  async (): Promise<FinderCandidate[]> => {
    const products = await getAllProducts();
    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      cropSlugs: p.cropSlugs,
      benefitSlugs: p.benefitSlugs,
      stageKeys: p.stageKeys,
      methods: p.methods,
      featured: p.featured,
    }));
  },
  ["finder-candidates"],
  { tags: ["products"], revalidate: 600 },
);

export interface CatalogueStats {
  /** Unique published products. */
  products: number;
  /** Crops with at least one published product listed for them. */
  crops: number;
  /** Categories with at least one published product. */
  categories: number;
  /** Intended outcomes with at least one published product. */
  benefits: number;
  /** Application methods represented in the published range. */
  methods: number;
  /** Growth stages with at least one published product. */
  stages: number;
}

/**
 * The single source of every product-derived headline figure on the site.
 * Homepage stats, catalogue copy and the finder all read from here, so a
 * number can never be stale in one place and correct in another.
 */
export const getCatalogueStats = unstable_cache(
  async (): Promise<CatalogueStats> => {
    const [products, options] = await Promise.all([getAllProducts(), getFilterOptions()]);
    return {
      products: new Set(products.map((product) => product.id)).size,
      crops: options.crops.filter((crop) => crop.count > 0).length,
      categories: options.categories.filter((category) => category.count > 0).length,
      benefits: options.benefits.filter((benefit) => benefit.count > 0).length,
      methods: options.methods.filter((method) => method.count > 0).length,
      stages: options.stages.filter((stage) => stage.count > 0).length,
    };
  },
  ["catalogue-stats"],
  { tags: ["products"], revalidate: 600 },
);

export async function getProductSlugs(): Promise<string[]> {
  const products = await getAllProducts();
  return products.map((p) => p.slug);
}
