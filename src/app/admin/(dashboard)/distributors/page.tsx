import { Pencil, Plus, Store } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteDistributor, saveDistributor } from "@/server/actions/admin/content";

export const metadata = { title: "Stockists — admin" };

export default async function AdminDistributorsPage() {
  const distributors = await db.distributor.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });

  const fields = (shop?: (typeof distributors)[number]) => (
    <>
      {shop && <input type="hidden" name="id" value={shop.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Shop name" required>
          <Input name="name" defaultValue={shop?.name} required />
        </Field>
        <Field label="Town" required hint="Groups the shop on the page">
          <Input name="town" defaultValue={shop?.town} required />
        </Field>
      </div>
      <Field label="Address" hint="Leave blank until you have it — the page says so rather than guessing">
        <Input name="address" defaultValue={shop?.address ?? ""} />
      </Field>
      <Field label="Phone numbers" hint="One per line, or separated by commas">
        <Textarea name="phones" rows={2} defaultValue={(shop?.phones ?? []).join("\n")} />
      </Field>
      <Field label="Note" hint="Anything a caller needs that the address does not say">
        <Input name="notes" defaultValue={shop?.notes ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Latitude"
          hint="Optional. Right-click the shop in Google Maps and copy the two numbers"
        >
          <Input name="mapsLat" defaultValue={shop?.mapsLat ?? ""} inputMode="decimal" />
        </Field>
        <Field label="Longitude">
          <Input name="mapsLng" defaultValue={shop?.mapsLng ?? ""} inputMode="decimal" />
        </Field>
      </div>
      <Field label="Google Maps share link" hint="Optional. Beats coordinates when the shop has a listing">
        <Input name="mapsUrl" defaultValue={shop?.mapsUrl ?? ""} />
      </Field>
      <Field
        label="Where this came from"
        hint="Never shown on the site — for whoever checks the address next"
      >
        <Textarea name="sourceNote" rows={2} defaultValue={shop?.sourceNote ?? ""} />
      </Field>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="verified"
          defaultChecked={Boolean(shop?.verifiedAt)}
          className="size-4 accent-leaf-600"
        />
        Address confirmed with the shop itself
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Status">
          <NativeSelect name="status" defaultValue={shop?.status ?? "PUBLISHED"}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </NativeSelect>
        </Field>
        <Field label="Order" hint="Lower sorts first, within the town">
          <Input name="order" type="number" defaultValue={shop?.order ?? 0} />
        </Field>
      </div>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Stockists"
        description="Outlets shown on /where-to-buy, grouped by town. Checked is the verification queue — most addresses came from third-party listings."
        actions={
          <ActionDialog
            title="New stockist"
            action={saveDistributor}
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> New stockist
              </Button>
            }
          >
            {fields()}
          </ActionDialog>
        }
      />
      {distributors.length === 0 ? (
        <EmptyState icon={Store} title="No stockists yet" />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Shop</Th>
              <Th>Address</Th>
              <Th>Phone</Th>
              <Th>Checked</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {distributors.map((shop) => (
              <Tr key={shop.id}>
                <Td>
                  <span className="font-medium text-ink">{shop.name}</span>
                  <span className="block text-xs text-ink-faint">{shop.town}</span>
                </Td>
                <Td className="max-w-xs">
                  {shop.address ? (
                    <span className="line-clamp-2">{shop.address}</span>
                  ) : (
                    <span className="text-ink-faint italic">To follow</span>
                  )}
                </Td>
                <Td>
                  {shop.phones.length > 0 ? (
                    shop.phones.map((phone) => (
                      <span key={phone} className="block text-xs">
                        {phone}
                      </span>
                    ))
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </Td>
                <Td>
                  {shop.verifiedAt ? (
                    <span className="text-xs whitespace-nowrap text-leaf-800">
                      {shop.verifiedAt.toISOString().slice(0, 10)}
                    </span>
                  ) : (
                    <span className="text-xs text-ink-faint">not yet</span>
                  )}
                </Td>
                <Td>
                  <StatusPill status={shop.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <ActionDialog
                      title="Edit stockist"
                      action={saveDistributor}
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
                      {fields(shop)}
                    </ActionDialog>
                    <ConfirmButton
                      title={`Delete ${shop.name} (${shop.town})?`}
                      label=""
                      action={async () => {
                        "use server";
                        await deleteDistributor(shop.id);
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
