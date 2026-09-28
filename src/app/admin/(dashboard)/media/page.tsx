import { Images } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { UploadButton } from "@/components/admin/upload-button";
import { MediaCard } from "@/components/admin/media-card";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { AdminPagination, pageFrom, pageQuery } from "@/components/admin/pagination";

export const metadata = { title: "Media — admin" };

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = pageFrom(pageParam);
  const [media, total] = await Promise.all([
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      ...pageQuery(page),
      include: {
        _count: {
          select: {
            productPrimary: true,
            productGallery: true,
            articleCovers: true,
            cropImages: true,
            projectImages: true,
            catalogueSection: true,
            catalogueEntries: true,
          },
        },
      },
    }),
    db.media.count(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Media library"
        description={`${total} files — product packs, field photography and uploads.`}
        actions={<UploadButton />}
      />
      {media.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No media yet"
          description="Upload images to use across products, articles and results."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((item) => {
            const usage =
              item._count.productPrimary +
              item._count.productGallery +
              item._count.articleCovers +
              item._count.cropImages +
              item._count.projectImages +
              item._count.catalogueSection +
              item._count.catalogueEntries;
            return <MediaCard key={item.id} media={item} usage={usage} />;
          })}
        </div>
      )}
      <AdminPagination page={page} total={total} basePath="/admin/media" />
    </>
  );
}
