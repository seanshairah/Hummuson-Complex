import { headers } from "next/headers";
import { db } from "@/server/db";
import { clientIp } from "@/server/rate-limit";

/**
 * The audit log writer.
 *
 * Deliberately free of any dependency on the auth module: sign-in and
 * sign-out are among the events worth recording, and auth.ts has to be able
 * to call this without the two importing each other. Admin actions use the
 * thin wrapper in audit.ts instead, which fills the actor in for them.
 */
export interface AuditEntry {
  /** "<subject>.<verb>" — "user.deactivated", "product.published". */
  action: string;
  actorId?: string | null;
  actorEmail?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  /** What the thing was called at the time of the action. */
  label?: string | null;
  meta?: Record<string, unknown> | null;
  /**
   * Request headers, for callers that hold them directly (the credentials
   * callback does; server actions do not and let this be resolved for them).
   */
  requestHeaders?: Headers;
}

/**
 * Writes one entry. Never throws.
 *
 * A failed log write must not take the operation down with it — refusing to
 * deactivate a compromised account because the logger is unwell would be the
 * worse failure. It is loud on the server console instead, which is where a
 * silently broken audit log would otherwise hide.
 */
export async function writeAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const requestHeaders = entry.requestHeaders ?? (await headers().catch(() => null));

    await db.auditEvent.create({
      data: {
        action: entry.action,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        entityType: entry.entityType ?? null,
        entityId: entry.entityId ?? null,
        entityLabel: entry.label ? entry.label.slice(0, 200) : null,
        ip: requestHeaders ? clientIp(requestHeaders) : null,
        userAgent: requestHeaders?.get("user-agent")?.slice(0, 300) ?? null,
        meta: (entry.meta ?? undefined) as never,
      },
    });
  } catch (error) {
    console.error(`[audit] failed to record "${entry.action}"`, error);
  }
}
