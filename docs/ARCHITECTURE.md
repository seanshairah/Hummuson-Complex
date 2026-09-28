# Architecture

## System shape

```
                        ┌──────────────────────────────┐
     Farmer / visitor → │  Next.js 15 App Router       │ ← Owner / staff (/admin)
                        │                              │
   (site) route group   │  Server Components + ISR     │  admin route group
   ──────────────────   │  Server Actions (mutations)  │  ─────────────────
   home products crops  │  API routes (search/ask/     │  Auth.js credentials
   finder knowledge     │  finder/events/upload)       │  CRUD via server actions
   videos catalogue …   └──────────┬───────────────────┘  tag-based revalidation
                                   │ Prisma
                        ┌──────────▼───────────────────┐
                        │ PostgreSQL (local cluster in │
                        │ dev · Neon in production)    │
                        └──────────────────────────────┘
```

## Key decisions

### Data access: cached repositories + plain DTOs
All public reads go through `src/server/data/*` — each entity has one
`unstable_cache`-wrapped "fetch all published" query tagged (`products`, `crops`,
`faqs`, …) plus pure filter functions on top. Admin mutations call
`revalidateContent(tags…)`, so the public site updates immediately after an edit while
staying fully cacheable between edits (`revalidate = 300` as a safety net).
Repositories return plain DTOs (no Prisma `Decimal`, no relations leakage) so results
serialize cleanly through the cache and into client components.

### Retrieval engine: one code path, four features
`src/lib/search/` is a pure, dependency-free weighted retrieval engine
(normalizer → conservative stemmer → agronomy synonym expansion → field-weighted
scoring with exact-title dominance and coverage bonuses). It powers:

1. Global search (⌘K palette + `/search` + `/api/search`)
2. The products page free-text filter
3. **Ask Humuson** (`src/server/data/ask.ts`) — FAQ docs + per-product *fact documents*
   generated from verified DB fields (rates, packs, crops, composition). Confidence
   below threshold ⇒ `matched: false` ⇒ honest fallback + `QuestionEvent` logging.
4. The admin "Test a question" preview (identical scoring, event deleted after preview).

The content corpus is small (hundreds of records), so in-memory scoring beats a
network round trip and behaves identically in dev/CI/prod. PostgreSQL full-text is the
documented scale-up path: swap `searchAll` internals; every consumer stays unchanged.

### Finder: explainable scoring
`src/lib/finder/scoring.ts` ranks products against the wizard's answers using only real
mappings (crop links, evidence-derived benefits/stages/methods). Every recommendation
carries human-readable `reasons`; unknown data is neutral, never a match; explicit crop
mismatch is penalised. Unit-tested.

### Auth: split config for the edge
`src/server/auth.config.ts` is the edge-safe base (JWT/session callbacks, pages);
middleware builds from it so no Prisma reaches the edge bundle. The full config
(`src/server/auth.ts`) adds the credentials provider (bcrypt) for the Node runtime and
exposes `requireUser`/`requireAdmin` guards used by every server action.

### Catalogue: one design, four renderers
The flipbook is a *design* (`src/lib/flipbook/model.ts`): pages of freely placed blocks
— text, pictures, shapes, buttons, a contents list, QR codes — on a 600 × 820 unit page,
stored as JSON on the `Catalogue` row (`design` published, `draftDesign` in progress,
every publish kept as a `CatalogueRevision`). Text carries `{{tokens}}` (`{{name}}`,
`{{packs}}`, `{{chapter}}`, `{{page}}` …) and blocks can be bound to a product, so a page
stays right when the product is edited.

- `schema.ts` validates anything coming in (clamps numbers, allows only safe link and
  picture addresses) — designs from the dashboard and from the database alike.
- `resolve.ts` turns a design plus live data into the exact pages a reader sees: tokens
  filled, pictures looked up, hidden pages and deleted products dropped, contents
  numbered, a blank page inserted before the back cover when the count is odd.
- `tree.ts` draws a resolved page as a renderer-neutral element tree, sized with a
  container-query unit so a page looks the same at any size. The web flipbook, the
  print view and the designer canvas render it with React (`components/flipbook/
  page-view.tsx`); the standalone HTML download serialises the very same tree
  (`html.ts`, `server/flipbook/standalone.ts`).
- `server/flipbook/pdf.tsx` draws the resolved pages with react-pdf (live links,
  clickable contents, chapter bookmarks).
- With no design published, `generate.ts` lays the flipbook out from the chapters
  (cover, contents, a chapter opener and a page per product) — the designer's
  "Rebuild from the ranges" starts from the same layout.

Download addresses carry a fingerprint of the design and its data (`?v=`); the route
redirects any other value to the current one, so each version is built once and then
served from the edge cache.

### Analytics: first-party by default
`AnalyticsEvent` / `SearchEvent` / `QuestionEvent` rows are written via a sendBeacon
endpoint and server-side hooks. No cookies, no personal data, no third-party script.
PostHog can be added via env, but the admin insights (most-viewed products, zero-result
searches, unanswered questions, WhatsApp clicks per product, finder usage) run on the
first-party tables.

## Route map

See `docs/SITEMAP.md`. `(site)` carries the public chrome (header/footer/FAB);
`admin/(dashboard)` carries the sidebar; `/admin/login` sits outside both.

## Caching & rendering summary

| Surface            | Strategy                                             |
| ------------------ | ---------------------------------------------------- |
| Public pages       | SSG/ISR (`revalidate = 300`) + tag invalidation      |
| `/products`, `/search` | Dynamic (searchParams) over cached repositories  |
| API routes         | Dynamic; read from cached repositories               |
| Admin              | Fully dynamic, uncached reads                        |
| Images             | next/image AVIF/WebP, blur placeholders from Media   |

## Content pipeline

```
old site ──(audit agent)──▶ content/*.json + docs/audit/* + public/images/*
content/*.json ──(scripts/migration/import.ts, idempotent)──▶ PostgreSQL
content/old-url-map.json ──▶ next.config.ts redirects (77 URLs, 301)
```

The importer's conservative rule tables (benefit/stage/method evidence matching) are the
single place where free text becomes structured data — documented inline, honest by
construction.
