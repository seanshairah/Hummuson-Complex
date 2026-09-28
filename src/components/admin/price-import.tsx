"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/field";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/ui/table";
import { Spinner } from "@/components/ui/skeleton";
import { applyPriceImport } from "@/server/actions/admin/price-import";
import { idle, type AdminActionState } from "@/lib/admin-state";
import { cn, formatPriceUsd } from "@/lib/utils";
import type { Effect, ImportPlan, MatchKind, PlannedRow } from "@/lib/price-import/plan";

interface ProductOption {
  id: string;
  name: string;
  brand: string | null;
  packSizes: { size: string; priceUsd: number | null }[];
}

interface Analysis {
  kind: "xlsx" | "csv";
  fileName: string;
  sheets: { index: number; name: string }[];
  sheetIndex: number;
  layout: {
    headers: string[];
    headerRow: number;
    priceColumns: { index: number; header: string; retail: boolean; wholesale: boolean }[];
    chosenColumn: number;
  };
  plan: ImportPlan;
  products: ProductOption[];
}

/** Per-row state the admin can change: which product, and whether to apply. */
interface Decision {
  productId: string | null;
  selected: boolean;
}

const EFFECT_LABEL: Record<Effect, string> = {
  "update-price": "Price changes",
  "add-pack": "New pack size",
  unchanged: "Already correct",
  "no-product": "No product matched",
  "no-pack": "Pack size unreadable",
  "no-price": "No price in this column",
};

const MATCH_BADGE: Record<MatchKind, { label: string; variant: "leaf" | "soil" | "outline" }> = {
  exact: { label: "Matched", variant: "leaf" },
  possible: { label: "Check this", variant: "soil" },
  none: { label: "Unmatched", variant: "outline" },
};

/** A row can only be applied once it names a product, a pack and a price. */
function applicable(row: PlannedRow, decision: Decision): boolean {
  return Boolean(decision.productId) && row.pack !== null && row.price !== null;
}

export function PriceImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnmentioned, setShowUnmentioned] = useState(false);

  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(
    applyPriceImport,
    idle,
  );

  const analyse = useCallback(async (target: File, sheet: number, priceColumn?: number) => {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", target);
      body.append("sheet", String(sheet));
      if (priceColumn !== undefined) body.append("priceColumn", String(priceColumn));
      const response = await fetch("/api/admin/price-import", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "That sheet could not be read.");

      const next = data as Analysis;
      setAnalysis(next);
      // Only an exact match with a real change starts ticked. A "check this"
      // match is a lead, and a lead that applies itself is just a guess with
      // extra steps.
      setDecisions(
        Object.fromEntries(
          next.plan.rows.map((row) => [
            row.rowNumber,
            {
              productId: row.product?.id ?? null,
              selected:
                row.match === "exact" &&
                (row.effect === "update-price" || row.effect === "add-pack"),
            },
          ]),
        ),
      );
    } catch (err) {
      setAnalysis(null);
      setError(err instanceof Error ? err.message : "That sheet could not be read.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      setAnalysis(null);
      setFile(null);
      setDecisions({});
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    }
  }, [state.status, router]);

  // Memoised so the two derivations below do not re-run on every render:
  // `?? []` builds a fresh array each time and would defeat their deps.
  const rows = useMemo(() => analysis?.plan.rows ?? [], [analysis]);

  const selectedChanges = useMemo(() => {
    if (!analysis) return [];
    return rows.flatMap((row) => {
      const decision = decisions[row.rowNumber];
      if (!decision?.selected || !applicable(row, decision)) return [];
      return [
        {
          productId: decision.productId!,
          packSize: row.pack!.label,
          priceUsd: row.price!,
        },
      ];
    });
  }, [analysis, rows, decisions]);

  const counts = useMemo(() => {
    const by = (effect: Effect) => rows.filter((row) => row.effect === effect).length;
    return {
      changes: by("update-price"),
      newPacks: by("add-pack"),
      unchanged: by("unchanged"),
      unmatched: rows.filter((row) => row.match === "none").length,
      review: rows.filter((row) => row.match === "possible").length,
    };
  }, [rows]);

  const setDecision = (rowNumber: number, patch: Partial<Decision>) =>
    setDecisions((current) => ({
      ...current,
      [rowNumber]: {
        ...(current[rowNumber] ?? { productId: null, selected: false }),
        ...patch,
      },
    }));

  return (
    <div className="space-y-8">
      {/* Step 1 — the file */}
      <section className="rounded-2xl border border-line bg-cream p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold text-ink">
              {analysis ? analysis.fileName : "Upload a price sheet"}
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {analysis
                ? `${analysis.kind.toUpperCase()} · header on row ${analysis.layout.headerRow + 1} · reading the "${analysis.plan.priceColumnHeader}" column`
                : "An .xlsx or .csv with a row naming the columns — a product column, a pack size, and a price."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                const chosen = event.target.files?.[0] ?? null;
                setFile(chosen);
                if (chosen) void analyse(chosen, 0);
              }}
            />
            <Button
              variant={analysis ? "outline" : "primary"}
              size="sm"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {busy ? <Spinner className="size-4" /> : <Upload className="size-4" />}
              {analysis ? "Choose another file" : "Choose file"}
            </Button>
          </div>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {analysis && (
          <div className="mt-5 flex flex-wrap items-end gap-4 border-t border-line pt-5">
            {analysis.sheets.length > 1 && (
              <label className="block space-y-1.5">
                <span className="block text-sm font-medium text-ink">Sheet</span>
                <NativeSelect
                  className="w-52"
                  value={analysis.sheetIndex}
                  onChange={(event) => {
                    if (file) void analyse(file, Number(event.target.value));
                  }}
                >
                  {analysis.sheets.map((sheet) => (
                    <option key={sheet.index} value={sheet.index}>
                      {sheet.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            <label className="block space-y-1.5">
              <span className="block text-sm font-medium text-ink">Price column to publish</span>
              <NativeSelect
                className="w-64"
                value={analysis.layout.chosenColumn}
                onChange={(event) => {
                  if (file) void analyse(file, analysis.sheetIndex, Number(event.target.value));
                }}
              >
                {analysis.layout.priceColumns.map((column) => (
                  <option key={column.index} value={column.index}>
                    {column.header}
                    {column.wholesale ? " — wholesale" : column.retail ? " — retail" : ""}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {analysis.layout.priceColumns.some((column) => column.wholesale) && (
              <p className="max-w-sm text-xs text-ink-faint">
                This sheet has a wholesale column too. The site publishes retail prices — pick
                wholesale only if you mean to show trade pricing publicly.
              </p>
            )}
          </div>
        )}
      </section>

      {analysis && (
        <>
          {/* Step 2 — what it proposes */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="leaf">{counts.changes} price changes</Badge>
              {counts.newPacks > 0 && (
                <Badge variant="leaf">{counts.newPacks} new pack sizes</Badge>
              )}
              {counts.unchanged > 0 && (
                <Badge variant="outline">{counts.unchanged} already correct</Badge>
              )}
              {counts.review > 0 && <Badge variant="soil">{counts.review} to check</Badge>}
              {counts.unmatched > 0 && (
                <Badge variant="outline">{counts.unmatched} unmatched</Badge>
              )}
            </div>

            <Table>
              <THead>
                <Tr>
                  <Th className="w-10" />
                  <Th className="w-14">Row</Th>
                  <Th>In the sheet</Th>
                  <Th>Product</Th>
                  <Th>Pack</Th>
                  <Th className="text-right">Now</Th>
                  <Th className="text-right">New</Th>
                  <Th>Status</Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const decision = decisions[row.rowNumber] ?? {
                    productId: null,
                    selected: false,
                  };
                  const canApply = applicable(row, decision);
                  const badge = MATCH_BADGE[row.match];
                  return (
                    <Tr
                      key={row.rowNumber}
                      data-testid={`import-row-${row.rowNumber}`}
                      className={cn(
                        row.match === "possible" && "bg-soil-300/10",
                        row.match === "none" && "bg-paper-dim/60",
                      )}
                    >
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Apply row ${row.rowNumber}`}
                          className="size-4 accent-leaf-600 disabled:opacity-30"
                          checked={decision.selected && canApply}
                          disabled={!canApply}
                          onChange={(event) =>
                            setDecision(row.rowNumber, { selected: event.target.checked })
                          }
                        />
                      </Td>
                      <Td className="text-ink-faint tabular-nums">{row.rowNumber}</Td>
                      <Td>
                        <span className="font-medium text-ink">{row.rawName}</span>
                        {row.sheetBrand && (
                          <span className="ml-1.5 text-xs text-ink-faint"> {row.sheetBrand}</span>
                        )}
                      </Td>
                      <Td>
                        <NativeSelect
                          className="min-w-48 py-1.5 text-xs"
                          value={decision.productId ?? ""}
                          onChange={(event) =>
                            setDecision(row.rowNumber, {
                              productId: event.target.value || null,
                              selected: Boolean(event.target.value),
                            })
                          }
                        >
                          <option value="">— not in the catalogue —</option>
                          {row.alternatives.length > 0 && (
                            <optgroup label="Closest">
                              {row.alternatives.map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          <optgroup label="All products">
                            {analysis.products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                                {product.brand ? ` — ${product.brand}` : ""}
                              </option>
                            ))}
                          </optgroup>
                        </NativeSelect>
                        {row.brandMismatch && (
                          <p className="mt-1 text-[0.68rem] leading-tight text-ink-faint">
                            Sheet says {row.brandMismatch.sheet}; catalogue says{" "}
                            {row.brandMismatch.catalogue ?? "no brand"}. Brands are not changed by
                            an import.
                          </p>
                        )}
                      </Td>
                      <Td className="max-w-56">
                        <span className={cn(row.effect === "no-pack" && "text-ink-faint")}>
                          {row.pack ? row.pack.label : (row.rawUnit ?? "not stated")}
                        </span>
                        {row.packNote && (
                          <p className="mt-1 text-[0.68rem] leading-tight text-soil-700">
                            {row.packNote}
                          </p>
                        )}
                      </Td>
                      <Td className="text-right text-ink-faint tabular-nums">
                        {formatPriceUsd(row.currentPrice) ?? "—"}
                      </Td>
                      <Td
                        className={cn(
                          "text-right font-medium tabular-nums",
                          row.effect === "update-price" && "text-leaf-700",
                        )}
                      >
                        {formatPriceUsd(row.price) ?? "—"}
                      </Td>
                      <Td>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        <span className="mt-1 block text-[0.68rem] text-ink-faint">
                          {EFFECT_LABEL[row.effect]}
                        </span>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </section>

          {/* Step 3 — what the sheet is silent about */}
          <section className="rounded-2xl border border-line bg-paper-dim/40 p-6">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left"
              onClick={() => setShowUnmentioned((open) => !open)}
              aria-expanded={showUnmentioned}
            >
              <span>
                <span className="font-display text-base font-semibold text-ink">
                  {analysis.plan.unmentioned.length} products this sheet does not mention
                </span>
                <span className="mt-1 block text-sm text-ink-soft">
                  Their prices stay exactly as they are. Worth a look — a price list that skips a
                  product is how a stale price survives a repricing.
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-leaf-700">
                {showUnmentioned ? "Hide" : "Show"}
              </span>
            </button>

            {showUnmentioned && analysis.plan.unmentioned.length > 0 && (
              <ul
                data-testid="import-unmentioned"
                className="mt-5 grid gap-2 border-t border-line pt-5 sm:grid-cols-2"
              >
                {analysis.plan.unmentioned.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-ink">
                      {product.name}
                      {product.brand && (
                        <span className="ml-1.5 text-xs text-ink-faint">{product.brand}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-ink-faint tabular-nums">
                      {product.packSizes.length === 0
                        ? "no packs"
                        : product.packSizes
                            .map((pack) => `${pack.size} ${formatPriceUsd(pack.priceUsd) ?? "—"}`)
                            .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Step 4 — apply */}
          <form action={formAction} className="flex flex-wrap items-center justify-between gap-4">
            <input
              type="hidden"
              name="payload"
              value={JSON.stringify({
                source: `${analysis.fileName} — ${analysis.plan.priceColumnHeader}`,
                changes: selectedChanges,
              })}
            />
            <p className="text-sm text-ink-soft">
              {selectedChanges.length === 0
                ? "Nothing is ticked yet."
                : `${selectedChanges.length} change${selectedChanges.length === 1 ? "" : "s"} ready to apply. Only prices and pack sizes are written.`}
            </p>
            <div className="flex items-center gap-3">
              {state.status === "error" && (
                <span className="text-sm font-medium text-danger">{state.message}</span>
              )}
              <Button type="submit" disabled={pending || selectedChanges.length === 0}>
                {pending ? <Spinner className="size-4" /> : <CheckCircle2 className="size-4" />}
                Apply {selectedChanges.length > 0 ? selectedChanges.length : ""} change
                {selectedChanges.length === 1 ? "" : "s"}
              </Button>
            </div>
          </form>
        </>
      )}

      {!analysis && !busy && !error && (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center">
          <FileSpreadsheet className="mx-auto size-10 text-ink-faint/50" strokeWidth={1.25} />
          <p className="mt-3 text-sm text-ink-soft">
            Nothing loaded yet. Choose a sheet and you will get a line-by-line preview before
            anything changes.
          </p>
        </div>
      )}

      {state.status === "success" && (
        <p className="flex items-center gap-2 rounded-lg bg-leaf-300/30 p-3 text-sm font-medium text-leaf-800">
          <CheckCircle2 className="size-4" /> {state.message}
        </p>
      )}
    </div>
  );
}
