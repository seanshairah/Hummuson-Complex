import { BookOpen } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FlipbookDesigner } from "@/components/admin/flipbook/designer";
import type { LibraryItem } from "@/components/admin/flipbook/media-dialog";
import { db } from "@/server/db";
import { loadDraftFlipbook } from "@/server/flipbook/load";

export const metadata = { title: "Flipbook designer — admin" };
export const dynamic = "force-dynamic";

/**
 * The flipbook designer: lay out every page of the catalogue, preview it as
 * a book, download it as PDF or HTML, and publish it to the site.
 */
export default async function AdminFlipbookPage() {
  const flipbook = await loadDraftFlipbook();

  if (!flipbook) {
    return (
      <>
        <AdminPageHeader title="Flipbook designer" />
        <EmptyState
          icon={BookOpen}
          title="No catalogue exists yet"
          description="Run the content import (npm run db:seed) to generate the catalogue from your ranges, then design its flipbook here."
        />
      </>
    );
  }

  const [catalogue, revisions, media] = await Promise.all([
    db.catalogue.findUnique({
      where: { id: flipbook.catalogueId },
      select: { designPublishedAt: true, draftUpdatedAt: true },
    }),
    db.catalogueRevision.findMany({
      where: { catalogueId: flipbook.catalogueId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, version: true, note: true, actorEmail: true, createdAt: true },
    }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 600,
      select: { id: true, url: true, alt: true, width: true, height: true, kind: true, filename: true },
    }),
  ]);

  const library: LibraryItem[] = media.map((item) => ({
    id: item.id,
    url: item.url,
    alt: item.alt,
    width: item.width,
    height: item.height,
    kind: item.kind,
    label: item.filename ?? item.url.split("/").pop() ?? item.url,
  }));

  const products = Object.values(flipbook.context.products)
    .map((product) => ({ id: product.id, name: product.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <FlipbookDesigner
      initialDesign={flipbook.design}
      source={flipbook.source}
      version={flipbook.version}
      hasPublished={flipbook.hasPublished}
      publishedAt={catalogue?.designPublishedAt?.toISOString() ?? null}
      draftSavedAt={catalogue?.draftUpdatedAt?.toISOString() ?? null}
      context={flipbook.context}
      products={products}
      library={library}
      revisions={revisions.map((revision) => ({
        ...revision,
        createdAt: revision.createdAt.toISOString(),
      }))}
      title={flipbook.title}
    />
  );
}
