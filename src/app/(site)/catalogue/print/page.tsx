import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCatalogue } from "@/server/data/catalogue";
import { buildCataloguePages } from "@/lib/catalogue-pages";
import { PrintSheet } from "@/components/catalogue/print-sheet";

export const metadata: Metadata = {
  title: "Catalogue print view",
  robots: { index: false, follow: false },
};

/** Print-optimised page sequence consumed by scripts/generate-catalogue-pdf.ts. */
export default async function CataloguePrintPage() {
  const catalogue = await getPublishedCatalogue();
  if (!catalogue) notFound();
  const pages = buildCataloguePages(catalogue);
  return <PrintSheet pages={pages} />;
}
