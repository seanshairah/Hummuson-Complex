"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown after the label — a count, a region. */
  hint?: string;
}

/**
 * A searchable single-select.
 *
 * Exists because a list long enough to need filtering is also long enough that
 * rendering it as chips buries the end of it: twenty-one towns across five
 * wrapped rows is a wall to read before you find yours, and a native <select>
 * gives you no way to type past it.
 *
 * Keyboard behaviour is the whole point of writing this by hand rather than
 * styling a <select>: type to filter, arrows to move, Enter to choose, Escape
 * to leave it as it was. The active option is tracked by id through
 * `aria-activedescendant` so focus never leaves the text input — moving real
 * focus into the list is what breaks typing mid-search.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyLabel = "Nothing matches that",
  label,
  className,
  id,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Accessible name for the control. */
  label: string;
  className?: string;
  id?: string;
}) {
  const reactId = useId();
  const listId = `${id ?? reactId}-list`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    // Prefix matches first: typing "ma" should reach Marondera and Masvingo
    // before it reaches Kadoma, which merely contains the letters.
    const starts = options.filter((o) => o.label.toLowerCase().startsWith(q));
    const contains = options.filter(
      (o) => !o.label.toLowerCase().startsWith(q) && o.label.toLowerCase().includes(q),
    );
    return [...starts, ...contains];
  }, [options, query]);

  // Reopening should not resume someone else's half-typed search, and the
  // highlight should start on whatever is currently chosen.
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const index = matches.findIndex((o) => o.value === value);
    setActiveIndex(index >= 0 ? index : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function choose(index: number) {
    const option = matches[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          aria-label={label}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-3 rounded-full border border-line bg-cream px-4 text-left text-sm text-ink transition-colors hover:border-leaf-600",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-500",
            className,
          )}
        >
          <span className={cn("min-w-0 truncate", !selected && "text-ink-faint")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          // Never wider than the viewport, never narrower than its trigger, and
          // never taller than the space below it — a long list on a short phone
          // has to scroll inside the panel rather than off the screen.
          className="z-50 w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-cream shadow-pop animate-scale-in"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement)
              .querySelector<HTMLInputElement>("input")
              ?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
            <input
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveIndex((i) => Math.min(i + 1, matches.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveIndex((i) => Math.max(i - 1, 0));
                } else if (event.key === "Home") {
                  event.preventDefault();
                  setActiveIndex(0);
                } else if (event.key === "End") {
                  event.preventDefault();
                  setActiveIndex(matches.length - 1);
                } else if (event.key === "Enter") {
                  event.preventDefault();
                  choose(activeIndex);
                }
              }}
            />
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain p-1.5"
          >
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-faint">{emptyLabel}</p>
            ) : (
              matches.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <div
                    key={option.value}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm",
                      isActive ? "bg-humus-950 text-paper" : "text-ink",
                    )}
                  >
                    <span className="min-w-0 truncate">{option.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {option.hint && (
                        <span className={cn("text-xs", isActive ? "text-paper/60" : "text-ink-faint")}>
                          {option.hint}
                        </span>
                      )}
                      {isSelected && <Check className="size-4" strokeWidth={2.4} />}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
