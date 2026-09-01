import { db } from "@/server/db";
import { writeAuditEvent } from "@/server/audit-log";

/**
 * Retention windows for the records that hold personal or free-text data.
 *
 * These are proposals, not law. How long a business may keep an enquiry is a
 * question about that business's obligations and its own commitments to
 * customers, so the defaults below are conservative and every one of them is
 * overridable by environment variable — and the sweep does nothing at all
 * until DATA_RETENTION_ENABLED is set. Deleting a customer's enquiry is not
 * something a default should decide.
 *
 * Documented for people, not just for code, in docs/SECURITY.md and on the
 * public /privacy page.
 */
function days(name: string, fallback: number): number {
  const configured = Number(process.env[name]);
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

export interface RetentionPolicy {
  /** Visitor search queries — free text typed by the public. */
  searchEvents: number;
  /** Questions asked of Ask Humuson — free text typed by the public. */
  questionEvents: number;
  /** Page and interaction counters. No free text, but still per-visit. */
  analyticsEvents: number;
  /**
   * Enquiries that have been dealt with. Open ones are never swept: losing a
   * customer's message because nobody got to it in time would be worse than
   * keeping it.
   */
  closedEnquiries: number;
  /** The audit log. Must not be shorter than the database trigger allows. */
  auditEvents: number;
}

export function retentionPolicy(): RetentionPolicy {
  return {
    searchEvents: days("RETENTION_SEARCH_DAYS", 180),
    questionEvents: days("RETENTION_QUESTION_DAYS", 180),
    analyticsEvents: days("RETENTION_ANALYTICS_DAYS", 365),
    closedEnquiries: days("RETENTION_ENQUIRY_DAYS", 730),
    auditEvents: days("RETENTION_AUDIT_DAYS", 400),
  };
}

export function retentionEnabled(): boolean {
  return process.env.DATA_RETENTION_ENABLED === "1";
}

function cutoff(daysToKeep: number): Date {
  return new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
}

export interface PruneResult {
  enabled: boolean;
  policy: RetentionPolicy;
  deleted: Record<string, number>;
}

/**
 * Deletes records past their retention window.
 *
 * Safe to run repeatedly and safe to run when there is nothing to do. Reports
 * what it would delete without deleting anything when retention is switched
 * off, so the periods can be reviewed against real numbers before anyone
 * commits to them.
 */
export async function pruneExpiredData({
  dryRun = false,
}: { dryRun?: boolean } = {}): Promise<PruneResult> {
  const policy = retentionPolicy();
  const enabled = retentionEnabled();
  const simulate = dryRun || !enabled;

  const targets = [
    {
      name: "searchEvents",
      count: () =>
        db.searchEvent.count({ where: { createdAt: { lt: cutoff(policy.searchEvents) } } }),
      remove: () =>
        db.searchEvent.deleteMany({ where: { createdAt: { lt: cutoff(policy.searchEvents) } } }),
    },
    {
      name: "questionEvents",
      count: () =>
        db.questionEvent.count({ where: { createdAt: { lt: cutoff(policy.questionEvents) } } }),
      remove: () =>
        db.questionEvent.deleteMany({
          where: { createdAt: { lt: cutoff(policy.questionEvents) } },
        }),
    },
    {
      name: "analyticsEvents",
      count: () =>
        db.analyticsEvent.count({ where: { createdAt: { lt: cutoff(policy.analyticsEvents) } } }),
      remove: () =>
        db.analyticsEvent.deleteMany({
          where: { createdAt: { lt: cutoff(policy.analyticsEvents) } },
        }),
    },
    {
      name: "closedEnquiries",
      count: () =>
        db.enquiry.count({
          where: {
            status: { in: ["RESOLVED", "ARCHIVED"] },
            createdAt: { lt: cutoff(policy.closedEnquiries) },
          },
        }),
      remove: () =>
        db.enquiry.deleteMany({
          where: {
            status: { in: ["RESOLVED", "ARCHIVED"] },
            createdAt: { lt: cutoff(policy.closedEnquiries) },
          },
        }),
    },
    {
      name: "auditEvents",
      count: () =>
        db.auditEvent.count({ where: { createdAt: { lt: cutoff(policy.auditEvents) } } }),
      remove: () =>
        db.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff(policy.auditEvents) } } }),
    },
  ];

  const deleted: Record<string, number> = {};
  for (const target of targets) {
    deleted[target.name] = simulate ? await target.count() : (await target.remove()).count;
  }

  const total = Object.values(deleted).reduce((sum, count) => sum + count, 0);
  if (!simulate && total > 0) {
    await writeAuditEvent({
      action: "retention.pruned",
      entityType: "retention",
      meta: { deleted, policy },
    });
  }

  return { enabled, policy, deleted };
}
