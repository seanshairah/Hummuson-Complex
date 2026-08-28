import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CloudRain,
  Droplets,
  Flower2,
  Layers,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SectionHeading, Em } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/shared/product-card";
import { MediaImage } from "@/components/shared/media-image";
import { VideoEmbed } from "@/components/shared/video-embed";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Parallax } from "@/components/motion/parallax";
import type { FilterOptions, ProductCardData } from "@/server/data/products";
import type { CropListItem } from "@/server/data/crops";
import type {
  ArticleCardData,
  ProjectCardData,
  TestimonialData,
  VideoData,
} from "@/server/data/content";
import { formatDate, humanize } from "@/lib/utils";
import partnerBioenergy from "../../../public/images/brand/Bioenergy_naujas-logotipas-3.jpg";
import partnerSapropel from "../../../public/images/brand/partner-433fd162.jpg";
import handsPhoto from "../../../public/images/field/field-IMG_0560.jpg";
import cabbagePhoto from "../../../public/images/field/field-IMG_0595.jpg";

/* ── Ranges / partners band ─────────────────────────────────────────────── */

export function RangesBand() {
  return (
    <section className="border-b border-line bg-cream">
      <div className="container-site flex flex-col items-center gap-6 py-10 md:flex-row md:justify-between">
        <p className="max-w-md text-center text-sm leading-relaxed text-ink-faint md:text-left">
          Distributor of <strong className="text-ink">organic fertilisers</strong>,{" "}
          <strong className="text-ink">biostimulants</strong> and{" "}
          <strong className="text-ink">foliar fertilisers</strong> of renowned European brands.
        </p>
        <div className="flex items-center gap-8">
          <Image
            src={partnerBioenergy}
            alt="Bioenergy LT"
            className="h-12 w-auto rounded-md object-contain grayscale transition hover:grayscale-0"
            sizes="120px"
          />
          <Image
            src={partnerSapropel}
            alt="Sapropel Organics"
            className="h-9 w-auto object-contain grayscale transition hover:grayscale-0"
            sizes="140px"
          />
        </div>
      </div>
    </section>
  );
}

/* ── Benefit-led navigation ─────────────────────────────────────────────── */

const BENEFIT_ICONS: Record<string, LucideIcon> = {
  "root-development": Sprout,
  flowering: Flower2,
  yield: TrendingUp,
  "crop-vigour": Zap,
  "soil-condition": Layers,
  "nutrient-uptake": Droplets,
  "stress-resistance": ShieldCheck,
  "moisture-retention": CloudRain,
};

export function BenefitNav({ options }: { options: FilterOptions }) {
  const benefits = options.benefits.filter((benefit) => benefit.count > 0);
  if (benefits.length === 0) return null;
  return (
    <section className="bg-paper py-20 md:py-28">
      <div className="container-site">
        <Reveal>
          <SectionHeading
            eyebrow="Start with your goal"
            title={
              <>
                What do you want to <Em className="text-brand">improve</Em>?
              </>
            }
            lede="Every Humuson product is mapped to the outcomes described in its own published guidance. Pick a goal to see the products listed for it."
          />
        </Reveal>
        <RevealGroup className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {benefits.map((benefit) => {
            const Icon = BENEFIT_ICONS[benefit.slug] ?? Sprout;
            return (
              <RevealItem key={benefit.slug}>
                <Link
                  href={`/products?benefit=${benefit.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-cream p-5 transition-all duration-300 hover:-translate-y-1 hover:border-leaf-600/50 hover:shadow-pop"
                >
                  <span className="flex size-11 items-center justify-center rounded-xl bg-leaf-300/40 text-leaf-800 transition-colors group-hover:bg-leaf-400 group-hover:text-humus-950">
                    <Icon className="size-5" strokeWidth={1.8} />
                  </span>
                  <span className="mt-4 font-display text-base font-semibold text-ink md:text-lg">
                    {benefit.name}
                  </span>
                  <span className="mt-1 text-xs text-ink-faint">
                    {benefit.count} product{benefit.count === 1 ? "" : "s"}
                  </span>
                  <ArrowUpRight className="mt-auto ml-auto size-4 text-ink-faint/50 transition-all group-hover:translate-x-0.5 group-hover:text-leaf-700" />
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── Featured products rail ─────────────────────────────────────────────── */

export function FeaturedProducts({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) return null;
  return (
    <section className="bg-paper-dim/60 py-20 md:py-28">
      <div className="container-site">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="The range"
            title={
              <>
                Products farmers <Em className="text-brand">reach for</Em>
              </>
            }
          />
          <ButtonLink href="/products" variant="outline" className="mb-1.5">
            View all products <ArrowRight className="size-4" />
          </ButtonLink>
        </Reveal>
      </div>
      <div className="container-wide mt-12">
        <RevealGroup
          className="scrollbar-none grid snap-x snap-mandatory auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-4 sm:auto-cols-[46%] lg:auto-cols-fr lg:grid-flow-row lg:grid-cols-4 lg:overflow-visible"
          stagger={0.06}
        >
          {products.slice(0, 8).map((product, i) => (
            <RevealItem key={product.id} className="snap-start">
              <ProductCard product={product} priority={i < 4} className="h-full" />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── Product finder teaser ──────────────────────────────────────────────── */

const FINDER_STEPS = [
  { n: "01", q: "What are you growing?" },
  { n: "02", q: "What do you want to improve?" },
  { n: "03", q: "What stage is your crop?" },
  { n: "04", q: "How do you prefer to apply?" },
];

export function FinderBand() {
  return (
    <section className="bg-grain relative overflow-hidden bg-humus-950 py-20 text-paper md:py-28">
      <div aria-hidden className="absolute inset-0 glow-leaf" />
      <div className="relative container-site grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Product finder"
            title={
              <>
                Four questions. <Em className="text-leaf-300">The right product.</Em>
              </>
            }
            lede="Answer four quick questions about your crop and goals, and we’ll match you with the Humuson products listed for exactly that situation — no guesswork."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/product-finder" variant="accent" size="lg">
              <ScanSearch className="size-5" strokeWidth={1.8} /> Find my solution
            </ButtonLink>
            <ButtonLink href="/crops" variant="outline-light" size="lg">
              Browse by crop
            </ButtonLink>
          </div>
        </Reveal>
        <RevealGroup className="space-y-3" stagger={0.09}>
          {FINDER_STEPS.map((step) => (
            <RevealItem key={step.n}>
              <div className="flex items-center gap-5 rounded-2xl border border-paper/10 bg-paper/5 px-6 py-4 backdrop-blur-sm">
                <span className="font-display text-sm font-semibold text-leaf-400">{step.n}</span>
                <span className="font-display text-base font-medium text-paper md:text-lg">
                  {step.q}
                </span>
                <ArrowRight className="ml-auto size-4 text-paper/30" aria-hidden />
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── Crops band ─────────────────────────────────────────────────────────── */

export function CropsBand({ crops }: { crops: CropListItem[] }) {
  const withProducts = crops.filter((crop) => crop.productCount > 0);
  if (withProducts.length === 0) return null;
  return (
    <section className="bg-paper py-20 md:py-28">
      <div className="container-site grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28">
          <Reveal>
            <SectionHeading
              eyebrow="Guidance by crop"
              title={
                <>
                  Grow it <Em className="text-brand">well</Em>
                </>
              }
              lede="From maize to greenhouse tomatoes — see which Humuson products are listed for your crop, stage by stage."
            />
            <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-3xl shadow-card lg:block">
              <Image
                src={cabbagePhoto}
                alt="Healthy cabbage field grown with Humuson Complex products"
                fill
                sizes="(max-width: 1024px) 0px, 480px"
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-humus-950/60 to-transparent"
              />
              <p className="absolute bottom-4 left-5 text-sm font-medium text-paper">
                Humuson field — vegetable production
              </p>
            </div>
          </Reveal>
        </div>
        <RevealGroup className="grid gap-3 sm:grid-cols-2" stagger={0.05}>
          {withProducts.slice(0, 10).map((crop) => (
            <RevealItem key={crop.slug}>
              <Link
                href={`/crops/${crop.slug}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-cream px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-leaf-600/50 hover:shadow-card"
              >
                <span>
                  <span className="block font-display text-base font-semibold text-ink capitalize">
                    {crop.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-faint">
                    {crop.productCount} listed product{crop.productCount === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-faint transition-all group-hover:border-leaf-600 group-hover:bg-leaf-400 group-hover:text-humus-950">
                  <ArrowUpRight className="size-3.5" />
                </span>
              </Link>
            </RevealItem>
          ))}
          <RevealItem className="sm:col-span-2">
            <Link
              href="/crops"
              className="block rounded-2xl border border-dashed border-line px-5 py-4 text-center text-sm font-medium text-ink-faint transition-colors hover:border-leaf-600 hover:text-leaf-700"
            >
              All crops →
            </Link>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}

/* ── Why Humuson (real claims) ──────────────────────────────────────────── */

export function SoilStory({ claims }: { claims: string[] }) {
  const shown = claims.slice(0, 6);
  if (shown.length === 0) return null;
  return (
    <section className="bg-grain relative overflow-hidden bg-humus-950 py-20 text-paper md:py-28">
      <div className="container-site grid items-center gap-14 lg:grid-cols-2">
        <Reveal className="relative order-2 lg:order-1">
          <Parallax speed={0.08} className="relative aspect-[4/5] overflow-hidden rounded-3xl">
            <Image
              src={handsPhoto}
              alt="Humuson team transplanting seedlings into drip-irrigated soil"
              fill
              sizes="(max-width: 1024px) 92vw, 560px"
              className="object-cover"
            />
          </Parallax>
          <div className="absolute -right-3 -bottom-5 max-w-[240px] rounded-2xl bg-leaf-400 p-5 text-humus-950 shadow-float md:-right-6">
            <p className="font-display text-sm leading-snug font-semibold">
              “Not only feed the plant — feed the soil.”
            </p>
            <p className="mt-1.5 text-[0.68rem] font-medium tracking-wide uppercase opacity-70">
              Humuson field note
            </p>
          </div>
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <SectionHeading
              tone="dark"
              eyebrow="Why Humuson"
              title={
                <>
                  Soil first. <Em className="text-leaf-300">Always.</Em>
                </>
              }
              lede="Zimbabwe’s soils have carried decades of chemical-only feeding. Humuson Complex exists to restore them — with biological inputs that farmers see working."
            />
          </Reveal>
          <RevealGroup className="mt-10 space-y-0" stagger={0.07}>
            {shown.map((claim, i) => (
              <RevealItem key={claim}>
                <div className="flex gap-5 border-b border-paper/10 py-4 last:border-0">
                  <span className="font-display text-sm font-semibold text-leaf-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-[0.95rem] leading-relaxed text-paper/85">{claim}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

/* ── Results & testimonials ─────────────────────────────────────────────── */

export function ResultsBand({
  projects,
  testimonials,
}: {
  projects: ProjectCardData[];
  testimonials: TestimonialData[];
}) {
  return (
    <section className="bg-paper py-20 md:py-28">
      <div className="container-site">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Results from the field"
            title={
              <>
                Proof that grows <Em className="text-brand">out of the ground</Em>
              </>
            }
          />
          <ButtonLink href="/projects" variant="outline" className="mb-1.5">
            All results <ArrowRight className="size-4" />
          </ButtonLink>
        </Reveal>

        {projects.length > 0 && (
          <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3" stagger={0.08}>
            {projects.slice(0, 3).map((project) => (
              <RevealItem key={project.id}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-line bg-cream shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-pop"
                >
                  {project.image && (
                    <div className="relative aspect-[16/10] overflow-hidden bg-paper-dim">
                      <MediaImage
                        image={project.image}
                        alt={project.title}
                        fill
                        sizes="(max-width: 768px) 92vw, 380px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      {project.cropName && <Badge variant="leaf">{project.cropName}</Badge>}
                      {project.location && <Badge variant="outline">{project.location}</Badge>}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-ink group-hover:text-brand">
                      {project.title}
                    </h3>
                    {project.summary && (
                      <p className="mt-1.5 line-clamp-2 text-sm text-ink-faint">
                        {project.summary}
                      </p>
                    )}
                  </div>
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
        )}

        {testimonials.length > 0 && (
          <RevealGroup className="mt-14 grid gap-4 md:grid-cols-2" stagger={0.08}>
            {testimonials.slice(0, 2).map((testimonial) => (
              <RevealItem key={testimonial.id}>
                <figure className="flex h-full flex-col rounded-2xl bg-humus-900 p-6 text-paper">
                  <Quote className="size-6 text-leaf-400" aria-hidden />
                  <blockquote className="mt-4 flex-1 text-editorial text-lg leading-relaxed text-paper/90">
                    {testimonial.quote}
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-leaf-400/20 font-display text-sm font-semibold text-leaf-300">
                      {testimonial.name.charAt(0)}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{testimonial.name}</span>
                      {testimonial.location && (
                        <span className="block text-xs text-paper/55">{testimonial.location}</span>
                      )}
                    </span>
                  </figcaption>
                </figure>
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </section>
  );
}

/* ── Knowledge preview ──────────────────────────────────────────────────── */

export function KnowledgePreview({
  articles,
  videos,
}: {
  articles: ArticleCardData[];
  videos: VideoData[];
}) {
  if (articles.length === 0 && videos.length === 0) return null;
  return (
    <section className="border-t border-line bg-cream py-20 md:py-28">
      <div className="container-site">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Knowledge centre"
            title={
              <>
                Learn the <Em className="text-brand">agronomy</Em> behind it
              </>
            }
          />
          <div className="mb-1.5 flex gap-3">
            <ButtonLink href="/knowledge" variant="outline">
              Articles
            </ButtonLink>
            <ButtonLink href="/videos" variant="outline">
              Videos
            </ButtonLink>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <RevealGroup className="space-y-1" stagger={0.06}>
            {articles.slice(0, 4).map((article) => (
              <RevealItem key={article.id}>
                <Link
                  href={`/knowledge/${article.slug}`}
                  className="group flex items-center gap-5 rounded-2xl p-3 transition-colors hover:bg-paper-dim"
                >
                  {article.cover && (
                    <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-xl sm:block">
                      <MediaImage
                        image={article.cover}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-medium tracking-widest text-leaf-700 uppercase">
                      {article.category?.name ?? "Article"}
                      {article.readingMinutes && ` · ${article.readingMinutes} min read`}
                    </p>
                    <h3 className="mt-1 line-clamp-2 font-display text-base font-semibold text-ink group-hover:text-brand md:text-lg">
                      {article.title}
                    </h3>
                    {article.publishedAt && (
                      <p className="mt-1 text-xs text-ink-faint">
                        {formatDate(article.publishedAt)}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="ml-auto size-4 shrink-0 text-ink-faint/40 transition-all group-hover:translate-x-1 group-hover:text-leaf-700" />
                </Link>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal delay={0.15}>
            {videos[0] && (
              <VideoEmbed
                youtubeId={videos[0].youtubeId}
                title={videos[0].title}
                category={humanize(videos[0].category)}
              />
            )}
            {videos[1] && (
              <div className="mt-4">
                <VideoEmbed
                  youtubeId={videos[1].youtubeId}
                  title={videos[1].title}
                  category={humanize(videos[1].category)}
                />
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── Catalogue teaser ───────────────────────────────────────────────────── */

export function CatalogueTeaser({ products }: { products: ProductCardData[] }) {
  const spreads = products.filter((p) => p.image).slice(0, 3);
  return (
    <section className="bg-grain relative overflow-hidden bg-humus-950 py-20 text-paper md:py-24">
      <div aria-hidden className="absolute inset-0 glow-leaf" />
      <div className="relative container-site grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Interactive catalogue"
            title={
              <>
                The range, as a <Em className="text-leaf-300">publication</Em>
              </>
            }
            lede="Browse the full Humuson range as an editorial digital catalogue — or flip through it page by page like the printed brochure, with every product one tap from its detail page."
          />
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/catalogue" variant="accent" size="lg">
              Open the catalogue
            </ButtonLink>
            <ButtonLink href="/catalogue/flipbook" variant="outline-light" size="lg">
              Flipbook mode
            </ButtonLink>
          </div>
        </Reveal>
        <Reveal delay={0.15} className="relative mx-auto h-72 w-full max-w-md md:h-80">
          {spreads.map((product, i) => (
            <div
              key={product.id}
              className="absolute inset-y-0 overflow-hidden rounded-2xl border border-paper/15 shadow-float transition-transform duration-500 hover:z-20 hover:scale-[1.03]"
              style={{
                left: `${i * 18}%`,
                right: `${(spreads.length - 1 - i) * 18}%`,
                transform: `rotate(${(i - 1) * 3}deg) translateY(${Math.abs(i - 1) * 8}px)`,
                zIndex: 10 - Math.abs(i - 1),
              }}
            >
              {product.image && (
                <MediaImage
                  image={product.image}
                  alt={product.name}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-humus-950/70 to-transparent"
              />
              <p className="absolute bottom-3 left-4 font-display text-sm font-semibold text-paper">
                {product.name}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
