/**
 * Applies pending migrations as part of the build.
 *
 * Vercel deploys this branch straight to the production domain, and the build
 * does not otherwise touch the database — so without this step a push ships
 * code that queries tables the database has never heard of, and the site 500s
 * until someone remembers to run migrations by hand. Doing it here means the
 * schema and the code that depends on it arrive together, and a migration
 * that fails fails the build, leaving the previous deployment serving.
 *
 * Neon gets the WebSocket path: `prisma migrate deploy` takes an advisory
 * lock, which Neon's connection pooler does not support, so the CLI cannot be
 * used against a pooled connection string.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/**
 * This runs before Next.js loads .env, and the Prisma CLI only loads it for
 * its own process — so read it here too, or a local build silently skips the
 * migrations it was added to guarantee.
 */
function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync(".env")) return "";
  const line = readFileSync(".env", "utf8")
    .split("\n")
    .find((entry) => entry.trim().startsWith("DATABASE_URL="));
  if (!line) return "";
  const value = line.slice(line.indexOf("=") + 1).trim();
  const unquoted = value.replace(/^["']|["']$/g, "");
  process.env.DATABASE_URL = unquoted;
  return unquoted;
}

const url = databaseUrl();

if (!url) {
  console.warn("[migrate] DATABASE_URL is not set — skipping. The build will fail later if it is genuinely needed.");
  process.exit(0);
}

const isNeon = /neon\.tech/.test(url);
const [command, args] = isNeon
  ? ["npx", ["tsx", "scripts/migration/deploy-neon.ts"]]
  : ["npx", ["prisma", "migrate", "deploy"]];

console.log(`[migrate] applying pending migrations via ${isNeon ? "the Neon serverless driver" : "the Prisma CLI"}`);
execFileSync(command, args, { stdio: "inherit" });
