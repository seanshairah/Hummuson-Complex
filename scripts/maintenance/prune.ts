/**
 * Runs the retention sweep from a shell, for a first review or a one-off run.
 *
 * Reports without deleting unless --apply is passed AND DATA_RETENTION_ENABLED
 * is set, so the numbers can be looked at before anything is removed.
 *
 *   npm run maintenance:prune              # report only
 *   DATA_RETENTION_ENABLED=1 npm run maintenance:prune -- --apply
 */
import { pruneExpiredData } from "@/server/data/retention";

const apply = process.argv.includes("--apply");

async function main() {
  const result = await pruneExpiredData({ dryRun: !apply });
  const mode = !result.enabled
    ? "reporting only — DATA_RETENTION_ENABLED is not set"
    : apply
      ? "deleting"
      : "reporting only — pass --apply to delete";

  console.log(`Retention sweep (${mode})\n`);
  for (const [name, count] of Object.entries(result.deleted)) {
    const window = result.policy[name as keyof typeof result.policy];
    console.log(
      `  ${name.padEnd(18)} ${String(count).padStart(7)} record(s) older than ${window} days`,
    );
  }
  process.exit(0);
}

void main();
