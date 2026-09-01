import Image from "next/image";
import { ArrowDown, ArrowUp, BookOpen, ExternalLink, Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { StatusPill } from "@/components/admin/status-pill";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import {
  addCatalogueEntry,
  moveCatalogueEntry,
  removeCatalogueEntry,
  saveCatalogueMeta,
  saveCatalogueSection,
  setCatalogueEntryLayout,
} from "@/server/actions/admin/misc";

export const metadata = { title: "Catalogue — admin" };

const THEMES = ["soil", "biology", "vitality", "nutrition"];

export default async function AdminCataloguePage() {
  const catalogue = await db.catalogue.findFirst({
    orderBy: { updatedAt: "desc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          entries: {
            orderBy: { order: "asc" },
            include: { product: { include: { primaryImage: true } } },
          },
        },
      },
    },
  });
  const products = await db.product.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (!catalogue) {
    return (
      <>
        <AdminPageHeader title="Catalogue" />
        <EmptyState
          icon={BookOpen}
          title="No catalogue exists yet"
          description="Run the content import (npm run db:seed) to generate the default catalogue from your categories."
        />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Catalogue"
        description="Chapters and product spreads for explore mode and the flipbook."
        actions={
          <>
            <StatusPill status={catalogue.status} />
            <Link
              href="/catalogue"
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink/30"
            >
              <ExternalLink className="size-3.5" /> Preview
            </Link>
            <ActionDialog
              title="Catalogue settings"
              action={saveCatalogueMeta}
              trigger={
                <Button size="sm" variant="outline">
                  <Pencil className="size-3.5" /> Edit details
                </Button>
              }
            >
              <input type="hidden" name="id" value={catalogue.id} />
              <Field label="Title" required>
                <Input name="title" defaultValue={catalogue.title} required />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Year">
                  <Input name="year" type="number" defaultValue={catalogue.year ?? ""} />
                </Field>
                <Field label="Status">
                  <NativeSelect name="status" defaultValue={catalogue.status}>
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </NativeSelect>
                </Field>
              </div>
              <Field label="Intro">
                <Textarea name="intro" rows={2} defaultValue={catalogue.intro ?? ""} />
              </Field>
            </ActionDialog>
          </>
        }
      />

      <div className="space-y-6">
        {catalogue.sections.map((section, index) => (
          <section key={section.id} className="rounded-3xl border border-line bg-cream">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="text-eyebrow text-[0.6rem] text-ink-faint">
                  Chapter {String(index + 1).padStart(2, "0")} · theme: {section.theme}
                </p>
                <h2 className="font-display text-lg font-semibold text-ink">{section.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <ActionDialog
                  title={`Edit chapter — ${section.title}`}
                  action={saveCatalogueSection}
                  trigger={
                    <button
                      type="button"
                      aria-label="Edit chapter"
                      className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                  }
                >
                  <input type="hidden" name="id" value={section.id} />
                  <Field label="Title" required>
                    <Input name="title" defaultValue={section.title} required />
                  </Field>
                  <Field label="Theme">
                    <NativeSelect name="theme" defaultValue={section.theme ?? "soil"}>
                      {THEMES.map((theme) => (
                        <option key={theme} value={theme}>
                          {theme}
                        </option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field label="Intro">
                    <Textarea name="intro" rows={2} defaultValue={section.intro ?? ""} />
                  </Field>
                </ActionDialog>
              </div>
            </header>

            <ul className="divide-y divide-line">
              {section.entries.map((entry, entryIndex) => (
                <li key={entry.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-6 text-xs text-ink-faint">{entryIndex + 1}</span>
                  {entry.product?.primaryImage && (
                    <span className="relative block h-10 w-8 shrink-0 overflow-hidden rounded-md bg-paper-dim">
                      <Image
                        src={entry.product.primaryImage.url}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {entry.product?.name ?? entry.headline ?? "—"}
                  </span>
                  <form
                    action={async (formData: FormData) => {
                      "use server";
                      await setCatalogueEntryLayout(entry.id, String(formData.get("layout")));
                    }}
                  >
                    <select
                      name="layout"
                      defaultValue={entry.layout}
                      className="rounded-lg border border-line bg-paper px-2 py-1 text-xs text-ink-soft"
                    >
                      <option value="FEATURE_LEFT">Feature left</option>
                      <option value="FEATURE_RIGHT">Feature right</option>
                      <option value="FULL_IMAGE">Full image</option>
                      <option value="GRID">Grid</option>
                    </select>
                    <button
                      type="submit"
                      className="ml-1.5 text-xs font-medium text-leaf-700 hover:underline"
                    >
                      Set
                    </button>
                  </form>
                  <div className="flex items-center gap-0.5">
                    <form
                      action={async () => {
                        "use server";
                        await moveCatalogueEntry(entry.id, "up");
                      }}
                    >
                      <button
                        type="submit"
                        aria-label="Move up"
                        className="flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await moveCatalogueEntry(entry.id, "down");
                      }}
                    >
                      <button
                        type="submit"
                        aria-label="Move down"
                        className="flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await removeCatalogueEntry(entry.id);
                      }}
                    >
                      <button
                        type="submit"
                        aria-label="Remove from catalogue"
                        className="flex size-7 items-center justify-center rounded-full text-ink-faint hover:bg-danger/10 hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-line px-5 py-3">
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const productId = String(formData.get("productId"));
                  if (productId) await addCatalogueEntry(section.id, productId);
                }}
                className="flex items-center gap-2"
              >
                <select
                  name="productId"
                  className="h-9 rounded-lg border border-line bg-paper px-2 text-sm text-ink-soft"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Add a product to this chapter…
                  </option>
                  {products
                    .filter(
                      (product) => !section.entries.some((entry) => entry.productId === product.id),
                    )
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  className="flex h-9 items-center gap-1.5 rounded-full bg-humus-900 px-4 text-xs font-medium text-paper hover:bg-humus-700"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </form>
            </footer>
          </section>
        ))}
      </div>
    </>
  );
}
