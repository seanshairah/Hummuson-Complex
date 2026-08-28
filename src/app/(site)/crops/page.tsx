import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Wheat } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getAllCrops } from "@/server/data/crops";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Crops — guidance by what you grow",
  description:
    "Maize, potatoes, wheat, tomatoes, legumes and more — see which Humuson Complex products are listed for your crop, stage by stage.",
  alternates: { canonical: "/crops" },
};

export default async function CropsPage() {
  const crops = await getAllCrops();
  const specific = crops.filter((crop) => crop.productCount > 0);
  const groups = crops.filter((crop) => crop.productCount === 0);

  return (
    <>
      <PageIntro
        eyebrow="Guidance by crop"
        title="Start from what you"
        titleAccent="grow"
        lede="Every crop page shows the Humuson products listed for it, the growth stages they reference, and the questions farmers ask — all drawn from published product guidance."
        crumbs={[{ label: "Crops" }]}
      />
      <section className="container-site pb-20">
        {specific.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Crop guidance is being prepared"
            description="Ask a Humuson adviser what fits your crop in the meantime."
            action={<ButtonLink href="/contact">Request advice</ButtonLink>}
          />
        ) : (
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {[...specific]
              .sort((a, b) => b.productCount - a.productCount)
              .map((crop, i) => (
                <RevealItem key={crop.slug}>
                  <Link
                    href={`/crops/${crop.slug}`}
                    className={cn(
                      "group relative flex h-full min-h-40 flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-pop",
                      i % 5 === 0
                        ? "bg-humus-950 bg-grain text-paper"
                        : "border border-line bg-cream text-ink shadow-card",
                    )}
                  >
                    {i % 5 === 0 && <span aria-hidden className="glow-leaf absolute inset-0" />}
                    <div className="relative flex items-start justify-between">
                      <h2 className="font-display text-2xl font-semibold tracking-tight capitalize">
                        {crop.name}
                      </h2>
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border transition-all",
                          i % 5 === 0
                            ? "border-paper/25 text-paper group-hover:bg-leaf-400 group-hover:text-humus-950"
                            : "border-line text-ink-faint group-hover:border-leaf-600 group-hover:bg-leaf-400 group-hover:text-humus-950",
                        )}
                      >
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                    <p
                      className={cn(
                        "relative mt-6 text-sm",
                        i % 5 === 0 ? "text-paper/65" : "text-ink-faint",
                      )}
                    >
                      {crop.productCount} listed product{crop.productCount === 1 ? "" : "s"} · growth-stage
                      guidance · FAQs
                    </p>
                  </Link>
                </RevealItem>
              ))}
          </RevealGroup>
        )}

        {groups.length > 0 && (
          <div className="mt-12">
            <h2 className="text-eyebrow text-ink-faint">Also referenced in product guidance</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {groups.map((crop) => (
                <Link
                  key={crop.slug}
                  href={`/crops/${crop.slug}`}
                  className="rounded-full border border-line bg-cream px-4 py-2 text-sm text-ink-soft capitalize transition-colors hover:border-leaf-600 hover:text-ink"
                >
                  {crop.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
