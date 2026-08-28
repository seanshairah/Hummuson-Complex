import { Inbox } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatusPill } from "@/components/admin/status-pill";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/server/db";
import { deleteEnquiry, setEnquiryStatus } from "@/server/actions/admin/misc";
import { formatDate, humanize } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Enquiries — admin" };

const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "ARCHIVED"] as const;

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = STATUSES.includes(status as never)
    ? (status as (typeof STATUSES)[number])
    : undefined;
  const [enquiries, counts] = await Promise.all([
    db.enquiry.findMany({
      where: filter ? { status: filter } : undefined,
      orderBy: { createdAt: "desc" },
      include: { product: { select: { name: true } } },
    }),
    db.enquiry.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (key: string) => counts.find((count) => count.status === key)?._count ?? 0;

  return (
    <>
      <AdminPageHeader
        title="Enquiries"
        description="Messages from the contact form, product pages and the finder."
      />

      <div className="mb-6 scrollbar-none flex gap-2 overflow-x-auto pb-1">
        <a
          href="/admin/enquiries"
          className={cn(
            "rounded-full border px-4 py-2 font-display text-sm font-medium",
            !filter
              ? "border-humus-900 bg-humus-900 text-paper"
              : "border-line bg-cream text-ink-soft",
          )}
        >
          All ({counts.reduce((sum, count) => sum + count._count, 0)})
        </a>
        {STATUSES.map((key) => (
          <a
            key={key}
            href={`/admin/enquiries?status=${key}`}
            className={cn(
              "rounded-full border px-4 py-2 font-display text-sm font-medium whitespace-nowrap",
              filter === key
                ? "border-humus-900 bg-humus-900 text-paper"
                : "border-line bg-cream text-ink-soft",
            )}
          >
            {humanize(key)} ({countFor(key)})
          </a>
        ))}
      </div>

      {enquiries.length === 0 ? (
        <EmptyState icon={Inbox} title="No enquiries here" />
      ) : (
        <div className="space-y-4">
          {enquiries.map((enquiry) => (
            <article key={enquiry.id} className="rounded-2xl border border-line bg-cream p-5">
              <header className="flex flex-wrap items-center gap-3">
                <h2 className="font-display text-base font-semibold text-ink">{enquiry.name}</h2>
                <StatusPill status={enquiry.status} />
                <span className="text-xs text-ink-faint">
                  {humanize(enquiry.source)} · {formatDate(enquiry.createdAt)}
                </span>
                {enquiry.product && (
                  <span className="rounded-full bg-leaf-300/40 px-2.5 py-0.5 text-xs font-medium text-leaf-800">
                    {enquiry.product.name}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {STATUSES.filter((key) => key !== enquiry.status)
                    .slice(0, 3)
                    .map((key) => (
                      <form
                        key={key}
                        action={async () => {
                          "use server";
                          await setEnquiryStatus(enquiry.id, key);
                        }}
                      >
                        <button
                          type="submit"
                          className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-leaf-600 hover:text-leaf-700"
                        >
                          → {humanize(key)}
                        </button>
                      </form>
                    ))}
                  <ConfirmButton
                    title="Delete this enquiry?"
                    label=""
                    action={async () => {
                      "use server";
                      await deleteEnquiry(enquiry.id);
                    }}
                  />
                </div>
              </header>
              {enquiry.subject && (
                <p className="mt-2 text-sm font-medium text-ink">{enquiry.subject}</p>
              )}
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-soft">
                {enquiry.message}
              </p>
              <footer className="mt-3 flex flex-wrap gap-4 text-xs text-ink-faint">
                {enquiry.phone && (
                  <a
                    className="hover:text-ink"
                    href={`tel:${enquiry.phone.replace(/[^+0-9]/g, "")}`}
                  >
                    📞 {enquiry.phone}
                  </a>
                )}
                {enquiry.email && (
                  <a className="hover:text-ink" href={`mailto:${enquiry.email}`}>
                    ✉️ {enquiry.email}
                  </a>
                )}
                {enquiry.phone && (
                  <a
                    className="font-medium text-leaf-700 hover:underline"
                    href={`https://wa.me/${enquiry.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Reply on WhatsApp →
                  </a>
                )}
              </footer>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
