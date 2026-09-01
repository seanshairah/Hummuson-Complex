"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { saveProduct } from "@/server/actions/admin/products";
import { idle, type AdminActionState } from "@/lib/admin-state";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { RichEditor } from "@/components/admin/rich-editor";
import { ListInput, PairedListInput } from "@/components/admin/list-input";
import { MediaPicker, type MediaOption } from "@/components/admin/media-picker";
import { humanize } from "@/lib/utils";

const METHODS = [
  "FOLIAR",
  "SOIL",
  "SEED_TREATMENT",
  "TOP_DRESSING",
  "BASAL_DRESSING",
  "FERTIGATION",
  "DRENCH",
  "OTHER",
];

export interface ProductFormOptions {
  categories: { id: string; name: string }[];
  crops: { id: string; name: string }[];
  benefits: { id: string; name: string }[];
  stages: { id: string; name: string }[];
  media: MediaOption[];
  products: { id: string; name: string }[];
}

export interface ProductFormInitial {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  featured?: boolean;
  tagline?: string | null;
  shortDescription?: string | null;
  descriptionHtml?: string | null;
  operatingPrinciple?: string | null;
  instructionsHtml?: string | null;
  composition?: string[];
  benefitClaims?: string[];
  priceUsd?: string | null;
  whatsappRef?: string | null;
  categoryId?: string | null;
  tags?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  methods?: string[];
  cropIds?: string[];
  benefitIds?: string[];
  stageIds?: string[];
  relatedIds?: string[];
  galleryIds?: string[];
  packSizes?: string[][];
  guides?: string[][];
}

function CheckGroup({
  name,
  options,
  selected,
  columns = "grid-cols-2 md:grid-cols-3",
}: {
  name: string;
  options: { id: string; name: string }[];
  selected: string[];
  columns?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${columns}`}>
      {options.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink-soft transition-colors has-checked:border-leaf-600 has-checked:bg-leaf-300/25 has-checked:text-ink"
        >
          <input
            type="checkbox"
            name={name}
            value={option.id}
            defaultChecked={selected.includes(option.id)}
            className="size-4 accent-leaf-600"
          />
          <span className="capitalize">{option.name}</span>
        </label>
      ))}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-cream p-6">
      <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function ProductForm({
  initial,
  options,
}: {
  initial: ProductFormInitial;
  options: ProductFormOptions;
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    saveProduct,
    idle,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && state.createdId) {
      router.replace(`/admin/products/${state.createdId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <div className="min-w-0 space-y-6">
        <Section title="Identity">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Product name" required error={state.fieldErrors?.name}>
              <Input name="name" defaultValue={initial.name} required />
            </Field>
            <Field
              label="Slug"
              hint="Leave blank to derive from the name"
              error={state.fieldErrors?.slug}
            >
              <Input name="slug" defaultValue={initial.slug} placeholder="auto" />
            </Field>
          </div>
          <Field label="Tagline" hint="Short strapline shown under the name (optional)">
            <Input name="tagline" defaultValue={initial.tagline ?? ""} />
          </Field>
          <Field
            label="Short description"
            hint="1–2 sentences used on cards and search"
            error={state.fieldErrors?.shortDescription}
          >
            <Textarea
              name="shortDescription"
              rows={2}
              defaultValue={initial.shortDescription ?? ""}
            />
          </Field>
          <Field label="Full description">
            <RichEditor
              name="descriptionHtml"
              initialHtml={initial.descriptionHtml ?? ""}
              placeholder="The product's published description…"
            />
          </Field>
        </Section>

        <Section
          title="Agronomy"
          hint="Only enter published, verified information — the public site tells farmers to confirm anything missing with technical support."
        >
          <Field
            label="Composition"
            hint="One active ingredient / strain per row, exactly as published"
          >
            <ListInput
              name="composition"
              initial={initial.composition}
              placeholder="e.g. Phosphorus (P2O5): 30.0%"
              addLabel="Add ingredient"
            />
          </Field>
          <Field label="Benefit claims" hint="Verbatim claims from the product's documentation">
            <ListInput
              name="benefitClaims"
              initial={initial.benefitClaims}
              placeholder="e.g. Improves germination"
              addLabel="Add claim"
            />
          </Field>
          <Field label="How it works (operating principle)">
            <Textarea
              name="operatingPrinciple"
              rows={3}
              defaultValue={initial.operatingPrinciple ?? ""}
            />
          </Field>
          <Field label="How to apply (instructions)">
            <RichEditor
              name="instructionsHtml"
              initialHtml={initial.instructionsHtml ?? ""}
              placeholder="Step-by-step application instructions…"
              minHeight="8rem"
            />
          </Field>
          <Field
            label="Application rates"
            hint="Rate + basis (e.g. per Ha / per 20L knapsack) + notes"
          >
            <PairedListInput
              columns={[
                { name: "guide.rate", placeholder: "1L – 3L", width: "w-32" },
                { name: "guide.unit", placeholder: "per Ha", width: "w-36" },
                { name: "guide.notes", placeholder: "Notes (crop, timing…)" },
              ]}
              initial={initial.guides}
              addLabel="Add rate"
            />
          </Field>
          <Field label="Application methods">
            <CheckGroup
              name="methods"
              options={METHODS.map((m) => ({ id: m, name: humanize(m) }))}
              selected={initial.methods ?? []}
              columns="grid-cols-2 md:grid-cols-4"
            />
          </Field>
          <Field label="Suitable crops">
            <CheckGroup name="cropIds" options={options.crops} selected={initial.cropIds ?? []} />
          </Field>
          <Field label="Canonical benefits (filters & finder)">
            <CheckGroup
              name="benefitIds"
              options={options.benefits}
              selected={initial.benefitIds ?? []}
            />
          </Field>
          <Field label="Growth stages referenced">
            <CheckGroup
              name="stageIds"
              options={options.stages}
              selected={initial.stageIds ?? []}
            />
          </Field>
        </Section>

        <Section title="Commerce">
          <Field
            label="Package sizes"
            hint="Size + price in USD (leave price empty if unpublished)"
          >
            <PairedListInput
              columns={[
                { name: "packSize.size", placeholder: "5L" },
                { name: "packSize.price", placeholder: "54.00", width: "w-32", type: "number" },
              ]}
              initial={initial.packSizes}
              addLabel="Add pack size"
            />
          </Field>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Base price (USD)" hint="Used when no per-pack price applies">
              <Input
                name="priceUsd"
                type="number"
                step="0.01"
                defaultValue={initial.priceUsd ?? ""}
              />
            </Field>
            <Field
              label="WhatsApp catalogue reference"
              hint="Item id or link in the WhatsApp Business catalogue"
            >
              <Input name="whatsappRef" defaultValue={initial.whatsappRef ?? ""} />
            </Field>
          </div>
        </Section>

        <Section title="SEO">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="SEO title">
              <Input name="seoTitle" defaultValue={initial.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description">
              <Input name="seoDescription" defaultValue={initial.seoDescription ?? ""} />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-6 xl:sticky xl:top-8">
        <Section title="Publish">
          <Field label="Status">
            <NativeSelect name="status" defaultValue={initial.status ?? "DRAFT"}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </NativeSelect>
          </Field>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={initial.featured}
              className="size-4 accent-leaf-600"
            />
            Featured (homepage & spotlight)
          </label>
          <Field label="Category">
            <NativeSelect name="categoryId" defaultValue={initial.categoryId ?? ""}>
              <option value="">— None —</option>
              {options.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Tags">
            <ListInput name="tags" initial={initial.tags} placeholder="tag" addLabel="Add tag" />
          </Field>

          {state.status === "error" && (
            <p
              role="alert"
              className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
            >
              {state.message}
            </p>
          )}
          {state.status === "success" && (
            <p
              role="status"
              className="rounded-xl bg-leaf-300/40 px-4 py-2.5 text-sm font-medium text-leaf-800"
            >
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
            {pending ? "Saving…" : "Save product"}
          </Button>
        </Section>

        <Section title="Images" hint="First image is the primary pack shot.">
          <MediaPicker media={options.media} initialIds={initial.galleryIds} />
        </Section>

        <Section title="Related products">
          <CheckGroup
            name="relatedIds"
            options={options.products.filter((product) => product.id !== initial.id)}
            selected={initial.relatedIds ?? []}
            columns="grid-cols-1"
          />
        </Section>
      </aside>
    </form>
  );
}
