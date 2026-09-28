import { stem } from "./tokenize";

/**
 * Agronomy-aware synonym groups. Every member of a group expands to the whole
 * group at query time, so "mealies dose" finds "maize application rate".
 * Kept deliberately small and reviewed — synonyms shape retrieval, not content.
 */
const GROUPS: string[][] = [
  ["maize", "mealies", "corn"],
  ["fertiliser", "fertilizer", "feed", "nutrition"],
  ["rate", "dose", "dosage", "quantity", "amount", "measurement"],
  ["apply", "application", "use", "usage", "instructions", "spray", "spraying"],
  ["foliar", "leaf", "leaves"],
  ["soil", "ground", "earth"],
  ["seed", "seeds", "seedling", "germination"],
  ["root", "roots", "rooting"],
  ["flower", "flowering", "bloom", "blossom"],
  ["yield", "harvest", "production", "output"],
  ["organic", "biological", "bio"],
  ["biostimulant", "stimulant", "booster"],
  ["vegetable", "veggies", "vegetables", "greens"],
  ["potato", "potatoes", "irish"],
  ["tomato", "tomatoes"],
  ["wheat", "cereal", "cereals", "grain", "grains"],
  ["legume", "legumes", "bean", "beans", "pulses", "cowpea", "soya", "soybean"],
  ["price", "cost", "pricing", "pay"],
  ["pack", "package", "packaging", "size", "sizes"],
  ["buy", "order", "purchase", "stockist", "available", "availability"],
  ["mix", "mixing", "compatible", "compatibility", "combine", "tank"],
  ["store", "storage", "keep", "shelf"],
  ["drought", "stress", "heat", "dry"],
  ["top", "topdressing"],
  ["basal", "planting", "plant"],
  ["knapsack", "sprayer", "pump"],
  ["humic", "humate", "humus"],
  ["fulvic", "fulvate"],
  ["nitrogen", "npk"],
  ["whatsapp", "contact", "phone", "call"],
];

const index = new Map<string, Set<string>>();
for (const group of GROUPS) {
  const stems = group.map(stem);
  for (const s of stems) {
    const existing = index.get(s) ?? new Set<string>();
    stems.forEach((other) => existing.add(other));
    index.set(s, existing);
  }
}

/** Expands a stemmed token to its synonym set (including itself). */
export function expandToken(token: string): string[] {
  const set = index.get(token);
  return set ? [...set] : [token];
}
