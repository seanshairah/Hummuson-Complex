import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Standard editorial section opener: eyebrow → display heading → lede.
 * `tone="dark"` for humus-ground sections.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = "light",
  align = "left",
  size = "2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  tone?: "light" | "dark";
  align?: "left" | "center";
  size?: "1" | "2" | "3";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "text-eyebrow mb-4 flex items-center gap-3",
            align === "center" && "justify-center",
            dark ? "text-leaf-400" : "text-leaf-700",
          )}
        >
          <span aria-hidden className={cn("h-px w-8", dark ? "bg-leaf-400/60" : "bg-leaf-700/50")} />
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          size === "1" ? "text-display-1" : size === "2" ? "text-display-2" : "text-display-3",
          dark ? "text-paper" : "text-ink",
        )}
      >
        {title}
      </h2>
      {lede && (
        <p className={cn("mt-5 text-lg leading-relaxed", dark ? "text-paper/70" : "text-ink-soft")}>
          {lede}
        </p>
      )}
    </div>
  );
}

/** Italic serif accent inside display headings. */
export function Em({ children, className }: { children: ReactNode; className?: string }) {
  return <em className={cn("text-editorial", className)}>{children}</em>;
}
