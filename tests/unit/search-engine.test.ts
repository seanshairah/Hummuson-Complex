import { describe, expect, it } from "vitest";
import { buildIndex, search, type SearchDoc } from "@/lib/search/engine";
import { tokenize, normalizeText, stem } from "@/lib/search/tokenize";
import { expandToken } from "@/lib/search/synonyms";

const docs: SearchDoc[] = [
  {
    id: "p1",
    type: "product",
    title: "IN5",
    keywords: ["biostimulant", "foliar"],
    body: "Foliar biostimulant for stronger crops. Apply as a foliar spray.",
    href: "/products/in5",
  },
  {
    id: "p2",
    type: "product",
    title: "Grow Top Dressing",
    keywords: ["top dressing", "nitrogen"],
    body: "Organic top dressing fertiliser used on sugar beans and maize.",
    href: "/products/grow-top-dressing",
  },
  {
    id: "c1",
    type: "crop",
    title: "Maize",
    aliases: ["mealies", "corn"],
    body: "Maize growing guidance from seed to maturity.",
    href: "/crops/maize",
  },
  {
    id: "f1",
    type: "faq",
    title: "How do I apply IN5?",
    aliases: ["IN5 application", "how do I use IN5", "when do I spray IN5"],
    body: "Application guidance for IN5.",
    href: "/faq#how-do-i-apply-in5",
  },
  {
    id: "a1",
    type: "article",
    title: "Boost your potato yields with fulvic acid",
    body: "Fulvic acid improves nutrient uptake in potatoes.",
    href: "/knowledge/boost-your-potato-yields-with-fulvic-acid",
  },
];

const index = buildIndex(docs);

describe("tokenize", () => {
  it("normalizes, removes stopwords and stems plurals", () => {
    expect(tokenize("How do I apply IN5 to my tomatoes?")).toEqual(["apply", "in5", "tomato"]);
  });
  it("strips trademark symbols and punctuation", () => {
    expect(normalizeText("BIO NPK POWDER S® — rate?")).toBe("bio npk powder s rate");
  });
  it("stems agronomy terms conservatively", () => {
    expect(stem("beans")).toBe("bean");
    expect(stem("grass")).toBe("grass");
    expect(stem("flowering")).toBe("flower");
  });
});

describe("synonyms", () => {
  it("expands mealies to the maize group", () => {
    expect(expandToken(stem("mealies"))).toContain("maize");
  });
});

describe("search", () => {
  it("finds a product by exact name", () => {
    const results = search(index, "IN5");
    expect(results[0]?.doc.id).toBe("p1");
  });

  it("ranks the FAQ answer first for an application question", () => {
    const results = search(index, "How do I use IN5?");
    expect(results[0]?.doc.id).toBe("f1");
  });

  it("matches crops through synonyms (mealies → maize)", () => {
    const results = search(index, "mealies");
    expect(results.some((r) => r.doc.id === "c1")).toBe(true);
  });

  it("returns relevant mixed results for 'maize root'", () => {
    const results = search(index, "maize top dressing");
    expect(results[0]?.doc.id).toBe("p2");
  });

  it("supports typeahead prefix matching", () => {
    const results = search(index, "biostim", { prefix: true });
    expect(results.some((r) => r.doc.id === "p1")).toBe(true);
  });

  it("filters by type", () => {
    const results = search(index, "maize", { types: ["crop"] });
    expect(results.every((r) => r.doc.type === "crop")).toBe(true);
  });

  it("returns nothing for gibberish", () => {
    expect(search(index, "zzqx qqwv")).toHaveLength(0);
  });

  it("rewards full-coverage matches over partial ones", () => {
    const results = search(index, "potato yields");
    expect(results[0]?.doc.id).toBe("a1");
  });
});
