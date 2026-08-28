"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { saveFaq } from "@/server/actions/admin/faqs";
import { idle, type AdminActionState } from "@/lib/admin-state";
import { Field, Input, NativeSelect } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { RichEditor } from "@/components/admin/rich-editor";
import { ListInput } from "@/components/admin/list-input";
import { CheckGroup } from "@/components/admin/check-group";

const CATEGORIES = [
  "GENERAL",
  "APPLICATION",
  "DOSAGE",
  "COMPATIBILITY",
  "CROPS",
  "BENEFITS",
  "STORAGE",
  "AVAILABILITY",
  "ORDERING",
  "PACKAGES",
];

export interface FaqFormInitial {
  id?: string;
  question?: string;
  answerHtml?: string;
  category?: string;
  published?: boolean;
  aliases?: string[];
  keywords?: string[];
  productId?: string | null;
  cropIds?: string[];
}

export function FaqForm({
  initial,
  products,
  crops,
}: {
  initial: FaqFormInitial;
  products: { id: string; name: string }[];
  crops: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(saveFaq, idle);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success" && state.createdId) {
      router.replace(`/admin/faqs/${state.createdId}`);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid items-start gap-6 xl:grid-cols-[1fr_300px]">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-5 rounded-3xl border border-line bg-cream p-6">
        <Field label="Question" required error={state.fieldErrors?.question}>
          <Input name="question" defaultValue={initial.question} required />
        </Field>
        <Field label="Answer" required error={state.fieldErrors?.answerHtml}>
          <RichEditor
            name="answerHtml"
            initialHtml={initial.answerHtml ?? ""}
            placeholder="The verified answer…"
            minHeight="9rem"
          />
        </Field>
        <Field
          label="Aliases"
          hint="Alternative phrasings the retrieval engine should match (e.g. “IN5 instructions”, “when do I spray IN5?”)"
        >
          <ListInput
            name="aliases"
            initial={initial.aliases}
            placeholder="Alternative phrasing"
            addLabel="Add alias"
          />
        </Field>
        <Field label="Keywords">
          <ListInput
            name="keywords"
            initial={initial.keywords}
            placeholder="keyword"
            addLabel="Add keyword"
          />
        </Field>
        <Field label="Related crops">
          <CheckGroup name="cropIds" options={crops} selected={initial.cropIds ?? []} />
        </Field>
      </div>

      <aside className="space-y-5 rounded-3xl border border-line bg-cream p-6 xl:sticky xl:top-8">
        <Field label="Category">
          <NativeSelect name="category" defaultValue={initial.category ?? "GENERAL"}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0) + category.slice(1).toLowerCase()}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="About product" hint="Optional — anchors the FAQ to a product page">
          <NativeSelect name="productId" defaultValue={initial.productId ?? ""}>
            <option value="">— None —</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial.published ?? true}
            className="size-4 accent-leaf-600"
          />
          Published
        </label>
        {state.status === "error" && (
          <p
            role="alert"
            className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
          >
            {state.message ?? "Please fix the errors."}
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
          Save FAQ
        </Button>
      </aside>
    </form>
  );
}
