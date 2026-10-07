import { describe, expect, it } from "vitest";
import distributors from "../../content/distributors.json";
import coords from "../../content/town-coordinates.json";
import { knownTowns, townPlace } from "@/lib/town-coordinates";
import { osmEmbedUrl } from "@/lib/maps";

/**
 * The stockist map draws a bounding box, not a search — so a town with no point
 * has no map at all. That is a silent failure: the panel still renders, the
 * link still works, and nobody notices the map stopped appearing for one town.
 * These hold the coverage instead.
 */
describe("town coordinates", () => {
  const towns = [...new Set((distributors as { town: string }[]).map((d) => d.town))];

  it("covers every town a stockist is listed in", () => {
    const missing = towns.filter((town) => townPlace(town) === null);
    expect(missing).toEqual([]);
  });

  it("carries no point for a town no stockist is in", () => {
    const orphans = knownTowns().filter((town) => !towns.includes(town));
    expect(orphans).toEqual([]);
  });

  it("places every point inside Zimbabwe", () => {
    for (const town of towns) {
      const place = townPlace(town);
      expect(place, town).not.toBeNull();
      expect(place!.pin.lat, `${town} latitude`).toBeGreaterThan(-22.5);
      expect(place!.pin.lat, `${town} latitude`).toBeLessThan(-15.5);
      expect(place!.pin.lng, `${town} longitude`).toBeGreaterThan(25.2);
      expect(place!.pin.lng, `${town} longitude`).toBeLessThan(33.1);
    }
  });

  it("widens the view for a point that is only a district centroid", () => {
    const entries = Object.entries(coords.towns as Record<string, { kind: string }>);
    for (const [town, entry] of entries) {
      expect(townPlace(town)!.scale, town).toBe(
        entry.kind === "district" ? "district" : "settlement",
      );
    }
  });

  it("builds a frameable OSM url with the pin at the centre of its box", () => {
    const url = new URL(osmEmbedUrl({ lat: -18.97466, lng: 32.67047 }, "settlement"));
    expect(url.origin).toBe("https://www.openstreetmap.org");
    expect(url.searchParams.get("marker")).toBe("-18.97466,32.67047");
    const box = url.searchParams.get("bbox")!.split(",").map(Number) as number[];
    const [minLng, minLat, maxLng, maxLat] = [box[0]!, box[1]!, box[2]!, box[3]!];
    expect((minLng + maxLng) / 2).toBeCloseTo(32.67047, 4);
    expect((minLat + maxLat) / 2).toBeCloseTo(-18.97466, 4);
    expect(maxLng).toBeGreaterThan(minLng);
    expect(maxLat).toBeGreaterThan(minLat);
  });
});
