"use server";

import { z } from "zod";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import type { AdminActionState } from "@/lib/admin-state";
import { formString, revalidateContent } from "./helpers";

const PRODUCT_TAGS = ["products", "catalogue", "faqs", "crops"];

/**
 * One confirmed change. The client sends what the admin agreed to, not the
 * spreadsheet — the sheet has already done its job by the time this runs, and
 * re-reading it here would let a row nobody approved back in.
 */
const changeSchema = z.object({
  productId: z.string().min(1),
  packSize: z.string().trim().min(1).max(80),
  priceUsd: z.number().positive().max(1_000_000),
});

const payloadSchema = z.object({
  source: z.string().trim().max(200),
  changes: z.array(changeSchema).min(1, "Nothing was selected to apply").max(500),
});

/**
 * Applies the confirmed rows of a price-sheet import.
 *
 * Only prices move. Names, descriptions, composition and brand come from the
 * audited content contract and a spreadsheet cell is not evidence for any of
 * them — the March 2026 sheet files Fosto under Ikar, which is not how the
 * owner brands it, and an importer that "just updated everything" would have
 * quietly overwritten that.
 *
 * Packs the sheet does not mention are left alone. Deleting a pack because a
 * price list omitted it would read the sheet as the whole truth about a
 * product, and it never is: the March 2026 list covers 1 L and is silent on
 * every 5 L in the range.
 */
export async function applyPriceImport(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireUser();

  let payload: unknown;
  try {
    payload = JSON.parse(formString(formData, "payload") || "{}");
  } catch {
    return { status: "error", message: "The confirmed changes could not be read. Try again." };
  }

  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Those changes could not be applied.",
    };
  }
  const { source, changes } = parsed.data;

  const productIds = [...new Set(changes.map((change) => change.productId))];
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, packageSizes: { select: { id: true, size: true } } },
  });
  const known = new Map(products.map((product) => [product.id, product]));

  const missing = productIds.filter((id) => !known.has(id));
  if (missing.length > 0) {
    return {
      status: "error",
      message: `${missing.length} of those products no longer exist. Re-upload the sheet and review again.`,
    };
  }

  let updated = 0;
  let added = 0;

  for (const productId of productIds) {
    const product = known.get(productId)!;
    const forProduct = changes.filter((change) => change.productId === productId);

    await db.$transaction(async (tx) => {
      for (const change of forProduct) {
        const existing = product.packageSizes.find(
          (pack) => pack.size.toLowerCase() === change.packSize.toLowerCase(),
        );
        if (existing) {
          await tx.packageSize.update({
            where: { id: existing.id },
            data: { priceUsd: change.priceUsd },
          });
          updated++;
        } else {
          await tx.packageSize.create({
            data: {
              productId,
              size: change.packSize,
              priceUsd: change.priceUsd,
              order: product.packageSizes.length,
            },
          });
          added++;
        }
      }

      // The headline price is the cheapest pack that has one, so the card can
      // honestly say "from". Recomputed here because a new pack may undercut
      // whatever it was before.
      const packs = await tx.packageSize.findMany({
        where: { productId },
        select: { priceUsd: true },
      });
      const priced = packs
        .map((pack) => (pack.priceUsd === null ? null : Number(pack.priceUsd)))
        .filter((price): price is number => price !== null);
      await tx.product.update({
        where: { id: productId },
        data: { priceUsd: priced.length > 0 ? Math.min(...priced) : null },
      });
    });
  }

  await audit("product.prices.imported", {
    entityType: "product",
    label: source || "price sheet",
    meta: {
      products: productIds.length,
      packsRepriced: updated,
      packsAdded: added,
      // Kept in full so the log answers "what did that import actually do"
      // without needing the original file.
      changes: changes.map((change) => ({
        product: known.get(change.productId)?.name ?? change.productId,
        pack: change.packSize,
        priceUsd: change.priceUsd,
      })),
    },
  });

  revalidateContent(...PRODUCT_TAGS);

  const parts = [
    `${productIds.length} product${productIds.length === 1 ? "" : "s"} updated`,
    updated > 0 ? `${updated} pack price${updated === 1 ? "" : "s"} changed` : null,
    added > 0 ? `${added} pack${added === 1 ? "" : "s"} added` : null,
  ].filter(Boolean);

  return { status: "success", message: `${parts.join(", ")}.` };
}
