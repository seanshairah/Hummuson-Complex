import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PUBLISHED: "bg-leaf-300/50 text-leaf-800",
  DRAFT: "bg-paper-dim text-ink-faint",
  ARCHIVED: "bg-soil-300/30 text-soil-700",
  NEW: "bg-leaf-300/50 text-leaf-800",
  IN_PROGRESS: "bg-[#f5e5b8] text-soil-700",
  RESOLVED: "bg-paper-dim text-ink-faint",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 font-display text-xs font-medium",
        STYLES[status] ?? "bg-paper-dim text-ink-faint",
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ")}
    </span>
  );
}
