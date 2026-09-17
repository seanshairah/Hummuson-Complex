import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Wheat } from "lucide-react";
import { PageIntro } from "@/components/shared/page-intro";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { RevealGroup, RevealItem } from "@/components/motion/reveal";
import { getCropTree } from "@/server/data/crops";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Crops — guidance by what you grow",
  description:
    "Cereals, brassicas, cucurbits, legumes, fruit crops and more — see which Humuson Complex products are listed for your crop, stage by stage.",
  alternates: { canonical: "/crops" },
};

export default async function CropsPage() {
  // The tree, not a flat run of 29 equal tiles: one card per group, the
  // individual crops inside it. A group with no listed product anywhere drops
  // to the strip at the foot of the page rather than taking a card that leads
  // to nothing.
  const tree = await getCropTree();
  const covered = tree.filter((group) => group.productCount > 0 || group.children.length > 0);
  const listed = covered.filter(
    (group) => group.productCount > 0 || group.children.some((c) => c.productCount > 0),
  );
  const awaiting = tree.filter((group) => !listed.includes(group));

  return (
    <>
      <PageIntro
        eyebrow="Guidance by crop"
        title="Start from what you"
        titleAccent="grow"
        lede="Crops are grouped the way you plant them. Open a group for everything listed across it, or go straight to the single crop — each page shows the Humuson products listed for it, the growth stages they reference, and the questions farmers ask."
        crumbs={[{ label: "Crops" }]}
      />
      <section className="container-site pb-20">
        {listed.length === 0 ? (
          <EmptyState
            icon={Wheat}
            title="Crop guidance is being prepared"
            description="Ask a Humuson adviser what fits your crop in the meantime."
            action={<ButtonLink href="/contact">Request advice</ButtonLink>}
          />
        ) : (
          <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {listed.map((group, i) => {
              const dark = i % 5 === 0;
              const children = group.children.filter((child) => child.productCount > 0);
              return (
                <RevealItem key={group.slug}>
                  <div
                    className={cn(
                      "relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-shadow duration-300 hover:shadow-pop",
                      dark
                        ? "bg-grain bg-humus-950 text-paper"
                        : "border border-line bg-cream text-ink shadow-card",
                    )}
                  >
                    {dark && <span aria-hidden className="absolute inset-0 glow-leaf" />}
                    <Link
                      href={`/crops/${group.slug}`}
                      className="group relative flex items-start justify-between gap-3"
                    >
                      <span className="min-w-0">
                        {group.familyName && (
                          <span
                            className={cn(
                              "text-eyebrow block",
                              dark ? "text-leaf-400" : "text-leaf-700",
                            )}
                          >
                            {group.familyName}
                          </span>
                        )}
                        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight break-words capitalize">
                          {group.name}
                        </h2>
                        <span
                          className={cn(
                            "mt-1.5 block text-sm",
                            dark ? "text-paper/65" : "text-ink-faint",
                          )}
                        >
                          {group.productCount} listed product{group.productCount === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-all",
                          dark
                            ? "border-paper/25 text-paper group-hover:bg-leaf-400 group-hover:text-humus-950"
                            : "border-line text-ink-faint group-hover:border-leaf-600 group-hover:bg-leaf-400 group-hover:text-humus-950",
                        )}
                      >
                        <ArrowUpRight className="size-4" />
                      </span>
                    </Link>

                    {group.signature && (
                      <p
                        className={cn(
                          "relative mt-4 text-sm italic",
                          dark ? "text-paper/70" : "text-ink-soft",
                        )}
                      >
                        {group.signature}
                      </p>
                    )}

                    {children.length > 0 && (
                      <ul
                        className={cn(
                          "relative mt-5 flex flex-wrap gap-1.5 border-t pt-4",
                          dark ? "border-paper/15" : "border-line",
                        )}
                      >
                        {children.map((child) => (
                          <li key={child.slug}>
                            <Link
                              href={`/crops/${child.slug}`}
                              className={cn(
                                "block rounded-full border px-3 py-1.5 text-xs capitalize transition-colors",
                                dark
                                  ? "border-paper/20 text-paper/75 hover:border-leaf-400 hover:text-paper"
                                  : "border-line text-ink-soft hover:border-leaf-600 hover:text-ink",
                              )}
                            >
                              {child.name}
                              <span className="ml-1.5 opacity-55">{child.productCount}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}

                    {group.alsoIncludes.length > 0 && (
                      <p
                        className={cn(
                          "relative mt-3 text-xs leading-relaxed",
                          dark ? "text-paper/55" : "text-ink-faint",
                        )}
                      >
                        Also in this family: {group.alsoIncludes.join(", ")}.
                      </p>
                    )}
                  </div>
                </RevealItem>
              );
            })}
          </RevealGroup>
        )}

        {awaiting.length > 0 && (
          <div className="mt-12">
            <h2 className="text-eyebrow text-ink-faint">Other crops we supply</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-faint">
              No product lists these by name in its published guidance yet, so there is nothing to
              show automatically. Ask an adviser what fits.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {awaiting.map((crop) => (
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
