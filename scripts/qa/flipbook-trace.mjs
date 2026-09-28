/**
 * Checks, after a build, that the flipbook download route carries the files
 * it reads at run time.
 *
 * The serverless host ships a route with only the files the build traced as
 * imports. The downloads also read fonts, pictures and pdfkit's built-in
 * fonts from disk, which the tracer cannot see, so next.config.ts lists them
 * by hand — and a list kept by hand is one a future edit can break silently:
 * everything passes locally, where node_modules is whole, and the PDF fails
 * only once deployed. That happened once; this is the check that stops it
 * happening quietly again.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const TRACE = ".next/server/app/api/flipbook/[format]/route.js.nft.json";

if (!existsSync(TRACE)) {
  console.error(`✗ ${TRACE} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const files = JSON.parse(readFileSync(TRACE, "utf8")).files.map((file) =>
  path.normalize(path.join(path.dirname(TRACE), file)),
);

const REQUIRED = [
  // pdfkit's standard fonts, loaded through createRequire at run time.
  "node_modules/pdfkit/js/standard-fonts/Helvetica.cjs",
  "node_modules/pdfkit/js/standard-fonts/chunks",
  // The fonts both downloads embed.
  "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
  "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
  "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff",
  "node_modules/@fontsource/fraunces/files/fraunces-latin-400-italic.woff",
  // The pictures the pages show.
  "public/images/brand/logo-white.png",
  "public/images/products",
];

const missing = REQUIRED.filter(
  (required) => !files.some((file) => file === required || file.startsWith(required + path.sep)),
);

if (missing.length > 0) {
  console.error("✗ The flipbook download route would ship without files it reads at run time:");
  for (const file of missing) console.error(`  - ${file}`);
  console.error("Add them to outputFileTracingIncludes in next.config.ts.");
  process.exit(1);
}

console.log(`✓ Flipbook download route carries its runtime files (${files.length} traced).`);
