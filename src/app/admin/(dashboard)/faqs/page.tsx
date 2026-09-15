import Link from "next/link";
import { Suspense } from "react";
import { MessageCircleQuestion, Pencil, Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminSearch } from "@/components/admin/admin-search";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { StatusPill } from "@/components/admin/status-pill";
import { TestQuestion } from "@/components/admin/test-question";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteFaq } from "@/server/actions/admin/faqs";
import { humanize } from "@/lib/utils";

export const metadata = { title: "FAQs — admin" };

export default async function AdminFaqsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const faqs = await db.faq.findMany({
    where: q
      ? {
          OR: [
            { question: { contains: q, mode: "insensitive" } },
            { aliases: { has: q.toLowerCase() } },
            { keywords: { has: q.toLowerCase() } },
          ],
        }
      : undefined,
    orderBy: [{ category: "asc" }, { order: "asc" }],
    include: { product: { select: { name: true } }, _count: { select: { questionEvents: true } } },
  });

  return (
    <>
      <AdminPageHeader
        title="FAQs"
        description="The knowledge engine behind Ask Humuson, search and the FAQ page."
        actions={
          <>
            <Suspense>
              <AdminSearch placeholder="Search questions…" />
            </Suspense>
            <ButtonLink href="/admin/faqs/new" size="sm">
              <Plus className="size-4" /> New FAQ
            </ButtonLink>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {faqs.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title={q ? `No FAQs match “${q}”` : "No FAQs yet"}
              action={<ButtonLink href="/admin/faqs/new">Write the first FAQ</ButtonLink>}
            />
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Question</Th>
                  <Th>Category</Th>
                  <Th>Product</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {faqs.map((faq) => (
                  <Tr key={faq.id} className="hover:bg-paper-dim/50">
                    <Td>
                      <Link
                        href={`/admin/faqs/${faq.id}`}
                        className="font-medium text-ink hover:text-brand"
                      >
                        {faq.question}
                      </Link>
                      {faq.aliases.length > 0 && (
                        <span className="block text-xs text-ink-faint">
                          {faq.aliases.length} alias{faq.aliases.length === 1 ? "" : "es"}
                        </span>
                      )}
                    </Td>
                    <Td>{humanize(faq.category)}</Td>
                    <Td>{faq.product?.name ?? "—"}</Td>
                    <Td>
                      <StatusPill status={faq.status} />
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/faqs/${faq.id}`}
                          aria-label="Edit"
                          className="flex size-8 items-center justify-center rounded-full text-ink-faint hover:bg-ink/5"
                        >
                          <Pencil className="size-3.5" />
                        </Link>
                        <ConfirmButton
                          title="Delete this FAQ?"
                          label=""
                          action={async () => {
                            "use server";
                            await deleteFaq(faq.id);
                          }}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
        </div>
        <TestQuestion />
      </div>
    </>
  );
}
