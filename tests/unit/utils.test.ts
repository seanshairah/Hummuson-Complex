import { describe, expect, it } from "vitest";
import { slugify, stripHtml, truncate, formatPriceUsd, humanize, readingMinutes } from "@/lib/utils";
import { parseYouTubeId, youtubeThumbnail } from "@/lib/youtube";
import { whatsappLink, whatsappProductMessage } from "@/lib/whatsapp";

describe("slugify", () => {
  it("handles trademark symbols and spacing", () => {
    expect(slugify("BIO NPK POWDER S®")).toBe("bio-npk-powder-s");
    expect(slugify("Grow (Top Dressing)")).toBe("grow-top-dressing");
  });
});

describe("stripHtml", () => {
  it("flattens entities and tags", () => {
    expect(stripHtml("<p>Healthy&nbsp;soil &amp; crops&#8217;s</p>")).toBe("Healthy soil & crops's");
  });
});

describe("formatPriceUsd", () => {
  it("formats whole and fractional prices", () => {
    expect(formatPriceUsd(28)).toBe("$28");
    expect(formatPriceUsd("12.5")).toBe("$12.50");
    expect(formatPriceUsd(null)).toBeNull();
  });
});

describe("misc", () => {
  it("truncates on word boundaries", () => {
    expect(truncate("Healthy soil healthy crop", 14)).toBe("Healthy soil…");
  });
  it("humanizes enum keys", () => {
    expect(humanize("SEED_TREATMENT")).toBe("Seed treatment");
  });
  it("computes reading minutes", () => {
    expect(readingMinutes("<p>word </p>".repeat(400))).toBe(2);
  });
});

describe("parseYouTubeId", () => {
  it("parses common URL forms", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ?t=1")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://example.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(parseYouTubeId("not a url")).toBeNull();
  });
  it("builds thumbnails", () => {
    expect(youtubeThumbnail("dQw4w9WgXcQ")).toContain("hqdefault.jpg");
  });
});

describe("whatsapp", () => {
  it("builds prefilled deep links", () => {
    const link = whatsappLink(whatsappProductMessage("IN5"), "263 776 656 433");
    expect(link).toContain("https://wa.me/263776656433?text=");
    expect(decodeURIComponent(link)).toContain("information about IN5");
  });
});
