"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { saveProject } from "@/server/actions/admin/content";
import { idle, type AdminActionState } from "@/lib/admin-state";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { RichEditor } from "@/components/admin/rich-editor";
import { CheckGroup } from "@/components/admin/check-group";
import { MediaPicker, type MediaOption } from "@/components/admin/media-picker";

export interface ProjectFormInitial {
  id?: string;
  title?: string;
  slug?: string;
  status?: string;
  cropId?: string | null;
  location?: string | null;
  summary?: string | null;
  problem?: string | null;
  application?: string | null;
  outcome?: string | null;
  bodyHtml?: string | null;
  testimonialId?: string | null;
  productIds?: string[];
  galleryIds?: string[];
}

export function ProjectForm({
  initial,
  crops,
  products,
  testimonials,
  media,
}: {
  initial: ProjectFormInitial;
  crops: { id: string; name: string }[];
  products: { id: string; name: string }[];
  testimonials: { id: string; name: string }[];
  media: MediaOption[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    saveProject,
    idle,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && state.createdId) {
      router.replace(`/admin/projects/${state.createdId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="min-w-0 space-y-6">
        <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Title" required error={state.fieldErrors?.title}>
              <Input name="title" defaultValue={initial.title} required />
            </Field>
            <Field label="Location">
              <Input
                name="location"
                defaultValue={initial.location ?? ""}
                placeholder="e.g. Chikombedzi"
              />
            </Field>
          </div>
          <Field label="Summary" hint="One or two sentences — shown on cards">
            <Textarea name="summary" rows={2} defaultValue={initial.summary ?? ""} />
          </Field>
          <Field label="The problem">
            <Textarea name="problem" rows={2} defaultValue={initial.problem ?? ""} />
          </Field>
          <Field label="Application" hint="What was applied, when and how">
            <Textarea name="application" rows={2} defaultValue={initial.application ?? ""} />
          </Field>
          <Field label="Outcome" hint="Only verified, published results — never estimates">
            <Textarea name="outcome" rows={2} defaultValue={initial.outcome ?? ""} />
          </Field>
          <Field label="Full write-up (optional)">
            <RichEditor name="bodyHtml" initialHtml={initial.bodyHtml ?? ""} minHeight="10rem" />
          </Field>
          <Field
            label="Images"
            hint="First image is the cover; before/after pairs read top-to-bottom"
          >
            <MediaPicker media={media} initialIds={initial.galleryIds} max={10} />
          </Field>
        </div>
        <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
          <Field label="Products used">
            <CheckGroup name="productIds" options={products} selected={initial.productIds ?? []} />
          </Field>
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
        <Field label="Crop">
          <NativeSelect name="cropId" defaultValue={initial.cropId ?? ""}>
            <option value="">— None —</option>
            {crops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Testimonial">
          <NativeSelect name="testimonialId" defaultValue={initial.testimonialId ?? ""}>
            <option value="">— None —</option>
            {testimonials.map((testimonial) => (
              <option key={testimonial.id} value={testimonial.id}>
                {testimonial.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Slug" hint="Blank = derived" error={state.fieldErrors?.slug}>
          <Input name="slug" defaultValue={initial.slug} />
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
          Save result
        </Button>
      </aside>
    </form>
  );
}
