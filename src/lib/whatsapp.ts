import { site } from "@/lib/site";

/** Builds a wa.me deep link with an optional prefilled message. */
export function whatsappLink(message?: string, number = site.whatsappNumber): string {
  const base = `https://wa.me/${number.replace(/[^0-9]/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function whatsappProductMessage(productName: string): string {
  return `Hello Humuson Complex, I would like more information about ${productName}.`;
}

export function whatsappAdviceMessage(context?: string): string {
  return context
    ? `Hello Humuson Complex, I would like application advice about ${context}.`
    : "Hello Humuson Complex, I would like to speak to an agronomy adviser.";
}

/**
 * Link to the WhatsApp Business catalogue. Prefer the owner-editable value
 * from ContactSettings where available; this is the static fallback.
 */
export function whatsappCatalogueLink(): string {
  return site.whatsappCatalogueUrl;
}
