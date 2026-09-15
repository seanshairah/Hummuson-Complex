# Content migration

Full audit: `docs/audit/AUDIT.md` · item inventory: `docs/audit/CONTENT-INVENTORY.md`.

## Pipeline

1. **Extraction** — the old WordPress/WooCommerce site was read through its public REST
   APIs (`wp-json/wc/store/v1/products`, `wp-json/wp/v2/*`) plus page HTML for
   Elementor-built pages. Raw dumps live in `content/source/` for provenance.
2. **Normalisation** — `content/*.json` is the audited, deduplicated content contract
   (`scripts/migration/types.ts`). 35 product listings became 22 canonical products
   (`X`/`X-2` pack variants folded into `packSizes`, misspellings merged; every decision
   recorded in each record's `notes` and the audit).
3. **Import** — `scripts/migration/import.ts` (also the Prisma seed) loads the contract
   idempotently: media with dimensions + blur placeholders, structured pack sizes and
   application-guide rows, crop links, sanitized HTML, settings, and a generated default
   catalogue. Safe to re-run; child collections rebuild deterministically.
4. **Redirects** — every legacy URL in `content/old-url-map.json` (77) becomes a 301 in
   `next.config.ts` (trailing-slash variants included). Cart/checkout/account URLs map
   to `/contact` because v1 commerce is WhatsApp-led.

## Honesty rules (the important part)

- Verbatim-faithful fields: descriptions, composition, benefit claims, rates, outcomes,
  testimonials. Light grammar cleanup only; wording preserved.
- **Evidence-based structuring:** canonical benefits, growth stages and application
  methods are attached to a product only when its own text contains matching phrases
  (rule tables at the top of `import.ts`). Products without evidence stay unmapped and
  the UI shows "confirm with technical support".
- FAQ aliases are search phrasings (retrieval metadata), not content — the only place
  new text was authored.
- Excluded as theme placeholder (documented in the audit): the old `/pricing` SaaS
  table, lorem-ipsum working-process page, template service testimonials, and stock
  avatar photos. The four Zimbabwe-specific written reviews were kept, flagged for
  owner verification.
- Not migrated into prominent positions: the old site's unverifiable counters
  ("15 years", yield-percentage claims) — they remain only where Humuson originally
  published them (FAQ answers / product descriptions), never in new hero/stat UI.

## Known content gaps (from the audit — owner follow-ups)

1. Nine products have no published application rate (Bioenergy line, Grow+/CarboAmin) —
   the platform shows the confirm-with-support state; add rates in `/admin/products`.
2. Elais carries two conflicting published rates (0.5–1 L/ha vs 2–3 L/ha) — both kept
   verbatim; confirm with the producer and edit in admin.
3. Several pack sizes/prices unstated (e.g. the $120 Bio NPK listing) — left null.
   See **Pricing** below for what the 2026 list did and did not supersede.
4. WhatsApp catalogue (`wa.me/c/263776656433`) is not machine-readable server-side;
   product records carry a `whatsappRef` field and admin editing covers manual mapping.
   Official Meta Commerce API integration is the future path.
5. Portfolio items had no narrative text — imported as image-led results; enrich in
   `/admin/projects`.
6. Sweet potatoes is in the owner's crop list but no product's published text covers it,
   directly or under an umbrella — it is the one crop still listed under "other crops we
   supply". Name the products that suit it and they can be linked in `/admin/products`.

### The map pin

`content/company.json` carries `mapsLat` / `mapsLng` — the yard at 78 Nemakonde
Way, supplied by the owner from Google Maps (-17.77986, 31.028776), not derived
from the address. Every "find us" surface reads it through `toMapPin`: the
contact page's live map, the address links in the footer, on About and on
Contact, and the `geo` block in the Organization JSON-LD. With no pin they all
fall back to a text search of the address, which is a guess Google resolves —
on a Harare street with no listing, often to the wrong side of the road.

Two things follow. The pin is editable in admin → Settings → Contact, but the
whole `contact` settings block is replaced from `content/company.json` on every
import, exactly as the address and phone numbers are — so a correction made only
in admin is lost at the next content refresh. Make it in both, or in the content
file. And `mapsUrl` is deliberately empty: a Google Maps *directions* URL carries
the sender's own starting point, so pasting one there would hand every visitor
directions from wherever that person happened to be standing.

### Crop umbrellas

Supplier text names crops at two levels: an umbrella ("vegetables", "cereals") and
specific crops the owner sells into ("cabbage", "wheat"). Read literally, a product that
said "vegetables" was listed for a `vegetables` crop page and for none of the vegetables
the owner actually grows, so the specific pages stood empty. Umbrella terms are therefore
resolved to their members, using the members the owner's own taxonomy declares in
`content/crops.json` — the `aka` list on `brassicas` and `cucurbits` is where cauliflower,
cabbage, cucumber, butternut and watermelon come from, not from an outside source:

- **vegetables** was replaced outright, on the owner's instruction that the term is too
  broad to show: brassicas, cauliflower, broccoli, cabbage, cucurbits, cucumber,
  butternut, watermelon, leafy vegetables, tomato.
- **cereals**, **legumes** and **fruits** were kept and their members added alongside —
  wheat; sugar bean, pea, bean; fruit trees — because those labels read as accurate on
  their own and maize already sat beside "cereals".

This is a deduction about what a word covers, not a claim about a product: nothing was
listed for a crop its own text does not reach. Reversing any of it is an edit to
`suitableCrops` in `content/products.json` followed by a re-import.

## Pricing

Prices are USD **retail**, and every one of them is quoted from a source — none is
derived, extrapolated or rounded. Three sources are in play, in order of recency:

| Tag      | Source                                                                                                                                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF**  | "Price List March 2026" (`cost_price__distributors_price_feb_26.pdf`), retail column. The same sheet carries a wholesale column that the public site does not publish.                                                                                                                                        |
| **LIST** | The owner's typed price lists, 2026-09-09 (three batches) — pack sizes the PDF does not cover (5 L / 10 L / 20 L, sachets, A3 250 g) plus Mendelenium, Emaxx Ultra, Maxprolin and the Bio Energy line. Where the two overlap they agree, which is what establishes the PDF's retail column as the site price. |
| **OLD**  | Carried over from the legacy WooCommerce listing. Only where neither 2026 source gives a price.                                                                                                                                                                                                               |

The third batch (Perfect Stick 1 L $25, Master $33) changed no numbers — it restated two
figures the site already carried. That is still worth recording: both were OLD, and are
now confirmed current, which is the difference between a price nobody has checked since
the WooCommerce era and one the owner has just stood behind.

`Product.priceUsd` is the **cheapest priced pack**, and the card labels it "from" when
more than one size is priced — a bare number beside "1 L · 5 L" states a price the
product does not have.

### Importing the next sheet

`/admin/products/import` takes an .xlsx or .csv and produces a plan; nothing is written
until someone ticks rows and presses apply. The split is the feature. Reading the March
2026 sheet by hand turned up four places where an importer acting on its own would have
been confidently wrong, and each one is now a rule:

| What the sheet did                                                | What the importer does                                                                                                              |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Carried retail **and** wholesale columns                          | Defaults to retail, names the column it read, and says so when a wholesale column exists                                            |
| Wrote "NPK 3-30-0+zn", meaning IN5                                | Refuses to match on a word several products share, so the row arrives unmatched with a picker rather than repricing NPK 12-11-30+TE |
| Put the header on row 4, under a title                            | Scores the first fifteen rows and picks the header; a sheet with none is rejected, not read from row 1                              |
| Listed CarboAmin's sachet as "160" under a column headed "UNIT l" | Flags it: the product has a 160 ml pack, and 160 L is not a pack size                                                               |

Beyond that: a pack is found by the quantity it parses to, so the sheet's "80ml" reaches
the catalogue's "80 ml sachet (per 16 L knapsack)" instead of adding a second one. A pack
the sheet omits is left alone. Only prices and pack sizes are written — names,
descriptions and brands are not, and a brand the sheet disagrees with is shown beside the
row rather than applied. Both halves are in the audit log: what was analysed, and what
was applied.

The **products this sheet does not mention** panel exists because of Bacto-K, which held a
legacy $150 through a full repricing simply because nothing listed what the new list had
failed to cover.

`.xlsx` is read in-repo (`src/lib/spreadsheet`). It is a ZIP of XML and Node ships
`zlib`; the npm alternatives were a maintained parser bringing 97 transitive packages or
the abandoned `xlsx@0.18.5` with open prototype-pollution and ReDoS advisories.

### Two rows in the PDF resolve open questions

- "Ikar NPK 3-30-0+zn" is **IN5** — its composition (P₂O₅ 30 %, N 3 %, Zn 0.5 %) is that
  formulation exactly. That gives IN5 the 1 L price its old listing showed as $0.00.
- The PDF lists **NPK 12-11-30+TE** and **Fosto** under Ikar, and **Grow Plus** and
  **Carbo Amin** under Humuson. The site brands the first two "Humuson Complex" and the
  second two "Sapropel Organics", on the owner's explicit instruction. Prices were taken
  from these rows; **brands were left as the owner set them.** Worth a confirmation.

### Still outstanding

1. **Seven 5 L prices are still OLD** — Silicare $69, Mendelenium $79, Bora $72,
   Koral $54, IN5 $54, Elais $50, Perfect Stick $110. Every 5 L the owner has since
   repriced went **up** (Bigo W 121→125, Ocean 90→96, Enzo Pro 81→95), and the 1 L prices
   beside these seven are all confirmed for 2026, so these are the numbers most likely to
   be understated. Note the shape of it: the owner has now confirmed a 1 L price for every
   IKAR product and a 5 L for only three of ten — the gap is systematic, not scattered.
2. **Master** has a confirmed price ($33) and no pack size, stated nowhere in any source.
   It therefore renders as a plain price rather than a per-pack one — the only product in
   the range that does.
3. **Bio NPK $30** was applied to the 50 g pack (the canonical listing, previously $28).
   The second listing — "Covers 4 hectares", size never stated — is untouched at $120, and
   that unresolved size shows on the product card verbatim.

Closed since: Bacto-K and Bacto-Seed (5 L $80) and Ruinex (20 L $120) replaced the legacy
flat $150 that the three of them shared, so the Bioenergy line is now internally
consistent — Azofix 5 L $80, Bacto-K 5 L $80, Bacto-Seed 5 L $80, Fosfix 5 L $80. Perfect
Stick 1 L and Master were confirmed at their existing figures.
