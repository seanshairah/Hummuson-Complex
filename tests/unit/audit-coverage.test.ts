import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * An audit log with a gap in it is worse than no audit log, because it invites
 * the conclusion that nothing happened. Coverage is therefore checked
 * mechanically rather than left to whoever adds the next admin module.
 */
const ACTIONS_DIR = path.join(process.cwd(), "src/server/actions/admin");

/**
 * Actions that read but never write. Listing one here has to be a deliberate
 * act, which is the point — the default for anything new is "must be logged".
 */
const READ_ONLY = new Set(["previewAnswer"]);

/** Files with no exported actions of their own. */
const NOT_ACTION_FILES = new Set(["helpers.ts"]);

/**
 * Comments are removed first. Without this a commented-out audit call still
 * satisfies the check, which is the exact mistake this test exists to catch.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function exportedActions(source: string): { name: string; body: string }[] {
  const parts = stripComments(source).split(/export async function /).slice(1);
  return parts.map((part) => ({
    name: part.slice(0, part.indexOf("(")).trim(),
    body: part,
  }));
}

describe("admin action audit coverage", () => {
  const files = readdirSync(ACTIONS_DIR).filter(
    (file) => file.endsWith(".ts") && !NOT_ACTION_FILES.has(file),
  );

  it("finds the action modules", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const source = readFileSync(path.join(ACTIONS_DIR, file), "utf8");
    for (const action of exportedActions(source)) {
      if (READ_ONLY.has(action.name)) continue;
      it(`${file} › ${action.name} records an audit event`, () => {
        expect(
          /\baudit\(|\bwriteAuditEvent\(/.test(action.body),
          `${action.name} changes data but writes nothing to the audit log. ` +
            `Add an audit(...) call, or list it in READ_ONLY if it only reads.`,
        ).toBe(true);
      });
    }
  }
});
