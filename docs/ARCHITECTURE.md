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

### Catalogue: one page sequence, three consumers
`buildCataloguePages` flattens the catalogue models into an ordered page list used by
the flipbook (desktop spreads), the mobile swipe reader, the thumbnail grid and the PDF
exporter — page numbers and `?page=` deep links always agree.

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
