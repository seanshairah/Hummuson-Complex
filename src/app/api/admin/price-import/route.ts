import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { rateLimit, tooManyRequests } from "@/server/rate-limit";
import { writeAuditEvent } from "@/server/audit-log";
import { readWorkbook, XlsxError } from "@/lib/spreadsheet";
import { detectLayout } from "@/lib/price-import/columns";
import { buildPlan, type CatalogueProduct } from "@/lib/price-import/plan";

export const runtime = "nodejs";

/** A price sheet is a few dozen rows; anything near this is the wrong file. */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Reads an uploaded price sheet and returns a plan.
 *
 * Nothing is written to the catalogue here — the response is a proposal the
 * admin reviews and confirms, and applying it is a separate, audited action.
 * The split is the whole point: it puts a person between "the spreadsheet
 * says 17" and "the website says 17".
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const verdict = await rateLimit(
    [{ name: "price-import:user", subject: session.user.id, limit: 30, windowSeconds: 600 }],
    { failOpen: false },
  );
  if (!verdict.allowed) return tooManyRequests(verdict, "Too many uploads — please wait a moment.");

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 4MB)" }, { status: 413 });
  }

  const requestedSheet = Number(formData.get("sheet") ?? 0);
  const requestedPriceColumn = formData.get("priceColumn");

  let workbook;
  try {
    workbook = readWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    // XlsxError messages are written for the person who uploaded the file.
    if (error instanceof XlsxError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "That file could not be read." }, { status: 400 });
  }

  const sheetIndex =
    Number.isInteger(requestedSheet) &&
    requestedSheet >= 0 &&
    requestedSheet < workbook.sheets.length
      ? requestedSheet
      : 0;
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) return NextResponse.json({ error: "That workbook has no sheets." }, { status: 400 });

  const layout = detectLayout(sheet.rows);
  if (!layout) {
    return NextResponse.json(
      {
        error:
          "No header row found on that sheet. It needs a row naming the columns — a product column and a price column at minimum.",
        sheets: workbook.sheets.map((entry, index) => ({ index, name: entry.name })),
      },
      { status: 422 },
    );
  }
  if (layout.defaultPriceColumn === null) {
    return NextResponse.json(
      {
        error: `No price column found. The header row reads: ${layout.headers.filter(Boolean).join(", ")}.`,
        sheets: workbook.sheets.map((entry, index) => ({ index, name: entry.name })),
      },
      { status: 422 },
    );
  }

  const chosenColumn = (() => {
    const asNumber = Number(requestedPriceColumn);
    const offered = layout.priceColumns.some((column) => column.index === asNumber);
    return offered ? asNumber : layout.defaultPriceColumn!;
  })();

  const products = await db.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      brand: true,
      packageSizes: { orderBy: { order: "asc" }, select: { size: true, priceUsd: true } },
    },
  });

  const catalogue: CatalogueProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    packSizes: product.packageSizes.map((pack) => ({
      size: pack.size,
      priceUsd: pack.priceUsd === null ? null : Number(pack.priceUsd),
    })),
  }));

  const plan = buildPlan(sheet, layout, catalogue, chosenColumn);

  await writeAuditEvent({
    action: "product.prices.analysed",
    actorId: session.user.id,
    actorEmail: session.user.email,
    entityType: "product",
    label: file.name,
    requestHeaders: request.headers,
    meta: {
      kind: workbook.kind,
      sheet: sheet.name,
      priceColumn: plan.priceColumnHeader,
      rows: plan.rows.length,
      unmatched: plan.rows.filter((row) => row.match === "none").length,
      unmentioned: plan.unmentioned.length,
    },
  });

  return NextResponse.json({
    kind: workbook.kind,
    fileName: file.name,
    sheets: workbook.sheets.map((entry, index) => ({ index, name: entry.name })),
    sheetIndex,
    layout: {
      headers: layout.headers,
      headerRow: layout.headerRow,
      priceColumns: layout.priceColumns,
      chosenColumn,
    },
    plan,
    // The full list backs the "map this row by hand" picker, which is the
    // only way rows like "Ikar NPK 3-30-0+zn" ever reach the right product.
    products: catalogue.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      packSizes: product.packSizes,
    })),
  });
}
