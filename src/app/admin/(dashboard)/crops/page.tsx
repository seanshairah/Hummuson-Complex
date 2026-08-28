import { Pencil, Plus, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { ListInput } from "@/components/admin/list-input";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { deleteCrop, saveCrop } from "@/server/actions/admin/content";
import { cn } from "@/lib/utils";

export const metadata = { title: "Crops — admin" };

export default async function AdminCropsPage() {
  const crops = await db.crop.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true, faqs: true } } },
  });

  const fields = (crop?: (typeof crops)[number]) => (
    <>
      {crop && <input type="hidden" name="id" value={crop.id} />}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name" required>
          <Input name="name" defaultValue={crop?.name} required />
        </Field>
        <Field label="Slug" hint="Blank = derived">
          <Input name="slug" defaultValue={crop?.slug} />
        </Field>
      </div>
      <Field label="Also known as" hint="Search aliases, e.g. mealies">
        <ListInput name="aka" initial={crop?.aka ?? []} placeholder="alias" addLabel="Add alias" />
      </Field>
      <Field label="Description" hint="Shown on the crop page intro">
        <Textarea name="description" rows={3} defaultValue={crop?.description ?? ""} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={crop?.featured}
          className="size-4 accent-leaf-600"
        />
        Featured crop
      </label>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Crops"
        description="Crops power the finder, filters, growth timelines and crop pages."
        actions={
          <ActionDialog
            title="New crop"
            action={saveCrop}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New crop
              </Button>
            }
          >
            {fields()}
          </ActionDialog>
        }
      />
      <Table>
        <THead>
          <Tr>
            <Th>Crop</Th>
            <Th>Aliases</Th>
            <Th>Products</Th>
            <Th>FAQs</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </THead>
        <TBody>
          {crops.map((crop) => (
            <Tr key={crop.id}>
              <Td>
                <span className="flex items-center gap-1.5 font-display font-semibold text-ink capitalize">
                  {crop.name}
                  {crop.featured && <Star className="size-3.5 fill-leaf-500 text-leaf-600" />}
                </span>
                <span className="text-xs text-ink-faint">/{crop.slug}</span>
              </Td>
              <Td className="max-w-48 truncate">{crop.aka.join(", ") || "—"}</Td>
              <Td>
                <span className={cn(crop._count.products === 0 && "text-ink-faint/60")}>
                  {crop._count.products}
                </span>
              </Td>
              <Td>{crop._count.faqs}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <ActionDialog
                    title={`Edit ${crop.name}`}
                    action={saveCrop}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${crop.name}`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    }
                  >
                    {fields(crop)}
                  </ActionDialog>
                  <ConfirmButton
                    title={`Delete ${crop.name}?`}
                    description="Only possible when no products reference this crop."
                    label=""
                    action={async () => {
                      "use server";
                      return deleteCrop(crop.id);
                    }}
                  />
                </div>
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
    </>
  );
}
