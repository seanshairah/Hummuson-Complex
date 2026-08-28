"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { saveCompanySettings, saveContactSettings } from "@/server/actions/admin/misc";
import { idle, type AdminActionState } from "@/lib/admin-state";
import type { CompanySettings, ContactSettings } from "@/server/data/settings";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/skeleton";
import { ListInput } from "@/components/admin/list-input";

function Feedback({ state }: { state: AdminActionState }) {
  if (state.status === "success") {
    return (
      <p
        role="status"
        className="rounded-xl bg-leaf-300/40 px-4 py-2.5 text-sm font-medium text-leaf-800"
      >
        {state.message}
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p
        role="alert"
        className="rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger"
      >
        {state.message ?? "Something went wrong."}
      </p>
    );
  }
  return null;
}

export function ContactSettingsForm({ contact }: { contact: ContactSettings }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    saveContactSettings,
    idle,
  );
  return (
    <form action={formAction} className="space-y-5 rounded-3xl border border-line bg-cream p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Contact details</h2>
      <Field label="Phone numbers">
        <ListInput
          name="phones"
          initial={contact.phones}
          placeholder="+263 …"
          addLabel="Add phone"
        />
      </Field>
      <Field
        label="WhatsApp number"
        hint="International format, digits only — powers every WhatsApp action"
      >
        <Input name="whatsapp" defaultValue={contact.whatsapp} />
      </Field>
      <Field label="Email addresses">
        <ListInput
          name="emails"
          initial={contact.emails}
          placeholder="info@…"
          addLabel="Add email"
        />
      </Field>
      <Field label="Address">
        <Input name="address" defaultValue={contact.address ?? ""} />
      </Field>
      <Field label="Opening hours">
        <Input name="hours" defaultValue={contact.hours ?? ""} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        {(["facebook", "instagram", "youtube", "linkedin", "twitter", "tiktok"] as const).map(
          (key) => (
            <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
              <Input name={key} defaultValue={contact.socials[key] ?? ""} placeholder="https://…" />
            </Field>
          ),
        )}
      </div>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
        Save contact details
      </Button>
    </form>
  );
}

export function CompanySettingsForm({ company }: { company: CompanySettings }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    saveCompanySettings,
    idle,
  );
  return (
    <form action={formAction} className="space-y-5 rounded-3xl border border-line bg-cream p-6">
      <h2 className="font-display text-lg font-semibold text-ink">Company</h2>
      <Field label="Tagline">
        <Input name="tagline" defaultValue={company.tagline} />
      </Field>
      <Field label="Short about" hint="One paragraph used in footers and previews">
        <Textarea name="shortAbout" rows={2} defaultValue={company.shortAbout} />
      </Field>
      <Field
        label="About (full)"
        hint="Paragraphs separated by a blank line; 'Our Vision:'/'Our Mission:' lines are highlighted on the About page"
      >
        <Textarea name="about" rows={8} defaultValue={company.about} />
      </Field>
      <Field label="Why choose us" hint="Real published claims only">
        <ListInput name="whyChooseUs" initial={company.whyChooseUs} addLabel="Add point" />
      </Field>
      <Field label="Services">
        <ListInput
          name="services"
          initial={company.services.map((service) => service.title)}
          addLabel="Add service"
        />
      </Field>
      <Feedback state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner className="size-4" /> : <Save className="size-4" />}
        Save company
      </Button>
    </form>
  );
}
