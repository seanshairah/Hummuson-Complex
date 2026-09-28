import { Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { db } from "@/server/db";
import { deleteCategory, saveCategory } from "@/server/actions/admin/content";

export const metadata = { title: "Categories — admin" };

export default async function AdminCategoriesPage() {
  const categories = await db.productCategory.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const fields = (category?: (typeof categories)[number]) => (
    <>
      {category && <input type="hidden" name="id" value={category.id} />}
      <Field label="Name" required>
        <Input name="name" defaultValue={category?.name} required />
      </Field>
      <div className="grid grid-cols-[1fr_6rem] gap-4">
        <Field label="Slug" hint="Blank = derived from name">
          <Input name="slug" defaultValue={category?.slug} />
        </Field>
        <Field label="Order">
          <Input name="order" type="number" defaultValue={category?.order ?? 0} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={category?.description ?? ""} />
      </Field>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Product ranges shown as filters and catalogue chapters."
        actions={
          <ActionDialog
            title="New category"
            action={saveCategory}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New category
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
            <Th>Name</Th>
            <Th>Slug</Th>
            <Th>Products</Th>
            <Th>Order</Th>
            <Th className="text-right">Actions</Th>
          </Tr>
        </THead>
        <TBody>
          {categories.map((category) => (
            <Tr key={category.id}>
              <Td className="font-display font-semibold text-ink">{category.name}</Td>
              <Td>/{category.slug}</Td>
              <Td>{category._count.products}</Td>
              <Td>{category.order}</Td>
              <Td>
                <div className="flex items-center justify-end gap-1">
                  <ActionDialog
                    title={`Edit ${category.name}`}
                    action={saveCategory}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${category.name}`}
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                    }
                  >
                    {fields(category)}
                  </ActionDialog>
                  <ConfirmButton
                    title={`Delete ${category.name}?`}
                    description="Products must be moved out of the category first."
                    label=""
                    action={async () => {
                      "use server";
                      return deleteCategory(category.id);
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
