# Build milestones (delivered)

The brief's phased plan (§37) mapped to what shipped, in order:

1. **Research** — full old-site audit via public APIs; brand extraction (logo, colours,
   tone); migration inventory with 77 URL mappings. → `docs/audit/`, `content/`
2. **Architecture** — Next.js 15 + TS + Tailwind v4 scaffold; full relational Prisma
   schema (24 models); local PostgreSQL 16 tooling; design tokens.
3. **Foundation** — Auth.js credentials + edge-safe middleware; media pipeline with blur
   placeholders; UI kit; site chrome (adaptive header, footer, WhatsApp FAB).
4. **Design system** — humus/leaf/soil/paper palette around the real brand green
   `#005820`; Space Grotesk + Inter + Fraunces; motion primitives with reduced-motion.
5. **Public website** — homepage, products + detail, crops + growth timelines, finder,
   knowledge, videos, results, catalogue (explore + flipbook + PDF), about, contact,
   solutions, FAQ, search, 404/error/loading states.
6. **Knowledge engine** — tested retrieval engine; ⌘K search; Ask Humuson with product
   context and honest fallbacks; FAQ explorer; question/search event logging.
7. **Admin** — 15 modules: full product CMS with structured agronomy fields, FAQ +
   test-question tool, TipTap articles, YouTube videos, results, testimonials,
   catalogue editor, media library, enquiries inbox, analytics insights, settings, users.
8. **Migration** — idempotent importer with evidence-based structuring; 22 products,
   15 crops, 16 FAQs, 6 articles, 5 videos, 5 results, 4 testimonials, company settings,
   generated catalogue; 301 redirects live.
9. **QA** — 32 unit tests + 32 e2e tests (desktop & mobile) green; visual QA screenshots
   at every milestone; lint/typecheck clean; CI pipeline.

## Suggested next iterations (not in scope of v1)

- Meta Commerce API sync for the WhatsApp catalogue (`whatsappRef` is ready).
- Cloudinary upload driver for serverless hosting.
- PostgreSQL full-text upgrade of `searchAll` when content volume grows.
- Owner-verified enrichment: missing rates (9 products), Elais rate conflict,
  project narratives, testimonial verification.
- Newsletter/lead capture and PostHog dashboards if desired.
