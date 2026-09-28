"use client";

import { memo, useMemo, useState } from "react";
import { AlertTriangle, BookMarked, Copy, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { PageView } from "@/components/flipbook/page-view";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DESIGN_VERSION, type DesignPage, type FlipbookDesign } from "@/lib/flipbook/model";
import { resolveDesign, type FlipbookContext, type ResolvedPage } from "@/lib/flipbook/resolve";
import { TEMPLATES } from "@/lib/flipbook/templates";
import { cn } from "@/lib/utils";
import { IconButton } from "./controls";
import type { ProductOption } from "./inspector";

const Thumb = memo(
  function Thumb({ page }: { page: ResolvedPage; signature: string }) {
    return <PageView page={page} thumbnail />;
  },
  (a, b) => a.signature === b.signature,
);

export function PagesPanel({
  design,
  resolved,
  signatures,
  selectedId,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onToggleHidden,
  onAdd,
}: {
  design: FlipbookDesign;
  resolved: ResolvedPage[];
  signatures: string[];
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (from: number, to: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onAdd: () => void;
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <p className="text-eyebrow text-[0.62rem] text-ink-faint">Pages · {design.pages.length}</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-7 items-center gap-1 rounded-full bg-humus-900 px-2.5 text-xs font-medium text-paper hover:bg-humus-700"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </div>
      <ol
        data-lenis-prevent
        className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDropAt(null);
        }}
      >
        {design.pages.map((page, index) => {
          const shown = resolved[index];
          return (
            <li
              key={page.id}
              draggable
              onDragStart={(event) => {
                setDragFrom(index);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDropAt(null);
              }}
              onDragOver={(event) => {
                if (dragFrom === null) return;
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                setDropAt(event.clientY < rect.top + rect.height / 2 ? index : index + 1);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragFrom !== null && dropAt !== null) {
                  onMove(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
                }
                setDragFrom(null);
                setDropAt(null);
              }}
              className={cn(
                "group relative",
                dropAt === index && "before:absolute before:inset-x-0 before:-top-1.5 before:h-0.5 before:rounded before:bg-leaf-600",
                dropAt === index + 1 && index === design.pages.length - 1 && "after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:rounded after:bg-leaf-600",
                dragFrom === index && "opacity-40",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(page.id)}
                className={cn(
                  "flex w-full items-start gap-2 rounded-xl border-2 p-1.5 text-left transition-colors",
                  selectedId === page.id ? "border-leaf-600 bg-leaf-200/40" : "border-transparent hover:bg-paper-dim",
                )}
                aria-label={`Page ${index + 1}: ${page.name}`}
                aria-current={selectedId === page.id}
              >
                <span className="w-5 shrink-0 pt-0.5 text-right font-display text-[11px] font-semibold text-ink-faint">
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "relative block aspect-[3/4.1] w-full overflow-hidden rounded-md shadow-[0_1px_3px_rgb(0_0_0/0.18)] [content-visibility:auto]",
                    page.hidden && "opacity-40",
                  )}
                >
                  <span inert className="absolute inset-0">
                    {shown && <Thumb page={shown} signature={signatures[index] ?? ""} />}
                  </span>
                </span>
              </button>
              <div className="mt-0.5 flex items-center gap-1 pl-8">
                <p className="min-w-0 flex-1 truncate text-[11px] text-ink-soft" title={page.name}>
                  {page.chapter && <BookMarked className="mr-1 inline size-3 text-leaf-700" />}
                  {page.name}
                </p>
                {shown?.missing && <AlertTriangle className="size-3.5 shrink-0 text-danger" aria-label="Product no longer listed" />}
                {page.hidden && <EyeOff className="size-3.5 shrink-0 text-ink-faint" aria-label="Hidden" />}
              </div>
              <div className="absolute top-2 right-2 hidden items-center gap-0.5 rounded-lg bg-cream/95 p-0.5 shadow group-hover:flex group-focus-within:flex">
                <IconButton label="Duplicate page" onClick={() => onDuplicate(page.id)} className="size-6">
                  <Copy className="size-3.5" />
                </IconButton>
                <IconButton label={page.hidden ? "Show page" : "Hide page"} onClick={() => onToggleHidden(page.id)} className="size-6">
                  {page.hidden ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </IconButton>
                <IconButton label="Delete page" onClick={() => onDelete(page.id)} disabled={design.pages.length <= 1} className="size-6">
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Add a page ─────────────────────────────────────────────────────────── */

export function AddPageDialog({
  open,
  onOpenChange,
  context,
  products,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: FlipbookContext;
  products: ProductOption[];
  onAdd: (page: DesignPage) => void;
}) {
  const [chosen, setChosen] = useState<string | null>(null);
  const [picks, setPicks] = useState<(string | null)[]>([null, null, null, null]);
  const sample = products.slice(0, 4).map((p) => p.id);

  const previews = useMemo(() => {
    if (!open) return [];
    return TEMPLATES.map((template) => {
      const page = template.build(sample);
      const [resolved] = resolveDesign({ version: DESIGN_VERSION, pages: [page] }, context, { designer: true });
      return { template, resolved: resolved! };
    });
    // Previews only need rebuilding when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const template = TEMPLATES.find((t) => t.key === chosen) ?? null;
  const needs = template?.needsProduct ?? 0;

  const add = (key: string, ids: (string | null)[]) => {
    const t = TEMPLATES.find((item) => item.key === key);
    if (!t) return;
    onAdd(t.build(ids));
    setChosen(null);
    setPicks([null, null, null, null]);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        if (!value) setChosen(null);
      }}
    >
      <DialogContent
        title={template ? `Add: ${template.label}` : "Add a page"}
        description={
          template
            ? "Choose the product for each place on the page — you can change them later."
            : "Start from a layout. Everything on it can be moved, restyled or deleted."
        }
        className="max-w-4xl"
      >
        {!template && (
          <div data-lenis-prevent className="mt-4 grid max-h-[62dvh] grid-cols-2 gap-4 overflow-y-auto pr-1 sm:grid-cols-4">
            {previews.map(({ template: t, resolved }) => (
              <button
                key={t.key}
                type="button"
                aria-label={t.label}
                onClick={() => (t.needsProduct ? setChosen(t.key) : add(t.key, []))}
                className="group text-left"
              >
                <span className="relative block aspect-[3/4.1] overflow-hidden rounded-lg border border-line shadow-sm transition-all group-hover:border-leaf-600 group-hover:shadow-card">
                  <span inert className="pointer-events-none absolute inset-0">
                    <PageView page={resolved} thumbnail />
                  </span>
                </span>
                <span className="mt-1.5 block text-xs font-medium text-ink">{t.label}</span>
              </button>
            ))}
          </div>
        )}
        {template && (
          <div className="mt-4 space-y-3">
            {Array.from({ length: needs }, (_, i) => (
              <label key={i} className="block">
                <span className="mb-1 block text-xs text-ink-faint">
                  {needs === 1 ? "Product" : `Product ${i + 1}`}
                </span>
                <Combobox
                  label={`Product ${i + 1}`}
                  value={picks[i] ?? null}
                  onChange={(value) => setPicks((current) => current.map((v, j) => (j === i ? value || null : v)))}
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Choose a product"
                  searchPlaceholder="Search products…"
                />
              </label>
            ))}
            <div className="flex justify-between gap-2 pt-2">
              <button type="button" onClick={() => setChosen(null)} className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-ink/30">
                Back
              </button>
              <button
                type="button"
                onClick={() => add(template.key, picks.slice(0, needs))}
                className="rounded-full bg-humus-900 px-5 py-2 text-sm font-medium text-paper hover:bg-humus-700"
              >
                Add page
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
