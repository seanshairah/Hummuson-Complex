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
  tagline: string | null;
  shortDescription: string | null;
  category: { name: string; slug: string } | null;
  image: ImageData | null;
  priceUsd: number | null;
  packSizes: string[];
  cropNames: string[];
  cropSlugs: string[];
  methods: string[];
  benefitSlugs: string[];
  benefitNames: string[];
  stageKeys: string[];
  featured: boolean;
  hasRates: boolean;
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
  category: true,
  primaryImage: true,
  packageSizes: { orderBy: { order: "asc" as const } },
  crops: { include: { crop: true } },
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
      tagline: product.tagline,
      shortDescription: product.shortDescription,
      category: product.category
        ? { name: product.category.name, slug: product.category.slug }
        : null,
      image: toImage(product.primaryImage),
      priceUsd: product.priceUsd ? Number(product.priceUsd) : null,
      packSizes: product.packageSizes.map((p) => p.size),
      cropNames: product.crops.map((c) => c.crop.name),
      cropSlugs: product.crops.map((c) => c.crop.slug),
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
  category?: string;
  crop?: string;
  benefit?: string;
  method?: string;
  stage?: string;
  slugs?: string[];
}

/** Pure filter over the cached product list. */
export function filterProducts(
  products: ProductCardData[],
  params: ProductFilterParams,
): ProductCardData[] {
  return products.filter((product) => {
    if (params.category && product.category?.slug !== params.category) return false;
    if (params.crop && !product.cropSlugs.includes(params.crop)) return false;
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
  categories: { name: string; slug: string; count: number }[];
  crops: { name: string; slug: string; count: number }[];
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
      products.flatMap((p) =>
        p.category ? [[p.category.slug, p.category.name] as [string, string]] : [],
      ),
    );
    const cropMap = count(
      products.flatMap((p) =>
        p.cropSlugs.map((slug, i) => [slug, p.cropNames[i] ?? slug] as [string, string]),
      ),
    );
    const benefitMap = count(
      products.flatMap((p) =>
        p.benefitSlugs.map((slug, i) => [slug, p.benefitNames[i] ?? slug] as [string, string]),
      ),
    );
    const methodMap = count(
      products.flatMap((p) => p.methods.map((m) => [m, m] as [string, string])),
    );
    const stageCounts = new Map<string, number>();
    for (const p of products)
      for (const key of p.stageKeys) stageCounts.set(key, (stageCounts.get(key) ?? 0) + 1);

    return {
      categories: [...categoryMap].map(([slug, v]) => ({ slug, name: v.label, count: v.count })),
      crops: [...cropMap]
        .map(([slug, v]) => ({ slug, name: v.label, count: v.count }))
        .sort((a, b) => b.count - a.count),
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
        tagline: p.tagline,
        shortDescription: p.shortDescription,
        category: p.category ? { name: p.category.name, slug: p.category.slug } : null,
        image: toImage(p.primaryImage),
        priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
        packSizes: p.packageSizes.map((s) => s.size),
        cropNames: p.crops.map((c) => c.crop.name),
        cropSlugs: p.crops.map((c) => c.crop.slug),
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
