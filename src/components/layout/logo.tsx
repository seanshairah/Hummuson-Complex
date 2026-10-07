import Image from "next/image";
import { cn } from "@/lib/utils";
import logoColor from "../../../public/images/brand/logo-color.png";
import logoWhite from "../../../public/images/brand/logo-white.png";

/**
 * The original Humuson Complex logo (audited from the old site):
 * colour version for light surfaces, white version for dark surfaces.
 */
export function Logo({
  tone = "dark",
  className,
  priority = false,
}: {
  /** "dark" = for light surfaces (colour logo), "light" = for dark surfaces (white logo) */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  const src = tone === "light" ? logoWhite : logoColor;
  return (
    <Image
      src={src}
      alt="Humuson Complex"
      priority={priority}
      className={cn("h-9 w-auto md:h-10", className)}
      sizes="140px"
    />
  );
}

/** Compact sprout mark for favicons/avatars and tight UI spots. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={className}>
      <rect width="40" height="40" rx="12" fill="#005820" />
      <path d="M8 29h24" stroke="#C9A678" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 29V17" stroke="#A5E05F" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20 20c0-4.5-3.2-7.4-8-7.9.3 4.9 3.4 7.9 8 7.9Z" fill="#C4EE8E" />
      <path d="M20 16c0-4.2 3-6.9 7.5-7.4-.3 4.6-3.2 7.4-7.5 7.4Z" fill="#84CC35" />
    </svg>
  );
}
