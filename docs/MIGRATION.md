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
4. WhatsApp catalogue (`wa.me/c/263776656433`) is not machine-readable server-side;
   product records carry a `whatsappRef` field and admin editing covers manual mapping.
   Official Meta Commerce API integration is the future path.
5. Portfolio items had no narrative text — imported as image-led results; enrich in
   `/admin/projects`.
