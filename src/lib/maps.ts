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

/**
 * A bounding box around a point, in the `minLng,minLat,maxLng,maxLat` order
 * OpenStreetMap's embed expects. `span` is roughly the width of the view in
 * degrees; latitude is narrowed by cos(lat) so the box stays square on the
 * ground rather than stretching east-west as you leave the equator.
 */
function bbox(pin: MapPin, span: number): string {
  const lngSpan = span;
  const latSpan = span * Math.cos((pin.lat * Math.PI) / 180);
  return [
    (pin.lng - lngSpan / 2).toFixed(5),
    (pin.lat - latSpan / 2).toFixed(5),
    (pin.lng + lngSpan / 2).toFixed(5),
    (pin.lat + latSpan / 2).toFixed(5),
  ].join(",");
}

/** How wide the view is, in degrees of longitude, per kind of place. */
const SPAN = { address: 0.012, settlement: 0.09, district: 0.35 } as const;

export type MapScale = keyof typeof SPAN;

/**
 * The OpenStreetMap embed URL for a pin.
 *
 * Why not Google: the keyless `maps.google.com/?output=embed` endpoint now
 * redirects to a response carrying `X-Frame-Options: SAMEORIGIN`, so browsers
 * refuse to render it and the panel goes blank. Google's supported embed wants
 * an API key on a billed Cloud project. OpenStreetMap frames without either,
 * which is why the map you can actually see is this one. "Open in Google Maps"
 * still points at Google, because that is where people want to end up.
 *
 * Takes a pin rather than a text query because this endpoint has no geocoder —
 * it draws the box it is given and nothing else.
 */
export function osmEmbedUrl(pin: MapPin, scale: MapScale = "address"): string {
  const params = new URLSearchParams({
    bbox: bbox(pin, SPAN[scale]),
    layer: "mapnik",
    marker: `${pin.lat},${pin.lng}`,
  });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
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
