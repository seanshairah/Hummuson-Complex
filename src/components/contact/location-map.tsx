import { MapPanel } from "@/components/shared/map-panel";
import type { MapPin as MapPinCoords } from "@/lib/maps";

/**
 * The yard on a map, with the address and a directions link under it.
 *
 * All of the behaviour — the loading panel, the fade-in, the fallback when the
 * embed never arrives — lives in MapPanel, which the stockist finder uses too.
 * This page and that one had separate copies of the same iframe markup, and
 * only one of them got fixed when the broken-frame problem was found.
 */
export function LocationMap({
  query,
  address,
  pin,
}: {
  query: string;
  address: string;
  pin?: MapPinCoords | null;
}) {
  return <MapPanel query={query} pin={pin} caption={address} action="Directions" aspect="aspect-[16/10]" />;
}
