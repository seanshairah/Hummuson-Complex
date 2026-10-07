import data from "../../content/town-coordinates.json";
import type { MapPin, MapScale } from "@/lib/maps";

/**
 * Where each stockist town is, so the finder can draw a map of it.
 *
 * These are OpenStreetMap's own coordinates for the places themselves, not
 * claims about anyone's business — which is why they need none of the
 * shop-by-shop verification the stockist addresses carry. `kind` records what
 * OSM actually matched: `district` means it has no settlement node under that
 * name, so the point is a district centroid and the map is drawn wider rather
 * than implying a fix it does not have.
 */
export interface TownPlace {
  pin: MapPin;
  scale: MapScale;
}

const TOWNS: Record<string, { lat: number; lng: number; kind: string }> = data.towns;

export function townPlace(town: string): TownPlace | null {
  const entry = TOWNS[town];
  if (!entry) return null;
  return {
    pin: { lat: entry.lat, lng: entry.lng },
    scale: entry.kind === "district" ? "district" : "settlement",
  };
}

/** Every town we hold a point for — used by the test that guards the coverage. */
export function knownTowns(): string[] {
  return Object.keys(TOWNS);
}
