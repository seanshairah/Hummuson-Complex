/**
 * Dependency scanning gate.
 *
 * Fails on any high or critical advisory that has not been individually
 * assessed and recorded in security/audit-exceptions.json.
 *
 * A blanket `npm audit --audit-level=high` would be red from the day it was
 * added — this project has build-time advisories with no non-major upgrade
 * path — and a gate that is always red is one nobody reads. Ignoring the dev
 * tree entirely would be worse: `postcss` arrives through `next`, so the
 * tree it lives in is not the question. What matters is whether a request can
 * reach it, and that is a judgement someone has to write down.
 *
 *   node scripts/qa/audit-gate.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { exceptions } = JSON.parse(readFileSync("security/audit-exceptions.json", "utf8"));
const accepted = new Map(exceptions.map((entry) => [entry.advisory, entry]));

let report;
try {
  // npm audit exits non-zero when it finds anything, so the output is read
  // from the thrown error rather than treated as a failure in itself.
  report = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", stdio: "pipe" });
} catch (error) {
  report = error.stdout;
}

/**
 * Collected per advisory, not per package. npm reports a package at the
 * severity of its worst advisory, so reading the package severity alone
 * sweeps every moderate advisory on that package in with it.
 */
const found = new Map();
for (const vulnerability of Object.values(JSON.parse(report).vulnerabilities ?? {})) {
  for (const via of vulnerability.via) {
    if (typeof via !== "object" || !via.source) continue;
    if (via.severity !== "high" && via.severity !== "critical") continue;
    found.set(via.source, via);
  }
}

const unreviewed = [...found.values()].filter((via) => !accepted.has(via.source));
const stale = [...accepted.values()].filter(
  (entry) => new Date(entry.reviewBy) < new Date() && found.has(entry.advisory),
);
const gone = [...accepted.keys()].filter((advisory) => !found.has(advisory));

for (const advisory of gone) {
  console.log(`· advisory ${advisory} no longer applies — remove it from security/audit-exceptions.json`);
}
for (const entry of stale) {
  console.log(`· advisory ${entry.advisory} (${entry.package}) is past its ${entry.reviewBy} review date`);
}

if (unreviewed.length === 0) {
  console.log(
    `Dependency audit clean: ${found.size} high/critical advisor${found.size === 1 ? "y" : "ies"}, all assessed in security/audit-exceptions.json.`,
  );
  process.exit(0);
}

console.error(`\n${unreviewed.length} unreviewed high/critical advisor${unreviewed.length === 1 ? "y" : "ies"}:\n`);
for (const via of unreviewed) {
  console.error(`  [${via.severity}] ${via.name} — ${via.title}`);
  console.error(`    ${via.url}`);
}
console.error(
  "\nFix it, or — if a request genuinely cannot reach it — add an entry to\n" +
    "security/audit-exceptions.json saying why, and when it will be looked at again.\n",
);
process.exit(1);
