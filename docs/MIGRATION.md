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

## Pricing

Prices are USD **retail**, and every one of them is quoted from a source — none is
derived, extrapolated or rounded. Three sources are in play, in order of recency:

| Tag      | Source                                                                                                                                                                                                                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PDF**  | "Price List March 2026" (`cost_price__distributors_price_feb_26.pdf`), retail column. The same sheet carries a wholesale column that the public site does not publish.                                                                                                                       |
| **LIST** | The owner's typed price lists, 2026-09-09 (two batches) — pack sizes the PDF does not cover (5 L / 10 L / 20 L, sachets, A3 250 g) plus Mendelenium, Emaxx Ultra, Maxprolin and the Bio Energy line. Where the two overlap they agree, which is what establishes the PDF's retail column as the site price. |
| **OLD**  | Carried over from the legacy WooCommerce listing. Only where neither 2026 source gives a price.                                                                                                                                                                                              |

`Product.priceUsd` is the **cheapest priced pack**, and the card labels it "from" when
more than one size is priced — a bare number beside "1 L · 5 L" states a price the
product does not have.

### Two rows in the PDF resolve open questions

- "Ikar NPK 3-30-0+zn" is **IN5** — its composition (P₂O₅ 30 %, N 3 %, Zn 0.5 %) is that
  formulation exactly. That gives IN5 the 1 L price its old listing showed as $0.00.
- The PDF lists **NPK 12-11-30+TE** and **Fosto** under Ikar, and **Grow Plus** and
  **Carbo Amin** under Humuson. The site brands the first two "Humuson Complex" and the
  second two "Sapropel Organics", on the owner's explicit instruction. Prices were taken
  from these rows; **brands were left as the owner set them.** Worth a confirmation.

### Still outstanding

1. **Six IKAR 5 L prices are still OLD** — Silicare $69, Mendelenium $79, Bora $72,
   Koral $54, IN5 $54, Elais $50. Every 5 L the owner has since repriced went **up**
   (Bigo W 121→125, Ocean 90→96, Enzo Pro 81→95), and the 1 L prices beside these six are
   March 2026 and also rose, so these are the numbers most likely to be understated.
2. **Perfect Stick** ($25 / $110) appears in neither 2026 source — entirely OLD.
3. **Master** is priced ($33) with no pack size stated anywhere; it renders as a plain
   price rather than a per-pack one.
4. **Bio NPK $30** was applied to the 50 g pack (the canonical listing, previously $28).
   The second listing — "Covers 4 hectares", size never stated — is untouched at $120.

Closed since: Bacto-K and Bacto-Seed (5 L $80) and Ruinex (20 L $120) replaced the legacy
flat $150 that the three of them shared, so the Bioenergy line is now internally
consistent — Azofix 5 L $80, Bacto-K 5 L $80, Bacto-Seed 5 L $80, Fosfix 5 L $80.
