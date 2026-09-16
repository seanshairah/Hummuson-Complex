"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, ListFilter, Search, X } from "lucide-react";
import { Dialog, DialogTrigger, SheetContent } from "@/components/ui/dialog";
import { cn, humanize } from "@/lib/utils";
import type { FilterOptions } from "@/server/data/products";

export interface ActiveFilters {
  brand?: string;
  category?: string;
  crop?: string;
  benefit?: string;
  method?: string;
  stage?: string;
  q?: string;
}

interface Dimension {
  key: keyof ActiveFilters;
  label: string;
  /** Shown inside the popover and the mobile sheet, above the options. */
  placeholder?: string;
  options: { value: string; label: string; count?: number; indent?: boolean }[];
}

function useFilterNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      startTransition(() => {
        router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  return { setParam, isPending };
}

export function ProductFilterBar({
  options,
  active,
  resultCount,
}: {
  options: FilterOptions;
  active: ActiveFilters;
  resultCount: number;
}) {
  const { setParam, isPending } = useFilterNavigation();
  const [query, setQuery] = useState(active.q ?? "");
  const first = useRef(true);

  // Debounced search → URL
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => setParam("q", query.trim() || null), 350);
    return () => clearTimeout(t);
  }, [query, setParam]);

  const dimensions: Dimension[] = useMemo(
    () => [
      {
        key: "brand",
        label: "Brand",
        options: options.brands.map((o) => ({ value: o.name, label: o.name, count: o.count })),
      },
      {
        key: "category",
        label: "Range",
        options: options.categories.map((o) => ({ value: o.slug, label: o.name, count: o.count })),
      },
      {
        key: "crop",
        label: "Crop",
        placeholder: "Select a crop",
        // Already in taxonomy order from the server, so a child follows its
        // parent and only needs marking as one.
        options: options.crops.map((o) => ({
          value: o.slug,
          label: o.name.charAt(0).toUpperCase() + o.name.slice(1),
          count: o.count,
          indent: Boolean(o.parentSlug),
        })),
      },
      {
        key: "benefit",
        label: "Purpose",
        placeholder: "Select a purpose",
        options: options.benefits.map((o) => ({ value: o.slug, label: o.name, count: o.count })),
      },
      {
        key: "method",
        label: "Application",
        options: options.methods.map((o) => ({
          value: o.key,
          label: humanize(o.key),
          count: o.count,
        })),
      },
      {
        key: "stage",
        label: "Growth stage",
        options: options.stages
          .filter((o) => o.count > 0)
          .map((o) => ({ value: o.key, label: o.name, count: o.count })),
      },
    ],
    [options],
  );

  const activeCount = dimensions.filter((d) => active[d.key]).length;

  const clearAll = () => {
    setQuery("");
    const keys: (keyof ActiveFilters)[] = [
      "brand",
      "category",
      "crop",
      "benefit",
      "method",
      "stage",
      "q",
    ];
    // Build one URL without any filter keys.
    const params = new URLSearchParams(window.location.search);
    keys.forEach((k) => params.delete(k));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.size ? `?${params}` : ""}`,
    );
    // Trigger server re-render
    setParam("q", null);
  };

  return (
    <div className="sticky top-16 z-30 border-y border-line bg-paper/85 py-3 backdrop-blur-md md:top-[4.5rem]">
      <div className="container-site flex items-center gap-3">
        {/* Search */}
        <label className="relative min-w-0 flex-1 md:max-w-xs">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the range…"
            aria-label="Search products"
            className="h-10 w-full rounded-full border border-line bg-cream pr-4 pl-10 text-sm outline-none focus:border-leaf-600 focus:ring-2 focus:ring-leaf-500/25"
          />
        </label>

        {/* Desktop dimension pills */}
        <div className="hidden items-center gap-2 lg:flex">
          {dimensions.map((dimension) => (
            <FilterPopover
              key={dimension.key}
              dimension={dimension}
              value={active[dimension.key]}
              onChange={(value) => setParam(dimension.key, value)}
            />
          ))}
        </div>

        {/* Mobile filters sheet */}
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-full border border-line bg-cream px-4 text-sm font-medium text-ink lg:hidden"
            >
              <ListFilter className="size-4" />
              Filters
              {activeCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-leaf-400 text-[0.65rem] font-semibold text-humus-950">
                  {activeCount}
                </span>
              )}
            </button>
          </DialogTrigger>
          <SheetContent
            side="bottom"
            title="Filter products"
            description={`${resultCount} products match`}
          >
            <div className="space-y-6 pb-6">
              {dimensions.map((dimension) => (
                <fieldset key={dimension.key}>
                  <legend className="mb-2.5 text-eyebrow text-[0.65rem] text-ink-faint">
                    {dimension.label}
                  </legend>
                  {/*
                   * Crops arrive as the taxonomy, so they are broken back into
                   * groups here. Thirty chips in one run is a wall; eleven
                   * groups you can skim past is not.
                   */}
                  {groupOptions(dimension.options).map((group, i) => (
                    <div key={group.parent?.value ?? `loose-${i}`} className="mb-2 last:mb-0">
                      {group.parent && (
                        <FilterChip
                          option={group.parent}
                          selected={active[dimension.key] === group.parent.value}
                          onToggle={(next) => setParam(dimension.key, next)}
                        />
                      )}
                      {group.children.length > 0 && (
                        <div
                          className={cn(
                            "flex flex-wrap gap-2",
                            group.parent ? "mt-2 ml-3 border-l border-line pl-3" : "",
                          )}
                        >
                          {group.children.map((option) => (
                            <FilterChip
                              key={option.value}
                              option={option}
                              selected={active[dimension.key] === option.value}
                              onToggle={(next) => setParam(dimension.key, next)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </fieldset>
              ))}
            </div>
          </SheetContent>
        </Dialog>

        <span
          className={cn(
            "ml-auto hidden shrink-0 text-sm text-ink-faint transition-opacity sm:block",
            isPending && "opacity-40",
          )}
          aria-live="polite"
        >
          {resultCount} product{resultCount === 1 ? "" : "s"}
        </span>
        {(activeCount > 0 || active.q) && (
          <button
            type="button"
            onClick={clearAll}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-ink-faint transition-colors hover:text-danger"
          >
            <X className="size-3.5" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Split a flat, taxonomy-ordered option list back into parents and the children
 * that follow them. A list with no indented entries comes back as one group of
 * loose options, which is what every dimension other than crop is.
 */
function groupOptions(options: Dimension["options"]) {
  type Group = { parent: Dimension["options"][number] | null; children: Dimension["options"] };
  const nested = options.some((option) => option.indent);
  if (!nested) return [{ parent: null, children: options }] satisfies Group[];

  const groups: Group[] = [];
  for (const option of options) {
    const last = groups.at(-1);
    if (option.indent && last) last.children.push(option);
    else groups.push({ parent: option, children: [] });
  }
  return groups;
}

function FilterChip({
  option,
  selected,
  onToggle,
}: {
  option: Dimension["options"][number];
  selected: boolean;
  onToggle: (next: string | null) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(selected ? null : option.value)}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3.5 py-2 text-sm transition-colors",
        selected
          ? "border-humus-900 bg-humus-900 text-paper"
          : option.indent
            ? "border-line/70 bg-transparent text-ink-faint"
            : "border-line bg-cream font-medium text-ink-soft",
      )}
    >
      {option.label}
      {typeof option.count === "number" && (
        <span className="ml-1.5 text-xs opacity-60">{option.count}</span>
      )}
    </button>
  );
}

function FilterPopover({
  dimension,
  value,
  onChange,
}: {
  dimension: Dimension;
  value?: string;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = dimension.options.find((option) => option.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
            selected
              ? "border-humus-900 bg-humus-900 text-paper"
              : "border-line bg-cream text-ink-soft hover:border-ink/30",
          )}
        >
          {selected ? selected.label : dimension.label}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-40 max-h-80 w-60 overflow-y-auto rounded-2xl border border-line bg-cream p-1.5 shadow-pop data-[state=open]:animate-fade-in"
        >
          {selected && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-danger hover:bg-danger/5"
            >
              <X className="size-3.5" /> Clear {dimension.label.toLowerCase()}
            </button>
          )}
          {dimension.placeholder && !selected && (
            <p className="px-3 py-1.5 text-xs text-ink-faint">{dimension.placeholder}</p>
          )}
          {dimension.options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(isSelected ? null : option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl py-2 pr-3 text-left text-sm transition-colors",
                  option.indent ? "pl-7 text-ink-faint" : "pl-3 font-medium",
                  isSelected
                    ? "bg-leaf-300/40 font-medium text-ink"
                    : "text-ink-soft hover:bg-ink/4",
                )}
              >
                <span className="truncate">{option.label}</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-faint">
                  {typeof option.count === "number" && option.count}
                  {isSelected && <Check className="size-3.5 text-leaf-700" />}
                </span>
              </button>
            );
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
