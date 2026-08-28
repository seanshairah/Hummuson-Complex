/**
 * Static site constants. Anything the owner can edit lives in SiteSetting
 * rows (see src/server/data/settings.ts) — these are fallbacks and
 * build-time values only.
 */

/**
 * A hosting dashboard can hold an env var that is present but empty or
 * malformed; `new URL("")` in layout metadata then kills the whole build.
 * Treat anything that does not parse as unset.
 */
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw).toString().replace(/\/$/, "");
    } catch {
      // fall through to the production domain
    }
  }
  return "https://humusoncomplex.com";
}

const whatsappDigits = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/[^0-9]/g, "");

export const site = {
  name: "Humuson Complex",
  tagline: "Home of Healthy Soil & Healthy Crop",
  description:
    "Humuson Complex supplies biological crop nutrition — organic fertilisers, biostimulants and foliar feeds — with agronomic support for farmers in Zimbabwe and Southern Africa.",
  url: resolveSiteUrl(),
  whatsappNumber: whatsappDigits || "263776656433",
  /** WhatsApp Business catalogue share link (owner-editable in admin → settings). */
  whatsappCatalogueUrl: "https://wa.me/c/80084060872727",
  locale: "en_ZW",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}
