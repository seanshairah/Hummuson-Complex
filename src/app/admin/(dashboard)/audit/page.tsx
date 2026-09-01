import Link from "next/link";
import { ScrollText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "Audit log — admin" };

const PAGE_SIZE = 50;

/**
 * Filters offered as one-click chips. Sign-in trouble is first because that is
 * what someone opening this page after a security scare is looking for.
 */
const FILTERS = [
  { key: "", label: "Everything" },
  { key: "auth.sign_in_failed", label: "Failed sign-ins" },
  { key: "auth.sign_in_blocked", label: "Blocked sign-ins" },
  { key: "auth.signed_in", label: "Sign-ins" },
  { key: "user.", label: "Accounts & roles" },
  { key: "product.", label: "Products" },
  { key: "settings.", label: "Settings" },
];

/** Entries worth making visually obvious in a long list. */
function toneFor(action: string): string {
  if (action.startsWith("user.role_changed") || action.startsWith("user.sessions_revoked"))
    return "bg-sun-200/60 text-humus-900";
  if (action.endsWith(".deleted") || action.endsWith("_failed") || action.endsWith("_blocked"))
    return "bg-danger/10 text-danger";
  if (action.startsWith("auth.")) return "bg-leaf-300/40 text-leaf-800";
  return "bg-paper-dim text-ink-soft";
}

function when(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const { action: actionFilter = "", page: pageParam } = await searchParams;
  const session = await auth();

  if (session?.user.role !== "ADMIN") {
    return (
      <>
        <AdminPageHeader title="Audit log" />
        <EmptyState
          icon={ScrollText}
          title="Admin role required"
          description="The audit log records who did what across the whole platform, so only administrators can read it."
        />
      </>
    );
  }

  const page = Math.max(1, Number(pageParam) || 1);
  const where = actionFilter ? { action: { startsWith: actionFilter } } : {};
  const [events, total] = await Promise.all([
    db.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    db.auditEvent.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const linkFor = (next: { action?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextAction = next.action ?? actionFilter;
    if (nextAction) params.set("action", nextAction);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const query = params.toString();
    return query ? `/admin/audit?${query}` : "/admin/audit";
  };

  return (
    <>
      <AdminPageHeader
        title="Audit log"
        description="Who did what, when, and from where. Append-only — entries cannot be edited or removed from here, or by the application at all."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={linkFor({ action: filter.key, page: 1 })}
            className={cn(
              "rounded-full border px-3 py-1 font-display text-xs font-medium transition-colors",
              actionFilter === filter.key
                ? "border-humus-900 bg-humus-900 text-paper"
                : "border-line text-ink-soft hover:border-humus-700",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="Nothing recorded yet"
          description="Sign-ins and content changes appear here as they happen."
        />
      ) : (
        <>
          <Table>
            <THead>
              <Tr>
                <Th>When (UTC)</Th>
                <Th>Action</Th>
                <Th>Who</Th>
                <Th>What</Th>
                <Th>From</Th>
              </Tr>
            </THead>
            <TBody>
              {events.map((event) => (
                <Tr key={event.id}>
                  <Td className="whitespace-nowrap text-xs text-ink-faint">
                    {when(event.createdAt)}
                  </Td>
                  <Td>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-medium",
                        toneFor(event.action),
                      )}
                    >
                      {event.action}
                    </span>
                  </Td>
                  <Td className="text-xs">{event.actorEmail ?? "—"}</Td>
                  <Td className="text-xs">
                    {event.entityLabel ?? event.entityId ?? "—"}
                    {event.meta ? (
                      <span className="block text-ink-faint">{JSON.stringify(event.meta)}</span>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-ink-faint">{event.ip ?? "—"}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>

          <div className="mt-5 flex items-center justify-between text-xs text-ink-faint">
            <span>
              {total.toLocaleString()} entr{total === 1 ? "y" : "ies"} · page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={linkFor({ page: page - 1 })} className="hover:text-ink">
                  ← Newer
                </Link>
              )}
              {page < pages && (
                <Link href={linkFor({ page: page + 1 })} className="hover:text-ink">
                  Older →
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
