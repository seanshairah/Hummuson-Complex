import { cn } from "@/lib/utils";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    // `contain: content` is load-bearing, not a micro-optimisation. On a phone
    // Chrome sizes the layout viewport from the document's preferred width, and
    // a table wider than the screen contributes its full intrinsic width even
    // though this wrapper will scroll it. On /admin/users that made the layout
    // viewport 826px against a 412px screen, so every `position: fixed` element
    // — every dialog — centred against a box twice the width of the phone and
    // opened off the side of it. Containment tells the browser what the
    // overflow already implies: nothing in here affects layout outside it.
    <div className="w-full [contain:content] overflow-x-auto rounded-xl border border-line">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-paper-dim", className)} {...props} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-line bg-cream", className)} {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("transition-colors", className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-display text-xs font-medium tracking-wider text-ink-faint uppercase",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 align-middle text-ink-soft", className)} {...props} />;
}
