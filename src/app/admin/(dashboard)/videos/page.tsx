import Image from "next/image";
import { Pencil, PlaySquare, Plus, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ActionDialog } from "@/components/admin/action-dialog";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { CheckGroup } from "@/components/admin/check-group";
import { StatusPill } from "@/components/admin/status-pill";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteVideo, saveVideo } from "@/server/actions/admin/content";
import { humanize } from "@/lib/utils";

export const metadata = { title: "Videos — admin" };

const CATEGORIES = [
  "HOW_TO_APPLY",
  "PRODUCT_DEMONSTRATION",
  "FARMER_RESULTS",
  "AGRONOMY_EDUCATION",
  "EVENTS",
  "HUMUSON_STORIES",
];

export default async function AdminVideosPage() {
  const [videos, products, crops] = await Promise.all([
    db.video.findMany({
      orderBy: [{ featured: "desc" }, { order: "asc" }],
      include: { products: { select: { id: true } }, crops: { select: { id: true } } },
    }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const fields = (video?: (typeof videos)[number]) => (
    <>
      {video && <input type="hidden" name="id" value={video.id} />}
      <Field
        label="YouTube URL"
        required
        hint="Paste any YouTube link — the title and thumbnail are fetched automatically"
      >
        <Input name="youtubeUrl" defaultValue={video?.youtubeUrl} required />
      </Field>
      <Field label="Title" hint="Leave blank to use the YouTube title">
        <Input name="title" defaultValue={video?.title} />
      </Field>
      <Field label="Description">
        <Textarea name="description" rows={2} defaultValue={video?.description ?? ""} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <NativeSelect name="category" defaultValue={video?.category ?? "AGRONOMY_EDUCATION"}>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {humanize(category)}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Status">
          <NativeSelect name="status" defaultValue={video?.status ?? "PUBLISHED"}>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </NativeSelect>
        </Field>
      </div>
      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input
          type="checkbox"
          name="featured"
          defaultChecked={video?.featured}
          className="size-4 accent-leaf-600"
        />
        Featured
      </label>
      <Field label="Related products">
        <CheckGroup
          name="productIds"
          options={products}
          selected={video?.products.map((product) => product.id) ?? []}
        />
      </Field>
      <Field label="Related crops">
        <CheckGroup
          name="cropIds"
          options={crops}
          selected={video?.crops.map((crop) => crop.id) ?? []}
        />
      </Field>
    </>
  );

  return (
    <>
      <AdminPageHeader
        title="Videos"
        description="Paste a YouTube URL — metadata is derived automatically, embeds stay click-to-load."
        actions={
          <ActionDialog
            title="Add video"
            action={saveVideo}
            wide
            trigger={
              <Button size="sm">
                <Plus className="size-4" /> Add video
              </Button>
            }
          >
            {fields()}
          </ActionDialog>
        }
      />
      {videos.length === 0 ? (
        <EmptyState icon={PlaySquare} title="No videos yet" />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Video</Th>
              <Th>Category</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {videos.map((video) => (
              <Tr key={video.id} className="hover:bg-paper-dim/50">
                <Td>
                  <span className="flex items-center gap-3">
                    <span className="relative block h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-humus-900">
                      {video.thumbnailUrl && (
                        <Image
                          src={video.thumbnailUrl}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </span>
                    <span>
                      <span className="flex items-center gap-1.5 font-medium text-ink">
                        {video.title}
                        {video.featured && (
                          <Star className="size-3.5 fill-leaf-500 text-leaf-600" />
                        )}
                      </span>
                      <span className="block text-xs text-ink-faint">{video.youtubeId}</span>
                    </span>
                  </span>
                </Td>
                <Td>{humanize(video.category)}</Td>
                <Td>
                  <StatusPill status={video.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <ActionDialog
                      title="Edit video"
                      action={saveVideo}
                      wide
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
                      {fields(video)}
                    </ActionDialog>
                    <ConfirmButton
                      title={`Remove “${video.title}”?`}
                      label=""
                      action={async () => {
                        "use server";
                        await deleteVideo(video.id);
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
