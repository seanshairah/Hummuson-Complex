import { auth } from "@/server/auth";
import { writeAuditEvent, type AuditEntry } from "@/server/audit-log";

export type { AuditEntry } from "@/server/audit-log";

/**
 * Records an admin action against the signed-in user.
 *
 * Every mutating action in src/server/actions/admin/ calls this, and a unit
 * test enforces that — an audit log with a gap in it is worse than none,
 * because it invites the conclusion that nothing happened.
 */
export async function audit(
  action: string,
  details: Omit<AuditEntry, "action" | "actorId" | "actorEmail"> = {},
): Promise<void> {
  const session = await auth().catch(() => null);
  await writeAuditEvent({
    ...details,
    action,
    actorId: session?.user?.id ?? null,
    actorEmail: session?.user?.email ?? null,
  });
}
