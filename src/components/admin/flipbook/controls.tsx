"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Ban } from "lucide-react";
import { PALETTE } from "@/lib/flipbook/model";
import { cn } from "@/lib/utils";

/**
 * Compact controls for the designer's inspector. Every one is controlled and
 * reports a finished value; typing half a number never writes a broken one.
 */

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
      <span className="truncate text-xs text-ink-faint" title={hint ?? label}>
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-b border-line px-4 py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-eyebrow text-[0.62rem] text-ink-faint">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

const inputClass =
  "h-8 w-full min-w-0 rounded-lg border border-line bg-cream px-2 text-xs text-ink outline-none transition-colors focus:border-leaf-600";

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label: string;
}) {
  const [text, setText] = useState(String(round(value)));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(String(round(value)));
  }, [value]);
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        className={cn(inputClass, suffix && "pr-7")}
        value={text}
        min={min}
        max={max}
        step={step}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(String(round(value)));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const parsed = Number(e.target.value);
          if (e.target.value.trim() === "" || !Number.isFinite(parsed)) return;
          const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
          onChange(clamped);
        }}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[0.65rem] text-ink-faint">
          {suffix}
        </span>
      )}
    </label>
  );
}

const round = (n: number) => Math.round(n * 100) / 100;

export function TextInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <input
      aria-label={label}
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className={cn(inputClass, "pr-6")}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-leaf-600" : "bg-line",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-cream shadow transition-transform",
          checked ? "translate-x-[1.1rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-line bg-cream p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          title={option.title}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex h-7 min-w-0 flex-1 items-center justify-center rounded-md text-xs transition-colors",
            value === option.value ? "bg-humus-900 text-paper" : "text-ink-soft hover:bg-paper-dim",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

function splitColor(value: string | null): { hex: string; alpha: number } {
  if (!value) return { hex: "#000000", alpha: 100 };
  if (value.length === 9) {
    return { hex: value.slice(0, 7), alpha: Math.round((parseInt(value.slice(7), 16) / 255) * 100) };
  }
  return { hex: value, alpha: 100 };
}

function joinColor(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(100, Math.round(alpha)));
  if (a >= 100) return hex.toLowerCase();
  return `${hex.toLowerCase()}${Math.round((a / 100) * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

/**
 * A colour, with the brand palette a click away and an opacity slider.
 * `nullable` adds "none" — a text block with no background, a shape with no
 * outline.
 */
export function ColorInput({
  value,
  onChange,
  label,
  nullable = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  label: string;
  nullable?: boolean;
}) {
  const id = useId();
  const { hex, alpha } = splitColor(value);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${value ?? "none"}`}
          className={cn(inputClass, "flex items-center gap-2 text-left")}
        >
          <span
            className="size-4.5 shrink-0 rounded border border-ink/15"
            style={
              value
                ? {
                    background: `linear-gradient(${value}, ${value}), repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 50% / 8px 8px`,
                  }
                : undefined
            }
          >
            {!value && <Ban className="size-4 text-ink-faint" />}
          </span>
          <span className="truncate font-mono text-[0.68rem]">{value ?? "None"}</span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          className="z-[70] w-60 space-y-3 rounded-xl border border-line bg-cream p-3 shadow-pop"
        >
          <div className="grid grid-cols-9 gap-1">
            {PALETTE.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                title={swatch.name}
                aria-label={swatch.name}
                onClick={() => onChange(joinColor(swatch.value, value ? alpha : 100))}
                className={cn(
                  "size-5 rounded border border-ink/15 transition-transform hover:scale-110",
                  hex.toLowerCase() === swatch.value && value && "ring-2 ring-leaf-600 ring-offset-1",
                )}
                style={{ background: swatch.value }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="color"
              aria-label={`${label} picker`}
              value={hex}
              onChange={(e) => onChange(joinColor(e.target.value, value ? alpha : 100))}
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line bg-cream p-0.5"
            />
            <input
              aria-label={`${label} hex`}
              className={cn(inputClass, "font-mono")}
              value={draft}
              placeholder="#rrggbb"
              onChange={(e) => {
                setDraft(e.target.value);
                const v = e.target.value.trim().toLowerCase();
                if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/.test(v)) onChange(v);
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink-faint">
            Opacity
            <input
              type="range"
              min={0}
              max={100}
              value={value ? alpha : 100}
              disabled={!value}
              onChange={(e) => onChange(joinColor(hex, Number(e.target.value)))}
              className="flex-1 accent-leaf-700"
            />
            <span className="w-8 text-right tabular-nums">{value ? alpha : 100}%</span>
          </label>
          {nullable && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="w-full rounded-lg border border-line py-1.5 text-xs text-ink-soft hover:border-ink/30"
            >
              No colour
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink disabled:opacity-35 disabled:hover:bg-transparent",
        active && "bg-humus-900 text-paper hover:bg-humus-800 hover:text-paper",
        className,
      )}
    >
      {children}
    </button>
  );
}
