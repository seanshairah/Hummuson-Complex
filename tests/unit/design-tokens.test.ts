import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

const globals = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const utils = readFileSync(path.join(process.cwd(), "src/lib/utils.ts"), "utf8");

/**
 * tailwind-merge classifies any unknown `text-*` class as a text *colour*, so
 * an unregistered typography utility is deleted from `cn("text-page-title
 * text-ink")` without a word. The heading still renders — at body size. There
 * is no error, no warning, and nothing in the diff to look at; you find it by
 * noticing a page title that looks wrong in a screenshot.
 *
 * This test is the thing that notices instead.
 */
describe("custom typography utilities", () => {
  const defined = [...globals.matchAll(/@utility (text-[a-z0-9-]+)/g)].map((m) => m[1]);
  const registered = [...utils.matchAll(/"(text-[a-z0-9-]+)"/g)].map((m) => m[1]);

  it("defines some", () => {
    expect(defined.length).toBeGreaterThan(0);
  });

  it("registers every one with tailwind-merge", () => {
    const missing = defined.filter((name) => !registered.includes(name));
    expect(missing, `add these to the font-size group in src/lib/utils.ts: ${missing.join(", ")}`).toEqual([]);
  });

  it("does not register one that no longer exists", () => {
    const stale = registered.filter((name) => !defined.includes(name));
    expect(stale, `these are registered but not defined in globals.css: ${stale.join(", ")}`).toEqual([]);
  });

  it("survives cn() next to a colour, which is the case that breaks", () => {
    for (const name of defined) {
      expect(cn(name, "text-ink"), name).toContain(name);
      expect(cn("max-w-4xl", name, "text-balance", "text-paper"), name).toContain(name);
    }
  });
});
