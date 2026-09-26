import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";

import partnerIkar from "../../../public/images/brand/partner-ikar.png";
import partnerBioenergy from "../../../public/images/brand/Bioenergy_naujas-logotipas-3.jpg";
import partnerSapropel from "../../../public/images/brand/partner-433fd162.jpg";
import partnerArvensis from "../../../public/images/brand/partner-arvensis.png";
import partnerNando from "../../../public/images/brand/partner-nando.png";

/**
 * The producers Humuson distributes for, ordered by how much of the range each
 * one carries.
 *
 * Every logo gets its own height because they are different shapes: IKAR is a
 * tall stacked lockup, Sapropel and Arvensis are wide wordmarks. One shared
 * height would leave IKAR looking twice the size of the rest, so these are set
 * for equal optical weight rather than equal pixels. `sizes` follows from the
 * rendered width — `object-contain` inside a fixed height means the width is
 * the source aspect ratio, so it has to be worked out per logo.
 *
 * All five files have a white background (see scripts/assets/extract-brand-logos.mjs),
 * which shows as a pale chip against `bg-cream`; rounding every one of them
 * makes that read as deliberate instead of as a stray rectangle.
 */
const LOGOS: {
  src: StaticImageData;
  alt: string;
  compact: string;
  full: string;
  sizes: string;
}[] = [
  { src: partnerIkar, alt: "IKAR", compact: "h-11", full: "h-14", sizes: "64px" },
  { src: partnerBioenergy, alt: "Bioenergy LT", compact: "h-12", full: "h-16", sizes: "96px" },
  { src: partnerSapropel, alt: "Sapropel Organics", compact: "h-8", full: "h-10", sizes: "112px" },
  { src: partnerArvensis, alt: "Arvensis Agro", compact: "h-7", full: "h-9", sizes: "104px" },
  { src: partnerNando, alt: "Nando", compact: "h-7", full: "h-9", sizes: "80px" },
];

/**
 * The producer logos, in the two sizes the site shows them at: `compact` for
 * the strip at the foot of the home hero, where they stay greyed until you
 * point at them, and `full` for the "Our producers" section on
 * the About page, which is about the producers rather than the products.
 */
export function PartnerLogos({
  variant = "full",
  tone = "light",
}: {
  variant?: "compact" | "full";
  /** `dark` for the strip at the foot of the home hero: dimmed until pointed at. */
  tone?: "light" | "dark";
}) {
  const compact = variant === "compact";
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center",
        compact ? "gap-5 md:gap-6 lg:gap-8" : "gap-8 md:gap-10",
      )}
    >
      {LOGOS.map((logo) => (
        <Image
          key={logo.alt}
          src={logo.src}
          alt={logo.alt}
          sizes={logo.sizes}
          className={cn(
            "w-auto object-contain",
            compact
              ? cn(
                  logo.compact,
                  "rounded-md grayscale transition duration-300 hover:grayscale-0",
                  dark && "opacity-70 hover:opacity-100",
                )
              : cn(logo.full, "rounded-lg"),
          )}
        />
      ))}
    </div>
  );
}
