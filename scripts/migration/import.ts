/**
 * Content importer: content/*.json (audited old-site content) → database.
 *
 * Principles:
 * - Idempotent: upserts by slug/key; child collections are rebuilt per run.
 * - Verbatim-faithful: no field is invented. Structured mappings (canonical
 *   benefits, growth stages, methods) are derived ONLY from phrases present
 *   in the product's own published text, via the conservative rule tables
 *   below. Anything unmatched stays unmapped and the UI says
 *   "confirm with technical support".
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  ApplicationMethod,
  FaqCategory,
  PublishStatus,
  VideoCategory,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { createPrismaClient } from "./client";
import { sanitizeRichHtml } from "../../src/lib/sanitize";
import type {
  OldUrlMapEntry,
  SourceArticle,
  SourceCategory,
  SourceCompany,
  SourceCrop,
  SourceFaq,
  SourceImage,
  SourceProduct,
  SourceProject,
  SourceTestimonial,
  SourceVideo,
} from "./types";

const prisma = createPrismaClient();
const ROOT = process.cwd();

function loadJson<T>(name: string): T | null {
  const file = path.join(ROOT, "content", name);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

/** slug helper mirroring src/lib/utils (kept dependency-free for tsx). */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[®™©]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Conservative mapping rule tables ────────────────────────────────────────

const METHOD_RULES: [RegExp, ApplicationMethod][] = [
  [/foliar/i, ApplicationMethod.FOLIAR],
  [/seed (dressing|treatment|soaking|coating)/i, ApplicationMethod.SEED_TREATMENT],
  [/top.?dress/i, ApplicationMethod.TOP_DRESSING],
  [/basal/i, ApplicationMethod.BASAL_DRESSING],
  [/fertigation|drip/i, ApplicationMethod.FERTIGATION],
  [/drench/i, ApplicationMethod.DRENCH],
  [/soil/i, ApplicationMethod.SOIL],
];

function mapMethod(label: string): ApplicationMethod {
  for (const [pattern, method] of METHOD_RULES) {
    if (pattern.test(label)) return method;
  }
  return ApplicationMethod.OTHER;
}

/** Canonical, filterable benefit dimensions (drive the finder + filters). */
const BENEFIT_RULES: { slug: string; name: string; pattern: RegExp }[] = [
  { slug: "root-development", name: "Root development", pattern: /root/i },
  { slug: "flowering", name: "Flowering & fruiting", pattern: /flower|bloom|fruit set/i },
  { slug: "yield", name: "Yield", pattern: /yield|harvest|production|productivity/i },
  { slug: "crop-vigour", name: "Crop vigour", pattern: /vigou?r|vigorous|strong(er)? (plant|crop|growth)|robust/i },
  { slug: "soil-condition", name: "Soil health", pattern: /soil (health|fertility|structure|condition|life|biology)|revitali|regenerat/i },
  { slug: "nutrient-uptake", name: "Nutrient uptake", pattern: /uptake|utili[sz]ation|absorption|availab|solubili/i },
  { slug: "stress-resistance", name: "Stress resistance", pattern: /stress|drought|resistan|resilien|defen[cs]e|tolerance/i },
  { slug: "moisture-retention", name: "Moisture retention", pattern: /moisture|water (retention|holding)/i },
];

/** Growth stages mapped only from explicit textual evidence. */
const STAGE_RULES: { key: string; pattern: RegExp }[] = [
  { key: "seed", pattern: /seed (dressing|treatment|soaking|coating)|at planting|basal|germination|sowing/i },
  { key: "emergence", pattern: /seedling|emergence|nurser|transplant/i },
  { key: "vegetative", pattern: /vegetative|top.?dress|tillering|leaf growth/i },
  { key: "flowering", pattern: /flowering|bloom|blossom/i },
  { key: "grain-fill", pattern: /grain.?fill|fruit(ing)? development|pod fill|tuber (formation|bulking)/i },
  { key: "maturity", pattern: /maturity|ripening/i },
];

const GROWTH_STAGES = [
  { key: "seed", name: "Seed & planting", order: 0 },
  { key: "emergence", name: "Emergence", order: 1 },
  { key: "vegetative", name: "Vegetative growth", order: 2 },
  { key: "flowering", name: "Flowering", order: 3 },
  { key: "grain-fill", name: "Fruit & grain development", order: 4 },
  { key: "maturity", name: "Maturity", order: 5 },
];

const FAQ_CATEGORY_MAP: Record<string, FaqCategory> = {
  application: FaqCategory.APPLICATION,
  dosage: FaqCategory.DOSAGE,
  compatibility: FaqCategory.COMPATIBILITY,
  crops: FaqCategory.CROPS,
  benefits: FaqCategory.BENEFITS,
  storage: FaqCategory.STORAGE,
  availability: FaqCategory.AVAILABILITY,
  ordering: FaqCategory.ORDERING,
  packages: FaqCategory.PACKAGES,
  general: FaqCategory.GENERAL,
};

const VIDEO_CATEGORY_MAP: Record<string, VideoCategory> = {
  "how-to-apply": VideoCategory.HOW_TO_APPLY,
  "product-demonstration": VideoCategory.PRODUCT_DEMONSTRATION,
  "farmer-results": VideoCategory.FARMER_RESULTS,
  "agronomy-education": VideoCategory.AGRONOMY_EDUCATION,
  events: VideoCategory.EVENTS,
  "humuson-stories": VideoCategory.HUMUSON_STORIES,
};

// ─── Media ───────────────────────────────────────────────────────────────────

const mediaCache = new Map<string, string>();

async function ensureMedia(
  image: SourceImage,
  kind: string,
): Promise<string | null> {
  const url = `/${image.localPath.replace(/^\/+/, "")}`;
  if (mediaCache.has(url)) return mediaCache.get(url)!;
  const filePath = path.join(ROOT, "public", url);
  if (!existsSync(filePath)) {
    console.warn(`  ! media missing on disk, skipping: ${url}`);
    return null;
  }
  let width: number | undefined;
  let height: number | undefined;
  let blurDataUrl: string | undefined;
  let sizeBytes: number | undefined;
  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    width = meta.width;
    height = meta.height;
    sizeBytes = meta.size;
    const blur = await img.resize(18, undefined, { fit: "inside" }).webp({ quality: 30 }).toBuffer();
    blurDataUrl = `data:image/webp;base64,${blur.toString("base64")}`;
  } catch {
    console.warn(`  ! could not probe image ${url}`);
  }
  const media = await prisma.media.upsert({
    where: { url },
    update: { alt: image.alt ?? undefined, width, height, blurDataUrl, sizeBytes },
    create: {
      url,
      alt: image.alt ?? null,
      width,
      height,
      blurDataUrl,
      kind,
      sizeBytes,
      filename: path.basename(url),
      sourceUrl: image.sourceUrl,
    },
  });
  mediaCache.set(url, media.id);
  return media.id;
}

// ─── Import steps ────────────────────────────────────────────────────────────

/** product.id → media.id of its role:"catalogue" image (filled by importProducts). */
const catalogueImageByProduct = new Map<string, string>();

async function importUsers() {
  const email = process.env.ADMIN_EMAIL ?? "admin@humusoncomplex.com";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-immediately";
  const name = process.env.ADMIN_NAME ?? "Humuson Admin";
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN", active: true },
    create: { email, name, passwordHash, role: "ADMIN" },
  });
  console.log(`✓ admin user ready (${email})`);
}

async function importGrowthStages() {
  for (const stage of GROWTH_STAGES) {
    await prisma.growthStage.upsert({
      where: { key: stage.key },
      update: { name: stage.name, order: stage.order },
      create: stage,
    });
  }
  console.log(`✓ growth stages (${GROWTH_STAGES.length})`);
}

async function importBenefits() {
  let order = 0;
  for (const rule of BENEFIT_RULES) {
    await prisma.benefit.upsert({
      where: { slug: rule.slug },
      update: { name: rule.name, order },
      create: { slug: rule.slug, name: rule.name, order },
    });
    order += 1;
  }
  console.log(`✓ canonical benefits (${BENEFIT_RULES.length})`);
}

async function importCategories(categories: SourceCategory[]) {
  let order = 0;
  for (const category of categories) {
    await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, order },
      create: { slug: category.slug, name: category.name, description: category.description, order },
    });
    order += 1;
  }
  console.log(`✓ categories (${categories.length})`);
}

async function importCrops(crops: SourceCrop[]) {
  let order = 0;
  for (const crop of crops) {
    await prisma.crop.upsert({
      where: { slug: crop.slug },
      update: { name: crop.name, aka: crop.aka ?? [], order },
      create: { slug: crop.slug, name: crop.name, aka: crop.aka ?? [], order },
    });
    order += 1;
  }
  console.log(`✓ crops (${crops.length})`);
}

async function ensureCrop(nameRaw: string): Promise<string> {
  const name = nameRaw.trim();
  const slug = slugify(name);
  const existing = await prisma.crop.findUnique({ where: { slug } });
  if (existing) return existing.id;
  // Also match by aka
  const byAka = await prisma.crop.findFirst({ where: { aka: { has: name.toLowerCase() } } });
  if (byAka) return byAka.id;
  const created = await prisma.crop.create({
    data: { slug, name: name.charAt(0).toUpperCase() + name.slice(1) },
  });
  return created.id;
}

async function importProducts(products: SourceProduct[]) {
  let order = 0;
  for (const source of products) {
    const fullText = [
      source.name,
      source.shortDescription ?? "",
      source.descriptionHtml ?? "",
      source.benefits.join(" "),
      source.applicationMethods.join(" "),
      source.applicationRates.map((rate) => `${rate.context ?? ""} ${rate.notes ?? ""}`).join(" "),
    ].join(" \n ");

    const methods: ApplicationMethod[] = [
      ...new Set(source.applicationMethods.map(mapMethod).filter((m) => m !== ApplicationMethod.OTHER)),
    ];
    // Method evidence can also live in description text.
    for (const [pattern, method] of METHOD_RULES) {
      if (pattern.test(fullText) && !methods.includes(method)) methods.push(method);
    }

    // A product may carry several old-shop categories; pick the most specific
    // as its primary (Value sachet line > Biostimulants > Liquid > Organic > Physio).
    const CATEGORY_PRIORITY = ["value", "biostimulants", "liquid-fertilisers", "organic", "physio"];
    const primaryCategorySlug =
      CATEGORY_PRIORITY.find((slug) => source.categorySlugs.includes(slug)) ??
      source.categorySlugs[0];
    const category = primaryCategorySlug
      ? await prisma.productCategory.findUnique({ where: { slug: primaryCategorySlug } })
      : null;

    const descriptionHtml = source.descriptionHtml ? sanitizeRichHtml(source.descriptionHtml) : null;

    const product = await prisma.product.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        shortDescription: source.shortDescription,
        descriptionHtml,
        composition: source.composition,
        benefitClaims: source.benefits,
        priceUsd: source.priceUsd ?? undefined,
        applicationMethods: methods,
        categoryId: category?.id ?? null,
        sourceUrls: source.oldUrls,
        notes: source.notes ?? null,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        order,
        featured: source.featured ?? false,
      },
      create: {
        name: source.name,
        slug: source.slug,
        shortDescription: source.shortDescription,
        descriptionHtml,
        composition: source.composition,
        benefitClaims: source.benefits,
        priceUsd: source.priceUsd,
        applicationMethods: methods,
        categoryId: category?.id ?? null,
        sourceUrls: source.oldUrls,
        notes: source.notes ?? null,
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        order,
        featured: source.featured ?? false,
      },
    });
    order += 1;

    // Images. Roles steer placement: "primary" wins the hero slot, a
    // "catalogue" shot becomes that product's flipbook/catalogue plate
    // (recorded here, applied in buildDefaultCatalogue), everything else is
    // gallery. Without roles the first image stays primary, as before.
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    let explicitPrimaryId: string | null = null;
    let firstNonCatalogueId: string | null = null;
    let firstImageId: string | null = null;
    let imageOrder = 0;
    for (const image of source.images) {
      const mediaId = await ensureMedia(
        { ...image, alt: image.alt || `${source.name} — Humuson Complex product` },
        "product",
      );
      if (!mediaId) continue;
      if (!firstImageId) firstImageId = mediaId;
      if (image.role === "primary" && !explicitPrimaryId) explicitPrimaryId = mediaId;
      if (image.role !== "catalogue" && !firstNonCatalogueId) firstNonCatalogueId = mediaId;
      if (image.role === "catalogue" && !catalogueImageByProduct.has(product.id)) {
        catalogueImageByProduct.set(product.id, mediaId);
      }
      await prisma.productImage.create({
        data: { productId: product.id, mediaId, order: imageOrder },
      });
      imageOrder += 1;
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { primaryImageId: explicitPrimaryId ?? firstNonCatalogueId ?? firstImageId },
    });

    // Package sizes
    await prisma.packageSize.deleteMany({ where: { productId: product.id } });
    let sizeOrder = 0;
    for (const pack of source.packSizes) {
      await prisma.packageSize.create({
        data: { productId: product.id, size: pack.size, priceUsd: pack.priceUsd, order: sizeOrder },
      });
      sizeOrder += 1;
    }

    // Application guides
    await prisma.applicationGuide.deleteMany({ where: { productId: product.id } });
    let guideOrder = 0;
    for (const rate of source.applicationRates) {
      await prisma.applicationGuide.create({
        data: {
          productId: product.id,
          rate: rate.rate,
          unit: rate.context,
          notes: rate.notes,
          order: guideOrder,
        },
      });
      guideOrder += 1;
    }

    // Crops
    await prisma.productCrop.deleteMany({ where: { productId: product.id } });
    for (const cropName of source.suitableCrops) {
      const cropId = await ensureCrop(cropName);
      await prisma.productCrop.upsert({
        where: { productId_cropId: { productId: product.id, cropId } },
        update: {},
        create: { productId: product.id, cropId },
      });
    }

    // Canonical benefits — only when the product's own text evidences them.
    await prisma.productBenefit.deleteMany({ where: { productId: product.id } });
    let benefitOrder = 0;
    for (const rule of BENEFIT_RULES) {
      if (rule.pattern.test(fullText)) {
        const benefit = await prisma.benefit.findUnique({ where: { slug: rule.slug } });
        if (benefit) {
          await prisma.productBenefit.create({
            data: { productId: product.id, benefitId: benefit.id, order: benefitOrder },
          });
          benefitOrder += 1;
        }
      }
    }

    // Growth stages — only on explicit textual evidence.
    await prisma.productGrowthStage.deleteMany({ where: { productId: product.id } });
    for (const rule of STAGE_RULES) {
      if (rule.pattern.test(fullText)) {
        const stage = await prisma.growthStage.findUnique({ where: { key: rule.key } });
        if (stage) {
          await prisma.productGrowthStage.create({
            data: { productId: product.id, growthStageId: stage.id },
          });
        }
      }
    }
  }
  console.log(`✓ products (${products.length})`);
}

async function pruneEmptyCategories() {
  const removed = await prisma.productCategory.deleteMany({
    where: { products: { none: {} } },
  });
  if (removed.count > 0) console.log(`✓ pruned ${removed.count} empty categories`);
}

async function linkRelatedProducts() {
  // Related = same category, closest order — a deterministic, honest default.
  const products = await prisma.product.findMany({
    select: { id: true, categoryId: true, order: true },
    orderBy: { order: "asc" },
  });
  for (const product of products) {
    const siblings = products
      .filter((p) => p.id !== product.id && p.categoryId && p.categoryId === product.categoryId)
      .slice(0, 4);
    await prisma.product.update({
      where: { id: product.id },
      data: { related: { set: siblings.map((s) => ({ id: s.id })) } },
    });
  }
  console.log("✓ related products linked by category");
}

async function importFaqs(faqs: SourceFaq[]) {
  await prisma.faqCrop.deleteMany();
  await prisma.questionEvent.updateMany({ data: { faqId: null } });
  await prisma.faq.deleteMany();
  let order = 0;
  for (const source of faqs) {
    const product = source.productSlugs?.[0]
      ? await prisma.product.findUnique({ where: { slug: source.productSlugs[0] } })
      : null;
    const faq = await prisma.faq.create({
      data: {
        question: source.question,
        answerHtml: sanitizeRichHtml(source.answer),
        category: FAQ_CATEGORY_MAP[source.category ?? "general"] ?? FaqCategory.GENERAL,
        aliases: source.aliases ?? [],
        keywords: source.keywords ?? [],
        productId: product?.id ?? null,
        status: PublishStatus.PUBLISHED,
        order,
      },
    });
    order += 1;
    for (const cropSlug of source.cropSlugs ?? []) {
      const crop = await prisma.crop.findUnique({ where: { slug: cropSlug } });
      if (crop) {
        await prisma.faqCrop.create({ data: { faqId: faq.id, cropId: crop.id } });
      }
    }
  }
  console.log(`✓ faqs (${faqs.length})`);
}

async function importArticles(articles: SourceArticle[]) {
  for (const source of articles) {
    const categorySlug = source.category ?? "agronomy-advice";
    const categoryName = categorySlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const category = await prisma.articleCategory.upsert({
      where: { slug: categorySlug },
      update: {},
      create: { slug: categorySlug, name: categoryName },
    });

    const coverImageId = source.coverImage ? await ensureMedia(source.coverImage, "article") : null;
    const bodyHtml = sanitizeRichHtml(source.bodyHtml);
    const words = bodyHtml.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;

    const productIds: { id: string }[] = [];
    for (const slug of source.relatedProductSlugs ?? []) {
      const product = await prisma.product.findUnique({ where: { slug } });
      if (product) productIds.push({ id: product.id });
    }

    await prisma.article.upsert({
      where: { slug: source.slug },
      update: {
        title: source.title,
        excerpt: source.excerpt,
        bodyHtml,
        coverImageId,
        categoryId: category.id,
        products: { set: productIds },
        readingMinutes: Math.max(1, Math.round(words / 200)),
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(source.publishedAt),
        sourceUrl: source.oldUrl,
      },
      create: {
        title: source.title,
        slug: source.slug,
        excerpt: source.excerpt,
        bodyHtml,
        coverImageId,
        categoryId: category.id,
        products: { connect: productIds },
        readingMinutes: Math.max(1, Math.round(words / 200)),
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(source.publishedAt),
        sourceUrl: source.oldUrl,
      },
    });
  }
  console.log(`✓ articles (${articles.length})`);
}

async function importVideos(videos: SourceVideo[]) {
  let order = 0;
  for (const source of videos) {
    await prisma.video.upsert({
      where: { youtubeId: source.youtubeId },
      update: {
        title: source.title ?? `Humuson video ${source.youtubeId}`,
        description: source.description ?? null,
        category: VIDEO_CATEGORY_MAP[source.category ?? ""] ?? VideoCategory.AGRONOMY_EDUCATION,
        featured: source.featured ?? false,
        order,
      },
      create: {
        youtubeId: source.youtubeId,
        youtubeUrl: source.youtubeUrl,
        title: source.title ?? `Humuson video ${source.youtubeId}`,
        description: source.description ?? null,
        thumbnailUrl: `https://img.youtube.com/vi/${source.youtubeId}/hqdefault.jpg`,
        category: VIDEO_CATEGORY_MAP[source.category ?? ""] ?? VideoCategory.AGRONOMY_EDUCATION,
        featured: source.featured ?? false,
        status: PublishStatus.PUBLISHED,
        order,
      },
    });
    order += 1;
  }
  console.log(`✓ videos (${videos.length})`);
}

async function importProjects(projects: SourceProject[]) {
  for (const source of projects) {
    const cropId = source.crop ? await ensureCrop(source.crop) : null;
    const productIds: { id: string }[] = [];
    for (const slug of source.productSlugs ?? []) {
      const product = await prisma.product.findUnique({ where: { slug } });
      if (product) productIds.push({ id: product.id });
    }

    const project = await prisma.project.upsert({
      where: { slug: source.slug },
      update: {
        title: source.title,
        cropId,
        location: source.location ?? null,
        summary: source.summary ?? null,
        bodyHtml: source.bodyHtml ? sanitizeRichHtml(source.bodyHtml) : null,
        outcome: source.outcome ?? null,
        products: { set: productIds },
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        sourceUrl: source.sourceUrl ?? null,
      },
      create: {
        title: source.title,
        slug: source.slug,
        cropId,
        location: source.location ?? null,
        summary: source.summary ?? null,
        bodyHtml: source.bodyHtml ? sanitizeRichHtml(source.bodyHtml) : null,
        outcome: source.outcome ?? null,
        products: { connect: productIds },
        status: PublishStatus.PUBLISHED,
        publishedAt: new Date(),
        sourceUrl: source.sourceUrl ?? null,
      },
    });

    await prisma.projectImage.deleteMany({ where: { projectId: project.id } });
    let order = 0;
    for (const image of source.images ?? []) {
      const mediaId = await ensureMedia(image, "field-photo");
      if (!mediaId) continue;
      await prisma.projectImage.create({
        data: { projectId: project.id, mediaId, order },
      });
      order += 1;
    }
  }
  console.log(`✓ projects (${projects.length})`);
}

async function importTestimonials(testimonials: SourceTestimonial[]) {
  await prisma.project.updateMany({ data: { testimonialId: null } });
  await prisma.testimonial.deleteMany();
  let order = 0;
  for (const source of testimonials) {
    await prisma.testimonial.create({
      data: {
        name: source.name,
        role: source.role ?? null,
        location: source.location ?? null,
        quote: source.quote,
        order,
      },
    });
    order += 1;
  }
  console.log(`✓ testimonials (${testimonials.length})`);
}

async function importCompany(company: SourceCompany | null) {
  if (!company) return;
  const normalize = (
    items: (string | { title: string; description?: string })[] | undefined,
  ): { title: string; description?: string }[] =>
    (items ?? []).map((item) => (typeof item === "string" ? { title: item } : item));

  const contactValue = {
    phones: company.phones ?? [],
    whatsapp: (company.whatsappNumbers?.[0] ?? "263776656433").replace(/[^0-9]/g, ""),
    // Provided by the owner (WhatsApp Business catalogue share link).
    whatsappCatalogueUrl: "https://wa.me/c/80084060872727",
    emails: company.emails ?? [],
    address: company.address ?? null,
    hours: company.hours ?? null,
    socials: company.socials ?? {},
  };
  await prisma.siteSetting.upsert({
    where: { key: "contact" },
    update: { value: contactValue },
    create: { key: "contact", value: contactValue },
  });
  await prisma.siteSetting.upsert({
    where: { key: "company" },
    update: {
      value: {
        tagline: company.taglines?.[0] ?? "Home of Healthy Soil & Healthy Crop",
        taglines: company.taglines ?? [],
        shortAbout: company.about?.split("\n\n")[0] ?? "",
        about: company.about ?? "",
        services: normalize(company.services),
        whyChooseUs: company.whyChooseUs ?? [],
        workingProcess: normalize(company.workingProcess),
        values: company.values ?? [],
        partnerBrands: company.partnerBrands ?? [],
      },
    },
    create: {
      key: "company",
      value: {
        tagline: company.taglines?.[0] ?? "Home of Healthy Soil & Healthy Crop",
        taglines: company.taglines ?? [],
        shortAbout: company.about?.split("\n\n")[0] ?? "",
        about: company.about ?? "",
        services: normalize(company.services),
        whyChooseUs: company.whyChooseUs ?? [],
        workingProcess: normalize(company.workingProcess),
        values: company.values ?? [],
        partnerBrands: company.partnerBrands ?? [],
      },
    },
  });
  console.log("✓ company settings");
}

/** Chapter themes for the generated catalogue (presentation only). */
const SECTION_THEMES: Record<string, string> = {
  organic: "soil",
  physio: "biology",
  value: "vitality",
  "liquid-fertilisers": "nutrition",
  biostimulants: "canopy",
};

async function buildDefaultCatalogue() {
  const year = new Date().getFullYear();
  const catalogue = await prisma.catalogue.upsert({
    where: { slug: "humuson-product-guide" },
    update: { title: `Humuson Product Guide ${year}`, year, status: PublishStatus.PUBLISHED },
    create: {
      slug: "humuson-product-guide",
      title: `Humuson Product Guide ${year}`,
      year,
      status: PublishStatus.PUBLISHED,
      intro:
        "The complete Humuson Complex range — biological crop nutrition for healthy soil and healthy crops.",
    },
  });

  await prisma.catalogueEntry.deleteMany({ where: { section: { catalogueId: catalogue.id } } });
  await prisma.catalogueSection.deleteMany({ where: { catalogueId: catalogue.id } });

  const categories = await prisma.productCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      products: {
        where: { status: PublishStatus.PUBLISHED },
        orderBy: { order: "asc" },
        include: { primaryImage: true },
      },
    },
  });

  let sectionOrder = 0;
  for (const category of categories) {
    if (category.products.length === 0) continue;
    const section = await prisma.catalogueSection.create({
      data: {
        catalogueId: catalogue.id,
        title: category.name,
        slug: category.slug,
        intro: category.description,
        theme: SECTION_THEMES[category.slug] ?? "soil",
        order: sectionOrder,
        imageId: category.products[0]?.primaryImageId ?? null,
      },
    });
    sectionOrder += 1;

    let entryOrder = 0;
    for (const product of category.products) {
      await prisma.catalogueEntry.create({
        data: {
          sectionId: section.id,
          productId: product.id,
          // The dedicated catalogue shot (role:"catalogue"), when the product
          // has one — the flipbook/explore plate; product hero otherwise.
          imageId: catalogueImageByProduct.get(product.id) ?? null,
          layout: entryOrder % 2 === 0 ? "FEATURE_LEFT" : "FEATURE_RIGHT",
          order: entryOrder,
        },
      });
      entryOrder += 1;
    }
  }
  console.log("✓ default catalogue generated from categories");
}

export async function runImport() {
  console.log("── Humuson content import ──");
  const products = loadJson<SourceProduct[]>("products.json");
  const categories = loadJson<SourceCategory[]>("categories.json");
  const crops = loadJson<SourceCrop[]>("crops.json");
  const faqs = loadJson<SourceFaq[]>("faqs.json");
  const articles = loadJson<SourceArticle[]>("articles.json");
  const videos = loadJson<SourceVideo[]>("videos.json");
  const projects = loadJson<SourceProject[]>("projects.json");
  const testimonials = loadJson<SourceTestimonial[]>("testimonials.json");
  const company = loadJson<SourceCompany>("company.json");
  const urlMap = loadJson<OldUrlMapEntry[]>("old-url-map.json");

  await importUsers();
  await importGrowthStages();
  await importBenefits();
  if (categories) await importCategories(categories);
  if (crops) await importCrops(crops);
  if (products) await importProducts(products);
  if (products) await pruneEmptyCategories();
  if (products) await linkRelatedProducts();
  if (faqs) await importFaqs(faqs);
  if (articles) await importArticles(articles);
  if (videos) await importVideos(videos);
  if (projects) await importProjects(projects);
  if (testimonials) await importTestimonials(testimonials);
  await importCompany(company);
  if (products) await buildDefaultCatalogue();

  if (urlMap) console.log(`✓ redirect map present (${urlMap.length} URLs, applied in next.config.ts)`);
  console.log("── import complete ──");
}

if (process.argv[1] && process.argv[1].endsWith("import.ts")) {
  runImport()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
