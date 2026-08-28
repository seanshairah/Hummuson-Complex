import { cn } from "@/lib/utils";

/**
 * Humuson wordmark: sprout-over-soil mark + set name. Used until/alongside
 * the original raster logo (public/images/brand/) where a crisp vector suits
 * the surface better; the admin can swap imagery via site settings.
 */
export function Logo({
  tone = "dark",
  compact = false,
  className,
}: {
  /** "dark" = ink text (light surfaces), "light" = paper text (dark surfaces) */
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  const text = tone === "dark" ? "text-ink" : "text-paper";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-9 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-[1.05rem] font-semibold tracking-tight", text)}>
            HUMUSON
          </span>
          <span
            className={cn(
              "font-display text-[0.6rem] font-medium tracking-[0.34em]",
              tone === "dark" ? "text-leaf-700" : "text-leaf-400",
            )}
          >
            COMPLEX
          </span>
        </span>
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={className}>
      <rect width="40" height="40" rx="12" fill="#122418" />
      {/* soil strata */}
      <path d="M8 29h24" stroke="#8F6A41" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M11 33h18" stroke="#6F5031" strokeWidth="2" strokeLinecap="round" opacity="0.75" />
      {/* stem */}
      <path d="M20 29V17" stroke="#84CC35" strokeWidth="2.4" strokeLinecap="round" />
      {/* leaves */}
      <path
        d="M20 20c0-4.5-3.2-7.4-8-7.9.3 4.9 3.4 7.9 8 7.9Z"
        fill="#A5E05F"
      />
      <path
        d="M20 16c0-4.2 3-6.9 7.5-7.4-.3 4.6-3.2 7.4-7.5 7.4Z"
        fill="#84CC35"
      />
    </svg>
  );
}
