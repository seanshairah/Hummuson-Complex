import { describe, expect, it } from "vitest";
import { googleMapsEmbedUrl, googleMapsLink, toMapPin } from "@/lib/maps";

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

describe("googleMapsEmbedUrl", () => {
  it("zooms in further on a pin than on an address guess", () => {
    expect(googleMapsEmbedUrl(QUERY, toMapPin(YARD))).toContain("q=-17.77986,31.028776&z=17");
    expect(googleMapsEmbedUrl(QUERY, null)).toContain("&z=15");
  });

  it("stays on the CSP-allowed embed host", () => {
    // next.config.ts allows exactly https://maps.google.com in frame-src;
    // another host here renders as a blank card in production only.
    for (const pin of [toMapPin(YARD), null]) {
      expect(googleMapsEmbedUrl(QUERY, pin).startsWith("https://maps.google.com/maps?")).toBe(true);
    }
  });

  it("asks for an embeddable page", () => {
    expect(googleMapsEmbedUrl(QUERY, toMapPin(YARD))).toContain("output=embed");
  });
});
