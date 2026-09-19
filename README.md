# Humuson Complex — Digital Agronomy Platform

The complete rebuild of [humusoncomplex.com](https://humusoncomplex.com) — from a WordPress/WooCommerce
brochure site into a production-grade agronomy platform: immersive product discovery, a verified
knowledge engine ("Ask Humuson"), crop guidance with growth-stage timelines, an interactive
catalogue with a flipbook, first-party analytics, and a full admin CMS.

> **Home of Healthy Soil & Healthy Crop** — every piece of agronomic content on this platform
> (rates, composition, crop suitability, claims, results) was migrated verbatim from Humuson's
> published material. Nothing is invented; where data is missing the UI says so and routes
> farmers to a human adviser.

## Stack

| Layer      | Choice                                                              |
| ---------- | ------------------------------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Components, Server Actions)           |
| Language   | TypeScript (strict)                                                  |
| Styling    | Tailwind CSS v4 (CSS-first tokens) + Motion (Framer) + Radix         |
| Database   | PostgreSQL 16 · Prisma ORM (Neon-ready)                              |
| Auth       | Auth.js v5 (credentials, JWT, edge-safe middleware)                  |
| Editor     | TipTap                                                               |
| Testing    | Vitest (unit) · Playwright (e2e, desktop + mobile)                   |
| Search     | In-memory weighted retrieval engine (agronomy synonyms, tested)      |

## Quick start

```bash
npm install
cp .env.example .env          # fill in values (defaults work for local dev)
npm run setup                 # boots local PostgreSQL 16, migrates, seeds real content
npm run dev                   # http://localhost:3000
```

Admin: `http://localhost:3000/admin` — credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD`
in `.env` (seeded on `db:seed`). **Change them before deploying.**

### Everyday commands

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Dev server                                                      |
| `npm run build`        | Production build                                                |
| `npm run setup:db`     | Start/initialise the local PostgreSQL cluster                   |
| `npm run db:migrate`   | Create/apply migrations (dev)                                   |
| `npm run db:seed`      | Import audited content from `content/*.json` (idempotent)       |
| `npm test`             | Unit tests (search engine, finder scoring, catalogue pages…)    |
| `npm run e2e`          | Playwright end-to-end suite (builds on a fresh port)            |
| `npm run catalogue:pdf`| Render the flipbook to `public/catalogue/…pdf` (server running) |

## What's inside

- **Public site** — immersive homepage, `/products` discovery with URL-driven filters,
  deep product pages with verified application guidance, `/crops/[slug]` growth-stage
  timelines, `/product-finder` guided wizard, knowledge centre, video centre
  (click-to-load embeds), results & crop programs, FAQ explorer, about/contact/solutions.
- **Interactive catalogue** — `/catalogue` editorial chapters and `/catalogue/flipbook`,
  a dependency-free CSS-3D page-turn book with contents, thumbnails, deep links,
  fullscreen, share, and a PDF exporter.
- **Knowledge engine** — one tested retrieval engine (`src/lib/search`) powers global
  search (⌘K), the FAQ page, **Ask Humuson** (grounded Q&A with honest fallbacks), and
  the admin "Test a question" tool.
- **Admin CMS** — `/admin`: products (structured agronomy fields, never a blob of text),
  FAQs with aliases, TipTap articles with scheduling, videos by YouTube URL, results,
  testimonials, catalogue editor, media library, enquiries inbox, analytics insights
  (zero-result searches, unanswered questions, WhatsApp clicks per product), settings, users.
- **Migration** — `content/*.json` is the audited extraction of the old site
  (`docs/audit/AUDIT.md` documents every decision); `scripts/migration/import.ts` loads it
  idempotently; `content/old-url-map.json` powers 77 permanent redirects in `next.config.ts`.

## Documentation

| Doc                                  | Contents                                        |
| ------------------------------------ | ----------------------------------------------- |
| `docs/ARCHITECTURE.md`               | System design, data flow, caching, decisions    |
| `docs/DESIGN-SYSTEM.md`              | Tokens, typography, components, motion rules    |
| `docs/design/REFERENCE-ANALYSIS.md`  | Visual-reference study & how we translated it   |
| `docs/SITEMAP.md`                    | Full information architecture                   |
| `docs/MIGRATION.md`                  | Old-site → platform mapping & content rules     |
| `docs/DEPLOYMENT.md`                 | Vercel + Neon deployment, media strategy        |
| `docs/audit/AUDIT.md`                | The complete old-site audit (page by page)      |
| `docs/audit/CONTENT-INVENTORY.md`    | Every migrated content item                     |

## Honesty rules (enforced in code)

1. Structured agronomy mappings (benefits, growth stages, methods) are derived only from
   phrases present in each product's own published text (`scripts/migration/import.ts`).
2. Missing application data renders a "confirm with Humuson technical support" state with
   WhatsApp/contact actions — never a guess.
3. Ask Humuson answers only from the FAQ + verified product facts; anything else returns
   the honest fallback (and is logged for the admin to turn into a real FAQ).
4. Statistics shown on the site are computed from real data (product counts, crops covered)
   — the audit flagged the old site's unverifiable counters and they were **not** migrated.
