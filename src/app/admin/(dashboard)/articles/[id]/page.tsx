import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ArticleForm } from "@/components/admin/article-form";
import { StatusPill } from "@/components/admin/status-pill";
import { db } from "@/server/db";

export const metadata = { title: "Edit article — admin" };

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [article, categories, products, crops, media] = await Promise.all([
    db.article.findUnique({
      where: { id },
      include: { products: { select: { id: true } }, crops: { select: { id: true } } },
    }),
    db.articleCategory.findMany({ orderBy: { name: "asc" } }),
    db.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.crop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.media.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, alt: true },
    }),
  ]);
  if (!article) notFound();

  return (
    <>
      <AdminPageHeader
        title={article.title}
        actions={
          <>
            <StatusPill status={article.status} />
            <Link
              href={`/knowledge/${article.slug}`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-ink/30"
            >
              <ExternalLink className="size-3.5" /> Preview
            </Link>
          </>
        }
      />
      <ArticleForm
        initial={{
          id: article.id,
          title: article.title,
          slug: article.slug,
          excerpt: article.excerpt,
          bodyHtml: article.bodyHtml,
          status: article.status,
          featured: article.featured,
          categoryId: article.categoryId,
          tags: article.tags,
          coverImageId: article.coverImageId,
          productIds: article.products.map((product) => product.id),
          cropIds: article.crops.map((crop) => crop.id),
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          scheduledAt: article.scheduledAt
            ? new Date(article.scheduledAt).toISOString().slice(0, 16)
            : null,
        }}
        categories={categories}
        products={products}
        crops={crops}
        media={media}
      />
    </>
  );
}
