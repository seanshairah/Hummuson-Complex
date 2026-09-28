import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type Variant = "default" | "leaf" | "soil" | "outline" | "dark" | "glass";

const variants: Record<Variant, string> = {
  default: "bg-paper-dim text-ink-soft",
  leaf: "bg-leaf-300/60 text-leaf-800",
  soil: "bg-soil-300/30 text-soil-700",
  outline: "border border-line text-ink-faint",
  dark: "bg-humus-800 text-leaf-300",
  glass: "glass-dark text-paper",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-medium tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
