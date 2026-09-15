"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { saveArticle } from "@/server/actions/admin/articles";
import { idle, type AdminActionState } from "@/lib/admin-state";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { RichEditor } from "@/components/admin/rich-editor";
import { ListInput } from "@/components/admin/list-input";
import { CheckGroup } from "@/components/admin/check-group";
import { MediaPicker, type MediaOption } from "@/components/admin/media-picker";

export interface ArticleFormInitial {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string | null;
  bodyHtml?: string;
  status?: string;
  featured?: boolean;
  categoryId?: string | null;
  tags?: string[];
  coverImageId?: string | null;
  productIds?: string[];
  cropIds?: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  scheduledAt?: string | null;
}

export function ArticleForm({
  initial,
  categories,
  products,
  crops,
  media,
}: {
  initial: ArticleFormInitial;
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
  crops: { id: string; name: string }[];
  media: MediaOption[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    saveArticle,
    idle,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && state.createdId) {
      router.replace(`/admin/articles/${state.createdId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="min-w-0 space-y-6">
        <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
          <Field label="Title" required error={state.fieldErrors?.title}>
            <Input name="title" defaultValue={initial.title} required />
          </Field>
          <Field label="Excerpt" hint="Editorial standfirst shown on cards and under the title">
            <Textarea name="excerpt" rows={2} defaultValue={initial.excerpt ?? ""} />
          </Field>
          <Field label="Body" required error={state.fieldErrors?.bodyHtml}>
            <RichEditor
              name="bodyHtml"
              initialHtml={initial.bodyHtml ?? ""}
              placeholder="Write the article…"
              minHeight="22rem"
            />
          </Field>
        </div>
        <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Connections</h2>
          <Field label="Products mentioned">
            <CheckGroup name="productIds" options={products} selected={initial.productIds ?? []} />
          </Field>
          <Field label="Crops covered">
            <CheckGroup name="cropIds" options={crops} selected={initial.cropIds ?? []} />
          </Field>
        </div>
        <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
          <h2 className="font-display text-lg font-semibold text-ink">SEO</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="SEO title">
              <Input name="seoTitle" defaultValue={initial.seoTitle ?? ""} />
            </Field>
            <Field label="SEO description">
              <Input name="seoDescription" defaultValue={initial.seoDescription ?? ""} />
            </Field>
          </div>
        </div>
      </div>

      <aside className="space-y-5 rounded-3xl border border-line bg-cream p-6 xl:sticky xl:top-8">
        <Field label="Status">
          <NativeSelect name="status" defaultValue={initial.status ?? "DRAFT"}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </NativeSelect>
        </Field>
        <Field label="Schedule" hint="Optional publish date used when status is Draft">
          <Input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={initial.scheduledAt ?? ""}
          />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={initial.featured}
            className="size-4 accent-leaf-600"
          />
          Featured article
        </label>
        <Field label="Slug" hint="Blank = derived from title" error={state.fieldErrors?.slug}>
          <Input name="slug" defaultValue={initial.slug} />
        </Field>
        <Field label="Category">
          <NativeSelect name="categoryId" defaultValue={initial.categoryId ?? ""}>
            <option value="">— None —</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Cover image">
          <MediaPicker
            media={media}
            initialIds={initial.coverImageId ? [initial.coverImageId] : []}
            max={1}
            label="Cover"
          />
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
          Save article
        </Button>
      </aside>
    </form>
  );
}
