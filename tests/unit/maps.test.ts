import { describe, expect, it } from "vitest";
import { googleMapsLink, osmEmbedUrl, toMapPin } from "@/lib/maps";

/**
 * The map pin decides where every "find us" link on the site points. A pin that
 * silently degrades to a wrong number is worse than no pin at all — the address
 * fallback is at least visibly a search — so the guards in `toMapPin` are the
 * part worth testing.
 */

/** The yard: 78 Nemakonde Way, Harare. */
const YARD = { mapsLat: -17.77986, mapsLng: 31.028776, mapsUrl: null };
const QUERY = "Humuson Complex, 78 Nemakonde Way, Harare, Zimbabwe";

describe("toMapPin", () => {
  it("accepts a real pin", () => {
    expect(toMapPin(YARD)).toEqual({ lat: -17.77986, lng: 31.028776, url: null });
  });

  it("rejects a half-filled pin", () => {
    expect(toMapPin({ mapsLat: -17.77986, mapsLng: null })).toBeNull();
    expect(toMapPin({ mapsLat: null, mapsLng: 31.028776 })).toBeNull();
    expect(toMapPin({})).toBeNull();
  });

  it("rejects (0, 0) — a cleared form, not a location in the Gulf of Guinea", () => {
    expect(toMapPin({ mapsLat: 0, mapsLng: 0 })).toBeNull();
  });

  it("keeps a real coordinate that happens to have a zero component", () => {
    expect(toMapPin({ mapsLat: 0, mapsLng: 31.028776 })).not.toBeNull();
  });

  it("rejects out-of-range and non-finite values", () => {
    expect(toMapPin({ mapsLat: 91, mapsLng: 31 })).toBeNull();
    expect(toMapPin({ mapsLat: -17, mapsLng: 181 })).toBeNull();
    expect(toMapPin({ mapsLat: Number.NaN, mapsLng: 31 })).toBeNull();
    expect(toMapPin({ mapsLat: Number.POSITIVE_INFINITY, mapsLng: 31 })).toBeNull();
  });

  it("rejects coordinates that arrived as strings", () => {
    expect(toMapPin({ mapsLat: "-17.77986" as unknown as number, mapsLng: 31.028776 })).toBeNull();
  });
});

describe("googleMapsLink", () => {
  it("prefers the owner's share link when one is set", () => {
    const pin = toMapPin({ ...YARD, mapsUrl: "https://maps.app.goo.gl/abc123" });
    expect(googleMapsLink(QUERY, pin)).toBe("https://maps.app.goo.gl/abc123");
  });

  it("uses coordinates over the address when a pin is set", () => {
    const link = googleMapsLink(QUERY, toMapPin(YARD));
    expect(link).toContain("query=-17.77986,31.028776");
    expect(link).not.toContain("Nemakonde");
  });

  it("falls back to an encoded address search with no pin", () => {
    const link = googleMapsLink(QUERY, null);
    expect(link).toContain(encodeURIComponent(QUERY));
  });
});

describe("osmEmbedUrl", () => {
  const pin = toMapPin(YARD)!;

  it("stays on the CSP-allowed frame host", () => {
    // next.config.ts allows exactly https://www.openstreetmap.org in frame-src;
    // another host here renders as a blank card in production only. It listed
    // maps.google.com until Google's keyless embed began refusing to frame.
    expect(osmEmbedUrl(pin).startsWith("https://www.openstreetmap.org/export/embed.html?")).toBe(
      true,
    );
  });

  it("marks the pin and centres the box on it", () => {
    const url = new URL(osmEmbedUrl(pin));
    expect(url.searchParams.get("marker")).toBe("-17.77986,31.028776");
    const box = url.searchParams.get("bbox")!.split(",").map(Number) as number[];
    expect((box[0]! + box[2]!) / 2).toBeCloseTo(31.028776, 4);
    expect((box[1]! + box[3]!) / 2).toBeCloseTo(-17.77986, 4);
  });

  it("draws a yard tighter than a town, and a town tighter than a district", () => {
    const width = (scale: Parameters<typeof osmEmbedUrl>[1]) => {
      const box = new URL(osmEmbedUrl(pin, scale)).searchParams
        .get("bbox")!
        .split(",")
        .map(Number) as number[];
      return box[2]! - box[0]!;
    };
    expect(width("address")).toBeLessThan(width("settlement"));
    expect(width("settlement")).toBeLessThan(width("district"));
  });

  it("keeps the box square on the ground at Zimbabwe's latitude", () => {
    // Longitude degrees shrink with latitude; an unadjusted box would render
    // noticeably wider than it is tall this far south.
    const box = new URL(osmEmbedUrl(pin)).searchParams.get("bbox")!.split(",").map(Number) as number[];
    const lngKm = (box[2]! - box[0]!) * 111.32 * Math.cos((-17.77986 * Math.PI) / 180);
    const latKm = (box[3]! - box[1]!) * 110.57;
    expect(lngKm / latKm).toBeGreaterThan(0.9);
    expect(lngKm / latKm).toBeLessThan(1.1);
  });
});
