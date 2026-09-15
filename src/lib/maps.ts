/**
 * Google Maps deep links for the business location.
 *
 * A text search of the address is a guess: Google resolves it to whatever it
 * thinks matches, which on a Harare street with no listing can be the wrong
 * side of the road or the wrong suburb entirely. Coordinates are not a guess —
 * they are the pin. So every helper takes an optional `pin` and only falls
 * back to searching the address when no pin has been set.
 *
 * The pin is owner-editable (admin → Settings → Contact), because nobody
 * should have to deploy code to correct where the map points.
 */

export interface MapPin {
  /** Decimal degrees, as read off Google Maps ("right-click → the numbers"). */
  lat: number;
  lng: number;
  /** Optional share link (maps.app.goo.gl/…) — preferred for "open" actions. */
  url?: string | null;
}

/** `-17.8,31.05` — the form both the link and the embed accept. */
function coords(pin: MapPin): string {
  return `${pin.lat},${pin.lng}`;
}

/**
 * Where "Directions" / "Open in Google Maps" go. A share link wins when the
 * owner has pasted one, since it carries the actual place record (name,
 * photos, reviews); coordinates are the next best thing; the address query is
 * the last resort.
 */
export function googleMapsLink(query: string, pin?: MapPin | null): string {
  if (pin?.url) return pin.url;
  if (pin) return `https://www.google.com/maps/search/?api=1&query=${coords(pin)}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Keyless embed endpoint — loaded only after an explicit tap (data-friendly). */
export function googleMapsEmbedUrl(query: string, pin?: MapPin | null): string {
  const q = pin ? coords(pin) : encodeURIComponent(query);
  return `https://maps.google.com/maps?q=${q}&z=${pin ? 17 : 15}&output=embed`;
}

/**
 * Reads a pin out of the stored contact settings. Returns null unless both
 * coordinates are real, finite numbers in range — a half-filled or mistyped
 * setting must fall back to the address rather than point at the Gulf of
 * Guinea, which is where (0, 0) is.
 */
export function toMapPin(value: {
  mapsLat?: number | null;
  mapsLng?: number | null;
  mapsUrl?: string | null;
}): MapPin | null {
  const { mapsLat: lat, mapsLng: lng } = value;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng, url: value.mapsUrl ?? null };
}
