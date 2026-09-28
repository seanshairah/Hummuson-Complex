import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedFlipbook } from "@/server/flipbook/load";
import { resolveDesign } from "@/lib/flipbook/resolve";
import { PrintSheet } from "@/components/catalogue/print-sheet";

export const metadata: Metadata = {
  title: "Catalogue print view",
  robots: { index: false, follow: false },
};

/** The flipbook one page per sheet, for printing from the browser. */
export default async function CataloguePrintPage() {
  const flipbook = await loadPublishedFlipbook();
  if (!flipbook) notFound();
  const pages = resolveDesign(flipbook.design, flipbook.context, { pad: true });
  return <PrintSheet pages={pages} />;
}
