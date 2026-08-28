/**
 * Static site constants. Anything the owner can edit lives in SiteSetting
 * rows (see src/server/data/settings.ts) — these are fallbacks and
 * build-time values only.
 */
export const site = {
  name: "Humuson Complex",
  tagline: "Home of Healthy Soil & Healthy Crop",
  description:
    "Humuson Complex supplies biological crop nutrition — organic fertilisers, biostimulants and foliar feeds — with agronomic support for farmers in Zimbabwe and Southern Africa.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://humusoncomplex.com",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "263776656433",
  locale: "en_ZW",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, site.url).toString();
}
