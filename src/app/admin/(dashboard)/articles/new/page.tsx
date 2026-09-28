import { AdminPageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { db } from "@/server/db";

export const metadata = { title: "New article — admin" };

export default async function NewArticlePage() {
  const [categories, products, crops, media] = await Promise.all([
    db.articleCategory.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, alt: true },
    }),
  ]);
  return (
    <>
      <AdminPageHeader title="New article" />
      <ArticleForm
        initial={{}}
        categories={categories}
        products={products}
        crops={crops}
        media={media}
      />
    </>
  );
}
