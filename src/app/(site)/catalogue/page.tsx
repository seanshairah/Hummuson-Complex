import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, Download } from "lucide-react";
import { getPublishedCatalogue } from "@/server/data/catalogue";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MediaImage } from "@/components/shared/media-image";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/reveal";
import { Em } from "@/components/ui/section-heading";
import { ViewTracker } from "@/components/products/view-tracker";
import { cn, humanize } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Interactive catalogue — the Humuson range as a publication",
  description:
    "Browse the Humuson Complex product guide as an immersive editorial catalogue, or flip through it page by page.",
  alternates: { canonical: "/catalogue" },
};

/** Editorial treatments per chapter theme. */
const THEMES: Record<
  string,
  { section: string; label: string; heading: string; body: string; card: string }
> = {
  soil: {
    section: "bg-paper text-ink",
    label: "text-leaf-700",
    heading: "text-ink",
    body: "text-ink-soft",
    card: "border border-line bg-cream",
  },
  biology: {
    section: "bg-humus-950 bg-grain text-paper",
    label: "text-leaf-400",
    heading: "text-paper",
    body: "text-paper/70",
    card: "border border-paper/12 bg-paper/5 backdrop-blur-sm",
  },
  vitality: {
    section: "bg-leaf-200/50 text-ink",
    label: "text-leaf-800",
    heading: "text-ink",
    body: "text-ink-soft",
    card: "border border-leaf-600/25 bg-cream",
  },
  nutrition: {
    section: "bg-paper-deep text-ink",
    label: "text-soil-600",
    heading: "text-ink",
    body: "text-ink-soft",
    card: "border border-soil-400/30 bg-cream",
  },
  canopy: {
    section: "bg-grain bg-[#12351f] text-paper",
    label: "text-leaf-300",
    heading: "text-paper",
    body: "text-paper/70",
    card: "border border-paper/12 bg-paper/5 backdrop-blur-sm",
  },
};

/** Themes rendered on a dark ground — badges/labels need light variants. */
const DARK_THEMES = new Set(["biology", "canopy"]);

export default async function CataloguePage() {
  const catalogue = await getPublishedCatalogue();

  if (!catalogue) {
    return (
      <div className="container-site pt-36 pb-24">
        <EmptyState
          icon={BookOpen}
          title="The catalogue is being prepared"
          description="Browse the full product range while we finish the publication."
          action={<ButtonLink href="/products">View all products</ButtonLink>}
        />
      </div>
    );
  }

  return (
    <>
      <ViewTracker type="CATALOGUE_VIEW" entityType="catalogue" entityId={catalogue.id} />

      {/* Cover */}
      <section className="bg-grain relative flex min-h-[88svh] items-end overflow-hidden bg-humus-950 text-paper">
        <div aria-hidden className="absolute inset-0 glow-leaf" />
        <div
          aria-hidden
          className="absolute top-28 right-0 left-0 overflow-hidden text-eyebrow text-[clamp(4rem,14vw,11rem)] leading-none font-medium tracking-tight whitespace-nowrap text-paper/6 select-none"
        >
          {catalogue.title} · {catalogue.title}
        </div>
        <div className="relative container-site pt-40 pb-16">
          <p className="text-eyebrow text-leaf-400">
            Interactive catalogue{catalogue.year ? ` · ${catalogue.year}` : ""}
          </p>
          <h1 className="mt-5 max-w-4xl text-display-1">
            The range, as a <Em className="text-leaf-300">publication</Em>
          </h1>
          {catalogue.intro && (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/70">
              {catalogue.intro}
            </p>
          )}
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="/catalogue/flipbook" variant="accent" size="xl">
              <BookOpen className="size-5" strokeWidth={1.8} /> Open flipbook
            </ButtonLink>
            {catalogue.pdfUrl && (
              <ButtonLink href={catalogue.pdfUrl} variant="outline-light" size="xl" external>
                <Download className="size-5" strokeWidth={1.8} /> Download PDF
              </ButtonLink>
            )}
          </div>

          {/* Chapter index */}
          <nav aria-label="Catalogue chapters" className="mt-14">
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {catalogue.sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.slug}`}
                    className="group flex items-center gap-4 rounded-2xl border border-paper/12 bg-paper/5 px-5 py-4 backdrop-blur-sm transition-colors hover:border-leaf-400/50"
                  >
                    <span className="font-display text-sm font-semibold text-leaf-400">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display font-medium">{section.title}</span>
                    <ArrowRight className="ml-auto size-4 text-paper/40 transition-transform group-hover:translate-x-1" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Chapters */}
      {catalogue.sections.map((section, sectionIndex) => {
        const theme = THEMES[section.theme] ?? THEMES.soil!;
        const products = section.entries.filter((entry) => entry.product);
        return (
          <section
            key={section.id}
            id={section.slug}
            className={cn("scroll-mt-16 py-20 md:py-28", theme.section)}
          >
            <div className="container-site">
              <Reveal className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
                <div>
                  <p className={cn("text-eyebrow", theme.label)}>
                    Chapter {String(sectionIndex + 1).padStart(2, "0")}
                  </p>
                  <h2 className={cn("mt-3 text-display-2", theme.heading)}>{section.title}</h2>
                  {section.intro && (
                    <p className={cn("mt-4 max-w-2xl text-lg", theme.body)}>{section.intro}</p>
                  )}
                </div>
                <p className={cn("font-display text-sm", theme.body)}>
                  {products.length} product{products.length === 1 ? "" : "s"}
                </p>
              </Reveal>

              <div className="mt-12 space-y-6">
                {products.map((entry, entryIndex) => {
                  const product = entry.product!;
                  const flip = entry.layout === "FEATURE_RIGHT";
                  return (
                    <RevealGroup key={entry.id} amount={0.2}>
                      <RevealItem>
                        <Link
                          href={`/products/${product.slug}`}
                          className={cn(
                            "group grid items-stretch gap-0 overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-pop md:grid-cols-[0.9fr_1.1fr]",
                            theme.card,
                          )}
                        >
                          {/* Image plate */}
                          <div
                            className={cn(
                              "relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-paper-dim via-cream to-paper-deep md:aspect-auto md:min-h-72",
                              flip && "md:order-2",
                            )}
                          >
                            {(entry.image ?? product.image) ? (
                              <MediaImage
                                image={(entry.image ?? product.image)!}
                                alt={`${product.name} pack`}
                                fill
                                sizes="(max-width: 768px) 92vw, 500px"
                                className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                              />
                            ) : null}
                            <span
                              aria-hidden
                              className="absolute top-4 left-5 text-eyebrow text-[0.6rem] text-ink-faint/70 mix-blend-multiply"
                            >
                              {String(sectionIndex + 1).padStart(2, "0")}.
                              {String(entryIndex + 1).padStart(2, "0")}
                            </span>
                            {/* Hotspot affordance */}
                            <span className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full bg-humus-950/70 text-paper opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
                              <ArrowUpRight className="size-4.5" />
                            </span>
                          </div>

                          {/* Copy */}
                          <div className="flex flex-col p-6 md:p-9">
                            <div className="flex flex-wrap items-center gap-2">
                              {product.category && (
                                <Badge variant={DARK_THEMES.has(section.theme) ? "glass" : "leaf"}>
                                  {product.category.name}
                                </Badge>
                              )}
                              {product.methods.slice(0, 2).map((method) => (
                                <Badge
                                  key={method}
                                  variant="outline"
                                  className={
                                    DARK_THEMES.has(section.theme)
                                      ? "border-paper/25 text-paper/70"
                                      : undefined
                                  }
                                >
                                  {humanize(method)}
                                </Badge>
                              ))}
                            </div>
                            <h3
                              className={cn(
                                "mt-4 font-display text-3xl font-semibold tracking-tight",
                                theme.heading,
                              )}
                            >
                              {product.name}
                            </h3>
                            {(entry.headline || product.shortDescription) && (
                              <p className={cn("mt-3 max-w-lg leading-relaxed", theme.body)}>
                                {entry.headline ?? product.shortDescription}
                              </p>
                            )}
                            <dl
                              className={cn(
                                "mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm",
                                theme.body,
                              )}
                            >
                              {product.cropNames.length > 0 && (
                                <div>
                                  <dt className="text-eyebrow text-[0.58rem] opacity-70">
                                    Listed for
                                  </dt>
                                  <dd className="mt-1 capitalize">
                                    {product.cropNames.slice(0, 4).join(", ")}
                                    {product.cropNames.length > 4 && "…"}
                                  </dd>
                                </div>
                              )}
                              {product.packSizes.length > 0 && (
                                <div>
                                  <dt className="text-eyebrow text-[0.58rem] opacity-70">Packs</dt>
                                  <dd className="mt-1">{product.packSizes.join(" · ")}</dd>
                                </div>
                              )}
                            </dl>
                            <p
                              className={cn(
                                "mt-auto flex items-center gap-2 pt-6 font-display text-sm font-medium",
                                theme.label,
                              )}
                            >
                              View product
                              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                            </p>
                          </div>
                        </Link>
                      </RevealItem>
                    </RevealGroup>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}

      {/* Close */}
      <section className="border-t border-line bg-cream py-16">
        <div className="container-site flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-display-3 text-ink">Prefer to turn pages?</h2>
            <p className="mt-2 text-ink-soft">
              The same catalogue as a flipbook — swipe on mobile, spread view on desktop.
            </p>
          </div>
          <ButtonLink href="/catalogue/flipbook" size="lg">
            <BookOpen className="size-5" strokeWidth={1.8} /> Open flipbook
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
