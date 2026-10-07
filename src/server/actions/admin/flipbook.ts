"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { getPublishedCatalogue } from "@/server/data/catalogue";
import { designFromChapters } from "@/server/flipbook/load";
import type { FlipbookDesign } from "@/lib/flipbook/model";
import { parseDesign } from "@/lib/flipbook/schema";
import { revalidateContent } from "./helpers";

/**
 * The flipbook designer's actions. The designer autosaves a draft; readers
 * see nothing until it is published, and every publish keeps the design it
 * replaced as a revision, so any publish can be undone from the dashboard.
 */

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** A design this large is a runaway, not a catalogue. */
const MAX_DESIGN_BYTES = 3_000_000;
/** Revisions kept per catalogue; older ones are pruned on publish. */
const KEEP_REVISIONS = 50;
/**
 * Autosave runs every few seconds while someone works. One audit entry per
 * editing session says who edited the draft and when, without burying the
 * log in keystrokes; publishing is always logged.
 */
const DRAFT_AUDIT_GAP_MS = 15 * 60 * 1000;

async function currentCatalogue() {
  return db.catalogue.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { id: true, design: true, draftDesign: true, draftUpdatedAt: true, designVersion: true },
  });
}

function checkDesign(input: unknown): FlipbookDesign | string {
  const design = parseDesign(input);
  if (!design) return "That design could not be read.";
  if (design.pages.length === 0) return "A flipbook needs at least one page.";
  if (JSON.stringify(design).length > MAX_DESIGN_BYTES) return "The design is too large to save.";
  return design;
}

const json = (design: FlipbookDesign) => design as unknown as Prisma.InputJsonValue;

async function keepRevision(
  catalogueId: string,
  design: Prisma.JsonValue,
  version: number,
  note: string,
  actorEmail: string | null | undefined,
) {
  if (!design) return;
  await db.catalogueRevision.create({
    data: {
      catalogueId,
      design: design as Prisma.InputJsonValue,
      version,
      note,
      actorEmail: actorEmail ?? null,
    },
  });
  const stale = await db.catalogueRevision.findMany({
    where: { catalogueId },
    orderBy: { createdAt: "desc" },
    skip: KEEP_REVISIONS,
    select: { id: true },
  });
  if (stale.length) {
    await db.catalogueRevision.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
  }
}

function revalidateFlipbook() {
  revalidateContent("catalogue");
}

export async function saveFlipbookDraft(input: unknown): Promise<Result<{ savedAt: string }>> {
  await requireUser();
  const design = checkDesign(input);
  if (typeof design === "string") return { ok: false, error: design };
  const catalogue = await currentCatalogue();
  if (!catalogue) return { ok: false, error: "No catalogue exists yet." };

  const now = new Date();
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: { draftDesign: json(design), draftUpdatedAt: now },
  });
  const quiet =
    catalogue.draftUpdatedAt && now.getTime() - catalogue.draftUpdatedAt.getTime() < DRAFT_AUDIT_GAP_MS;
  if (!quiet) {
    await audit("flipbook.draft_saved", {
      entityType: "catalogue",
      entityId: catalogue.id,
      meta: { pages: design.pages.length },
    });
  }
  return { ok: true, savedAt: now.toISOString() };
}

export async function publishFlipbook(input: unknown): Promise<Result<{ version: number }>> {
  const user = await requireUser();
  const design = checkDesign(input);
  if (typeof design === "string") return { ok: false, error: design };
  const catalogue = await currentCatalogue();
  if (!catalogue) return { ok: false, error: "No catalogue exists yet." };

  const version = catalogue.designVersion + 1;
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: {
      design: json(design),
      designVersion: version,
      designPublishedAt: new Date(),
      draftDesign: Prisma.DbNull,
      draftUpdatedAt: null,
    },
  });
  // Every published design is kept as a revision, so the history is a list
  // of everything readers have seen, and any of it can be brought back.
  await keepRevision(catalogue.id, json(design) as Prisma.JsonValue, version, "Published", user.email);
  await audit("flipbook.published", {
    entityType: "catalogue",
    entityId: catalogue.id,
    meta: { version, pages: design.pages.length },
  });
  revalidateFlipbook();
  return { ok: true, version };
}

/** Throws the draft away; the designer goes back to the published design. */
export async function discardFlipbookDraft(): Promise<Result> {
  const user = await requireUser();
  const catalogue = await currentCatalogue();
  if (!catalogue) return { ok: false, error: "No catalogue exists yet." };
  if (catalogue.draftDesign) {
    await keepRevision(catalogue.id, catalogue.draftDesign, 0, "Discarded draft", user.email);
  }
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: { draftDesign: Prisma.DbNull, draftUpdatedAt: null },
  });
  await audit("flipbook.draft_discarded", { entityType: "catalogue", entityId: catalogue.id });
  return { ok: true };
}

/**
 * Replaces the draft with the catalogue laid out afresh from its chapters —
 * every range, every product, in the order the chapters hold them.
 */
export async function rebuildFlipbookDraft(): Promise<Result<{ design: FlipbookDesign }>> {
  const user = await requireUser();
  const catalogue = await currentCatalogue();
  const chapters = await getPublishedCatalogue();
  if (!catalogue || !chapters) return { ok: false, error: "No published catalogue to build from." };
  if (catalogue.draftDesign) {
    await keepRevision(catalogue.id, catalogue.draftDesign, 0, "Draft before a rebuild", user.email);
  }
  const design = designFromChapters(chapters);
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: { draftDesign: json(design), draftUpdatedAt: new Date() },
  });
  await audit("flipbook.rebuilt_from_ranges", {
    entityType: "catalogue",
    entityId: catalogue.id,
    meta: { pages: design.pages.length },
  });
  return { ok: true, design };
}

/** Loads an earlier design into the draft, to look over and publish. */
export async function restoreFlipbookRevision(
  revisionId: string,
): Promise<Result<{ design: FlipbookDesign }>> {
  const user = await requireUser();
  const catalogue = await currentCatalogue();
  if (!catalogue) return { ok: false, error: "No catalogue exists yet." };
  const revision = await db.catalogueRevision.findFirst({
    where: { id: revisionId, catalogueId: catalogue.id },
  });
  const design = revision ? parseDesign(revision.design) : null;
  if (!revision || !design) return { ok: false, error: "That revision could not be found." };
  if (catalogue.draftDesign) {
    await keepRevision(catalogue.id, catalogue.draftDesign, 0, "Draft before a restore", user.email);
  }
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: { draftDesign: json(design), draftUpdatedAt: new Date() },
  });
  await audit("flipbook.revision_restored", {
    entityType: "catalogue",
    entityId: catalogue.id,
    meta: { revisionId, version: revision.version },
  });
  return { ok: true, design };
}

/**
 * Stops using a designed flipbook: readers get the chapters laid out
 * automatically again. The design stays in the history.
 */
export async function revertToAutomaticFlipbook(): Promise<Result> {
  const user = await requireUser();
  const catalogue = await currentCatalogue();
  if (!catalogue) return { ok: false, error: "No catalogue exists yet." };
  if (!catalogue.design) return { ok: true };
  await keepRevision(
    catalogue.id,
    catalogue.design,
    catalogue.designVersion,
    "Set aside for the automatic layout",
    user.email,
  );
  await db.catalogue.update({
    where: { id: catalogue.id },
    data: {
      design: Prisma.DbNull,
      designVersion: catalogue.designVersion + 1,
      designPublishedAt: new Date(),
    },
  });
  await audit("flipbook.automatic_layout", { entityType: "catalogue", entityId: catalogue.id });
  revalidateFlipbook();
  return { ok: true };
}
