/**
 * Renders /catalogue/print to public/catalogue/humuson-catalogue.pdf and
 * stores the URL on the published catalogue, enabling the "Download PDF"
 * actions across the site.
 *
 * Usage: with the app running (dev or start):
 *   BASE_URL=http://localhost:3000 npm run catalogue:pdf
 */
import "dotenv/config";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "public", "catalogue");
const OUT_FILE = path.join(OUT_DIR, "humuson-catalogue.pdf");
const PDF_URL = "/catalogue/humuson-catalogue.pdf";

const chromiumCandidates = [
  process.env.CHROMIUM_PATH,
  "/opt/pw-browsers/chromium",
  "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
].filter((p): p is string => Boolean(p));

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const executablePath = chromiumCandidates.find((p) => existsSync(p));
  const browser = await chromium.launch(
    executablePath ? { executablePath, args: ["--no-sandbox"] } : {},
  );
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/catalogue/print`, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500); // allow images to settle
  await page.pdf({
    path: OUT_FILE,
    preferCSSPageSize: true,
    printBackground: true,
  });
  await browser.close();
  console.log(`✓ PDF written to ${OUT_FILE}`);

  const prisma = new PrismaClient();
  try {
    const catalogue = await prisma.catalogue.findFirst({ where: { status: "PUBLISHED" } });
    if (catalogue) {
      await prisma.catalogue.update({ where: { id: catalogue.id }, data: { pdfUrl: PDF_URL } });
      console.log(`✓ catalogue.pdfUrl set to ${PDF_URL}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
