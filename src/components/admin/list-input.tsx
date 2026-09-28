"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/field";

/** Repeatable single-value rows submitted as multiple inputs with one name. */
export function ListInput({
  name,
  initial = [],
  placeholder,
  addLabel = "Add row",
}: {
  name: string;
  initial?: string[];
  placeholder?: string;
  addLabel?: string;
}) {
  const [rows, setRows] = useState<{ key: number; value: string }[]>(
    initial.length > 0 ? initial.map((value, i) => ({ key: i, value })) : [],
  );
  const [nextKey, setNextKey] = useState(initial.length);

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-2">
          <Input
            name={name}
            defaultValue={row.value}
            placeholder={placeholder}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
            aria-label="Remove row"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setRows((r) => [...r, { key: nextKey, value: "" }]);
          setNextKey((k) => k + 1);
        }}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-2 text-sm font-medium text-ink-faint transition-colors hover:border-leaf-600 hover:text-leaf-700"
      >
        <Plus className="size-3.5" /> {addLabel}
      </button>
    </div>
  );
}

/** Repeatable multi-column rows (parallel names, aligned by index). */
export function PairedListInput({
  columns,
  initial = [],
  addLabel = "Add row",
}: {
  columns: { name: string; placeholder: string; width?: string; type?: string }[];
  initial?: string[][];
  addLabel?: string;
}) {
  const [rows, setRows] = useState<{ key: number; values: string[] }[]>(
    initial.map((values, i) => ({ key: i, values })),
  );
  const [nextKey, setNextKey] = useState(initial.length);

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-center gap-2">
          {columns.map((column, c) => (
            <Input
              key={column.name}
              name={column.name}
              type={column.type}
              defaultValue={row.values[c] ?? ""}
              placeholder={column.placeholder}
              className={column.width ?? "flex-1"}
            />
          ))}
          <button
            type="button"
            onClick={() => setRows((r) => r.filter((_, i) => i !== index))}
            aria-label="Remove row"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => {
          setRows((r) => [...r, { key: nextKey, values: columns.map(() => "") }]);
          setNextKey((k) => k + 1);
        }}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 py-2 text-sm font-medium text-ink-faint transition-colors hover:border-leaf-600 hover:text-leaf-700"
      >
        <Plus className="size-3.5" /> {addLabel}
      </button>
    </div>
  );
}
