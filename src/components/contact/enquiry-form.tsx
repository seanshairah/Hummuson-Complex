"use client";

import { useActionState } from "react";
import { CheckCircle2, SendHorizontal } from "lucide-react";
import { submitEnquiry, type EnquiryFormState } from "@/server/actions/enquiries";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";

const initialState: EnquiryFormState = { status: "idle" };

export function EnquiryForm({
  productSlug,
  productName,
  source = "CONTACT_FORM",
}: {
  productSlug?: string;
  productName?: string;
  source?: "CONTACT_FORM" | "PRODUCT_PAGE";
}) {
  const [state, formAction, pending] = useActionState(submitEnquiry, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-leaf-500/40 bg-leaf-300/20 px-6 py-14 text-center">
        <CheckCircle2 className="size-10 text-leaf-700" strokeWidth={1.6} />
        <h3 className="text-title mt-4 text-ink">Enquiry received</h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {productSlug && <input type="hidden" name="productSlug" value={productSlug} />}
      <input type="hidden" name="source" value={source} />
      {/* Honeypot */}
      <div className="hidden" aria-hidden>
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {productName && (
        <p className="rounded-xl bg-leaf-300/30 px-4 py-2.5 text-sm text-ink">
          Asking about <strong>{productName}</strong>
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" required error={state.fieldErrors?.name}>
          {(id) => <Input id={id} name="name" autoComplete="name" required />}
        </Field>
        <Field label="Phone / WhatsApp" hint="So an adviser can reach you" error={state.fieldErrors?.phone}>
          {(id) => <Input id={id} name="phone" type="tel" autoComplete="tel" />}
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" error={state.fieldErrors?.email}>
          {(id) => <Input id={id} name="email" type="email" autoComplete="email" />}
        </Field>
        <Field label="Subject" error={state.fieldErrors?.subject}>
          {(id) => <Input id={id} name="subject" placeholder="e.g. Maize program advice" />}
        </Field>
      </div>
      <Field label="Message" required error={state.fieldErrors?.message}>
        {(id) => (
          <Textarea
            id={id}
            name="message"
            rows={5}
            required
            placeholder="Tell us about your crop, area and what you need…"
          />
        )}
      </Field>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Spinner className="size-4" /> : <SendHorizontal className="size-4" />}
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}
