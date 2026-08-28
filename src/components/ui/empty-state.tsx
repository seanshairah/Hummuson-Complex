import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Sprout } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Designed empty/error state with a useful next action — never a dead end.
 */
export function EmptyState({
  icon: Icon = Sprout,
  title,
  description,
  action,
  tone = "light",
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center",
        dark ? "border-paper/20" : "border-line",
        className,
      )}
    >
      <span
        className={cn(
          "mb-5 flex size-14 items-center justify-center rounded-full",
          dark ? "bg-paper/10 text-leaf-400" : "bg-leaf-300/40 text-leaf-800",
        )}
      >
        <Icon className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h3 className={cn("text-title", dark ? "text-paper" : "text-ink")}>{title}</h3>
      {description && (
        <p className={cn("mt-2 max-w-md text-sm leading-relaxed", dark ? "text-paper/60" : "text-ink-faint")}>
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
