import Link from "next/link";
import { Suspense } from "react";
import { Eye, Newspaper, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { StatusPill } from "@/components/admin/status-pill";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteArticle, setArticleStatus } from "@/server/actions/admin/articles";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Articles — admin" };

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const articles = await db.article.findMany({
    where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });

  return (
    <>
      <AdminPageHeader
        title="Articles"
        description="The knowledge centre: agronomy advice, guides and news."
        actions={
          <>
            <Suspense>
              <AdminSearch placeholder="Search articles…" />
            </Suspense>
            <ButtonLink href="/admin/articles/new" size="sm">
              <Plus className="size-4" /> New article
            </ButtonLink>
          </>
        }
      />
      {articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title={q ? `No articles match “${q}”` : "No articles yet"}
          action={<ButtonLink href="/admin/articles/new">Write the first article</ButtonLink>}
        />
      ) : (
        <Table>
          <THead>
            <Tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Published</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </Tr>
          </THead>
          <TBody>
            {articles.map((article) => (
              <Tr key={article.id} className="hover:bg-paper-dim/50">
                <Td>
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="font-medium text-ink hover:text-brand"
                  >
                    {article.title}
                  </Link>
                  <span className="block text-xs text-ink-faint">/{article.slug}</span>
                </Td>
                <Td>{article.category?.name ?? "—"}</Td>
                <Td>{formatDate(article.publishedAt) || "—"}</Td>
                <Td>
                  <StatusPill status={article.status} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <form
                      action={async () => {
                        "use server";
                        await setArticleStatus(
                          article.id,
                          article.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                        );
                      }}
                    >
                      <button
                        type="submit"
                        title={article.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                        className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                      >
                        <Eye
                          className={cn(
                            "size-3.5",
                            article.status === "PUBLISHED" && "text-leaf-700",
                          )}
                        />
                      </button>
                    </form>
                    <Link
                      href={`/admin/articles/${article.id}`}
                      aria-label="Edit"
                      className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                    >
                      <Pencil className="size-3.5" />
                    </Link>
                    <ConfirmButton
                      title={`Delete “${article.title}”?`}
                      label=""
                      action={async () => {
                        "use server";
                        await deleteArticle(article.id);
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
