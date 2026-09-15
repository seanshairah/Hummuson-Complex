import { Pencil, Plus, Quote } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteTestimonial, saveTestimonial } from "@/server/actions/admin/content";

export const metadata = { title: "Testimonials — admin" };

export default async function AdminTestimonialsPage() {
  const testimonials = await db.testimonial.findMany({ orderBy: { order: "asc" } });

  const fields = (testimonial?: (typeof testimonials)[number]) => (
    <>
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required>
          <Input name="name" defaultValue={testimonial?.name} required />
        </Field>
        <Field label="Role">
          <Input name="role" defaultValue={testimonial?.role ?? ""} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Location">
          <Input name="location" defaultValue={testimonial?.location ?? ""} />
        </Field>
        <Field label="Status">
          <NativeSelect name="status" defaultValue={testimonial?.status ?? "PUBLISHED"}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </NativeSelect>
        </Field>
      </div>
      <Field label="Quote" required hint="Exactly as the customer said it">
        <Textarea name="quote" rows={4} defaultValue={testimonial?.quote} required />
      </Field>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        description="Customer reviews shown on the results page and homepage."
        actions={
          <ActionDialog
            title="New testimonial"
            action={saveTestimonial}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New testimonial
              </Button>
            }
          >
            {fields()}
          </ActionDialog>
        }
      />
      {testimonials.length === 0 ? (
        <EmptyState icon={Quote} title="No testimonials yet" />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Quote</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {testimonials.map((testimonial) => (
              <Tr key={testimonial.id}>
                <Td>
                  <span className="font-medium text-ink">{testimonial.name}</span>
                  {testimonial.location && (
                    <span className="block text-xs text-ink-faint">{testimonial.location}</span>
                  )}
                </Td>
                <Td className="max-w-md">
                  <span className="line-clamp-2">{testimonial.quote}</span>
                </Td>
                <Td>
                  <StatusPill status={testimonial.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <ActionDialog
                      title={`Edit testimonial`}
                      action={saveTestimonial}
                      trigger={
                        <button
                          type="button"
                          aria-label="Edit"
                          className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      }
                    >
                      {fields(testimonial)}
                    </ActionDialog>
                    <ConfirmButton
                      title={`Delete ${testimonial.name}'s testimonial?`}
                      label=""
                      action={async () => {
                        "use server";
                        await deleteTestimonial(testimonial.id);
                      }}
                    />
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
