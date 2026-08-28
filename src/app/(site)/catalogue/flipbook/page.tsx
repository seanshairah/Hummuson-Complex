import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen } from "lucide-react";
import { Flipbook } from "@/components/catalogue/flipbook";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getPublishedCatalogue } from "@/server/data/catalogue";
import { buildCataloguePages } from "@/lib/catalogue-pages";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Catalogue flipbook",
  description:
    "Flip through the Humuson Complex product guide page by page — spread view on desktop, swipe on mobile.",
  alternates: { canonical: "/catalogue/flipbook" },
};

export default async function FlipbookPage() {
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

  const pages = buildCataloguePages(catalogue);

  return (
    <Suspense>
      <Flipbook pages={pages} pdfUrl={catalogue.pdfUrl} />
    </Suspense>
  );
}
