# Information architecture

## Public

| Route                  | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `/`                    | Immersive homepage: hero, benefit navigation, featured products, finder teaser, crops, why-Humuson, results, knowledge preview, catalogue teaser |
| `/products`            | Product discovery: search + range/crop/goal/method/stage filters   |
| `/products/[slug]`     | Product detail: gallery, verified facts, application guidance, composition, benefits, crops, FAQ, related |
| `/product-finder`      | 4-question guided wizard → explained recommendations               |
| `/crops`               | Crop index (with product counts)                                   |
| `/crops/[slug]`        | Growth-stage timeline, application program chart, products, FAQs, media |
| `/solutions`           | Published services + product ranges                                |
| `/knowledge`           | Articles index (featured + grid)                                   |
| `/knowledge/[slug]`    | Editorial article: reading progress, mentioned products/crops      |
| `/videos`              | Video centre (click-to-load, category tabs)                        |
| `/catalogue`           | Editorial catalogue (themed chapters, product spreads)             |
| `/catalogue/flipbook`  | Page-turn publication (TOC, thumbnails, deep links, share, PDF)    |
| `/catalogue/print`     | Print sequence consumed by the PDF exporter (noindex)              |
| `/projects`            | Results & crop programs + testimonials                             |
| `/projects/[slug]`     | Case detail: images, facts, products used, testimonial             |
| `/about`               | Story, vision/mission, values, partner brands, visit details       |
| `/contact`             | Real contact details + validated enquiry form                      |
| `/faq`                 | Searchable categorised FAQ (FAQPage schema)                        |
| `/search`              | Server-rendered global search (noindex)                            |

Utility: header search (⌘K palette), **Ask Humuson** drawer (site-wide), WhatsApp FAB,
sticky product actions on mobile, skip-link, designed 404/error pages.

## Navigation

- **Main:** Products · Crops · Product Finder · Knowledge · Catalogue · About
- **Secondary (footer/mobile):** Solutions · Videos · Results · FAQ · Contact · Search
- **Utility:** Search · WhatsApp · Ask Humuson

## Admin (`/admin`, Auth.js-guarded)

Overview · Products (+ new/edit) · Categories · Crops · FAQs (+ test question) ·
Articles (+ new/edit) · Videos · Results (+ new/edit) · Testimonials · Catalogue ·
Media · Enquiries · Analytics · Settings · Users · Login (`/admin/login`)

## API

`GET /api/search` · `POST /api/ask` · `POST /api/finder` · `POST /api/events` ·
`POST /api/admin/upload` · `/api/auth/[...nextauth]`

## SEO surface

`/sitemap.xml` (all published entities) · `/robots.txt` · JSON-LD: Organization,
Product (+offers), Article, FAQPage, VideoObject, BreadcrumbList · canonical URLs ·
OpenGraph defaults + per-entity images · 77 × 301 redirects from the legacy site
(`content/old-url-map.json` → `next.config.ts`).
