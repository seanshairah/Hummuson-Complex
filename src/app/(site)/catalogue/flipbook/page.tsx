import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { Flipbook } from "@/components/catalogue/flipbook";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { loadPublishedFlipbook } from "@/server/flipbook/load";
import { resolveDesign } from "@/lib/flipbook/resolve";
import { flipbookDownloads } from "@/lib/flipbook/downloads";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catalogue flipbook",
  description:
    "Flip through the Humuson Complex product guide page by page — spread view on desktop, swipe on mobile.",
  alternates: { canonical: "/catalogue/flipbook" },
};

export default async function FlipbookPage() {
  const flipbook = await loadPublishedFlipbook();

  if (!flipbook) {
    return (
      <div className="container-site pt-24 md:pt-28 lg:pt-32 section-pb-loose">
        <EmptyState
          icon={BookOpen}
          title="The catalogue is being prepared"
          description="Browse the full product range while we finish the publication."
          action={<ButtonLink href="/products">View all products</ButtonLink>}
        />
      </div>
    );
  }

  const pages = resolveDesign(flipbook.design, flipbook.context, { pad: true });

  return (
    <Suspense>
      <Flipbook pages={pages} title={flipbook.title} downloads={flipbookDownloads(flipbook.hash)} />
    </Suspense>
  );
}
