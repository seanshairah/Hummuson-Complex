# Humuson Complex — Old-Site Content Audit

**Site audited:** https://humusoncomplex.com (crawled 2026-08-28)
**Purpose:** full content extraction + migration inventory for the new Next.js platform.
**Raw evidence:** `content/source/` (REST/Store-API dumps + raw HTML of every key page). Every extracted item carries its `sourceUrl`.

---

## 1. Site overview & tech stack

| Item | Finding |
|---|---|
| Platform | WordPress + WooCommerce 9.9.7, Elementor (kit `post-3725`), Contact Form 7, DocuPress, "liquid-custom-builder" |
| Theme | **Landmaster v1.2.1** by 7iquid (ThemeForest gardening/landscaping theme). Much of the demo content was never replaced — see §6 |
| Site title | "Humuson Complex – Fertilizer Distributor" |
| Hero tagline | **"Home Of Healthy Soil & Healthy Crop"** — subtitle: "Distributor of organic fertilizers, bio stimulants and foliar fertilizers of renowned European brands" |
| Commerce | WooCommerce catalogue in USD with Add-to-cart/checkout enabled, plus a WhatsApp Business catalogue (`wa.me/c/263776656433`). New site v1 drops checkout in favour of WhatsApp commerce |
| Content vintage | Two waves: **uploads/2023/07** (launch content: Bioenergy LT + HUMUSON Complex/Sapropel products, blog, projects) and **uploads/2025/06** (IKAR foliar line with ® names) |
| Supplier brands (evidence) | **Bioenergy LT** (logo on About; datasheet links to bioenergy.lt on 2023 line), **Sapropel Organics** (logo on About/home; sapropel base described in FAQ), **IKAR Liquid Fertilizers** (clearly visible on all 2025 pack photos; never named in site text) |
| Sitemap | 76 URLs total (19 pages, 6 posts, 35 products, 4 portfolio items, 2 footer-builder templates, 10 taxonomy/author archives). All mapped in `content/old-url-map.json` |

## 2. Page-by-page audit

| URL | Type | What's on it | Quality | Decision |
|---|---|---|---|---|
| `/` | Home | Hero (tagline + real field photo IMG_0553 (seedlings on drip irrigation)), category blurb ("value, physio & organic"), strengths (Quality Products / Consultancy / Proven Results), 4 testimonials, product carousel, "Our Latest Project: Our fertilizers work wonders", 3 blog teasers, video CTA, newsletter, phone CTAs | Real content, thin copy | Keep tagline, strengths, testimonials, hero photo |
| `/about-us/` | Page | **Best page on the site**: history (MKM Fertilisers origin), vision, mission, 5 values, team (5 people), counters (15 yrs experience / 15 company existence / 1000+ products sold / 10 team members), 5 video embeds, real photo gallery, partner logos (Bioenergy, Sapropel Organics) | Real, some typos | Keep everything → `company.json` |
| `/commitment-why-choose-us/` | Page | History (repeat) + "Benefits of Our fertilizers" bullet list + counters | Real | Keep bullets → `company.json.whyChooseUs` |
| `/faq/` | Page | 16 real Q&As in 5 groups (price, services, products, other, HUMUSON Complex deep-dive incl. sapropel base, Ecocert claim, application timing) | Real, valuable | Keep all → `faqs.json` |
| `/contact-us/` | Page | Address (78 Lomagundi Rd Harare), email, phone, socials, CF7 form with service picker (Consultation / Project Management / Fertilizers Delivery), "response within 2 working days" promise | Real | Keep → `company.json` |
| `/videos/` | Page | 5 YouTube embeds with headings | Real | Keep → `videos.json` |
| `/reviews/` | Page | "Rate us" CTA + 4 named testimonials with Zimbabwean towns (one quote exists in 2 variants) | Real-looking, see §6 caution | Keep → `testimonials.json` |
| `/projects/` | Page | Portfolio grid, filters: All / Fertilizers / Peas & Beans / Potatoes / Wheat / Maize | Real photos, zero text | Keep as photo projects → `projects.json` |
| `/portfolio/fertilizer-test/` (+peas-beans, potatoes, wheat) | Portfolio | Pure photo galleries (item "fertilizer-test" is titled **Maize**); `/portfolio/maize/` in nav 404s | Real photos, no text | Keep photos; no outcomes to migrate |
| `/our-blog/` | Page | Blog index + social banners (Facebook/Instagram/WhatsApp) | Real | → `/knowledge` |
| 6 posts (2023/07) | Posts | Real agronomy/product mini-articles, each with a real featured photo | Real | Keep all → `articles.json` |
| `/shop/`, `/shop-wide/`, `/purchase/` | Page | Woo archive shells (empty REST content) | Shell | Redirect → `/products` |
| `/get-an-offer/` | Page | Nav "Products" target: product grid + "Get A Quote" popup + newsletter | Shell-ish | Redirect → `/contact` (quote intent) |
| `/pricing/` | Page | **100% theme placeholder** — SaaS pricing table ($24–$99/month, "Unlimited Live Dashboards", "150+ Data Sources") | Placeholder | Migrate nothing; redirect → `/products` |
| `/working-process/` | Page | **100% theme placeholder** — "Landscape Design And Planting Process" with lorem ipsum and template phone `1800 567 8990` | Placeholder | Migrate nothing; redirect → `/about`; `company.json.workingProcess = []` |
| `/services/` | Page | **Theme placeholder** — three fake "Lanscop Garden Service" testimonials (Catrina Bonus, Tom Holland, Katty Smith) + generic CTA | Placeholder | Migrate nothing from the page; real service facts assembled from FAQ + contact form into `company.json.services` |
| `/cart/`, `/checkout/`, `/my-account/` | System | Woo system pages | n/a | Redirect → `/contact` (no checkout in v1) |
| `/footer/footer-builder-*` | System | Elementor footer templates leaked into the sitemap | n/a | 301 → `/`, noindex |

**Navigation (header):** Home · About Us · Products (→ `/get-an-offer/`!) · Reviews · Shop · FAQ · Blog · Contact Us.
**Footer:** tagline, socials (Facebook, Instagram, WhatsApp group), phone, email, address, hours (Mon–Fri 8–16:30, Sat 8:30–13, Sun closed), quick links (FAQ, Reviews, Projects, News & Updates, Why Choose Us, Gallery), "© 2023 Humuson Complex. Website by Booming Advertising Agency".

## 3. Product inventory (after dedupe: **22 canonical products** from 35 listings)

Prices are the live USD prices from the Store API (minor units ÷ 100).

| Name | Canonical slug | Category | Price | Pack sizes | Composition? | Rates? | Crops? | Imgs |
|---|---|---|---|---|---|---|---|---|
| Azofix Plus | azofix-plus | organic, physio | $150.00 | — | no | no | no | 1 |
| Fosfix Plus | fosfix-plus | organic, physio | $150.00 | — | no | no | no | 1 |
| Bacto-K | bacto-k | organic, physio | $150.00 | — | no | no | no | 1 |
| Bacto-Seed | bacto-seed | organic, physio | $150.00 | — | no | no | no | 1 |
| Master | master | organic, physio | $150.00 | — | no | no | no | 2 |
| Maxprolin | maxprolin | organic, physio | $20.00 | 10g $20 | no | yes | no | 1 |
| Grow+ Top Dressing | grow-top-dressing | organic, physio, value | $25.00 | sachet $3 | yes (5) | no | no | 3 |
| CarboAmin Basal Dressing | carboamin-basal-dressing | organic, physio, value | $40.00 | sachet $3 | yes (11) | no | no | 3 |
| Ruinex | ruinex | organic, physio | $150.00 | — | no | no | no | 1 |
| Bactoforce | bactoforce | organic, physio | $150.00 | — | yes (1) | no | no | 1 |
| Bio NPK Powder S ® | bio-npk-powder-s | organic, physio, value | $28.00 | 50g $28 · unstated "covers 4 ha" $120 | yes (6 strains) | yes | yes (6) | 3 |
| Perfect Stick ® | perfect-stick | (uncategorized) | $110.00 | 5L $110 · 1L $25 | yes (3) | yes | no | 2 |
| Ocean ® | ocean | (uncategorized) | $90.00 | 5L $90 · 1L $18 | yes (2, no %) | yes | yes (7) | 2 |
| IN5 ® | in5 | (uncategorized) | **not set** | 1L (no price) · 5L $54 | yes (3) | yes | yes (7) | 2 |
| Koral ® | koral | (uncategorized) | $12.00 | 1L $12 · 5L $54 | yes (8) | yes | yes (9) | 2 |
| Enzo Pro ® | enzo-pro | (uncategorized) | $17.00 | 1L $17 · 5L $81 | yes (6) | yes | yes (5) | 2 |
| Mendelenium ® | mendelenium | (uncategorized) | **not set** | 1L (no price) · 5L $79 | yes (7) | yes | yes (7) | 2 |
| Bora ® | bora | (uncategorized) | $17.00 | 1L $17 · 5L $72 | yes (4) | yes | yes (6) | 2 |
| Elais ® | elais | (uncategorized) | $12.00 | 1L $12 · 5L $50 | yes (6) | yes | yes (6) | 2 |
| Silicare ® | silicare | (uncategorized) | $69.00 | 5L $69 · 1L $15 | yes (6) | yes | yes (6) | 2 |
| Bigo W ® | bigo-w | (uncategorized) | $24.00 | 1L $24 · 5L $121 | yes (8) | yes | yes (6) | 2 |
| A3 Biostimulant ® | a3-biostimulant | (uncategorized) | $35.00 | 1 kg $35 | yes (9) | yes | yes (3) | 2 |

**Product lines:**
- **2023 Bioenergy LT microbial line** (azofix…bactoforce): benefit-led "Why X?" copy + operating principle, links to bioenergy.lt one-page PDFs. No pack sizes, rates or crops in text (photos show 5L/20L jugs).
- **HUMUSON Complex / Sapropel range** (Grow+ Top Dressing, CarboAmin Basal Dressing + sachets, and the FAQ's flagship description): composition-led; application timing lives on the FAQ page, not the product pages.
- **2025 IKAR foliar/mineral line** (Perfect Stick…A3): label-style copy with % composition, package size and per-ha rate; sold as separate 1L and 5L Woo products (the duplicate pairs).

## 4. Duplicates found & merge decisions

13 of 35 listings were merged into 11 canonical products (all decisions recorded per-product in `products.json.notes` and per-URL in `old-url-map.json`):

| Canonical | Merged listings | Basis |
|---|---|---|
| ocean | `ocean` (5L $90) + `ocean-2` (1L $18) | Same product, pack-size split; descriptions near-identical (1L adds two benefit sentences — union kept) |
| in5 | `in5` (1L, $0.00) + `in5-2` (5L $54, has composition) | Same text; composition only on 5L |
| koral | `koral` (1L) + `koral-2` (5L) | Same product; crop lists differ → union, noted |
| enzo-pro | `enzo-pro` (1L, corrupted by embedded contact form) + `enzo-pro-2` (5L, clean) | 5L text used |
| mendelenium | `mendelenium` (1L, $0.00) + `mendelenium-2` (5L) | Identical text |
| bora | `bora` + `bora-2` | Identical text |
| elais | `elais` (1L, rate 0.5–1L/ha) + `elais-2` (5L, rate **2–3L/ha**) | **Rates conflict — both kept verbatim, flagged** |
| silicare | `silicare` (5L) + `silicare-2` (1L, `[contact-form]` shortcode mid-word) | 5L text used |
| bigo-w | `bigo-w` (1L) + **`bico-w`** (5L — misspelled slug for the same BIGO W®) | Canonical spelling kept |
| perfect-stick | `perfect-stick` (5L) + `perfect-stick-2` (1L, has composition) | 1L text used (richer) |
| bio-npk-powder-s | `bio-npk-powder-s` (50g $28, full description) + **`/product/4287/`** ("Bio NPK Powder S", $120, empty description, short-desc "Covers 4 hectares", tag new-stock) | 4287 inspected: it is a second listing of the same product at a larger, **unstated** pack size — folded in as a pack entry, not excluded |
| grow-top-dressing | + `grow-top-dressing-sachet` ($3, empty desc, tag "satchets") | Sachet = pack size of same product |
| carboamin-basal-dressing | + `carboamin-basal-dressing-sachet` ($3, empty desc) | Same |

Notation normalization applied **only** in the structured `composition[]` fields (not in `descriptionHtml`): `K20→K2O`, `P205→P2O5`, `Sio2→SiO2`, `Phosphosphorus→Phosphorus`, `Amino acis→Amino acids`. Original wording preserved in `descriptionHtml`; obvious paste artifacts fixed (rejoined split words like "c ontains", removed an embedded Gmail thread's duplicated paragraph in Bacto-Seed, stripped contact-form fragments).

## 5. Brand analysis

**Logo files (all downloaded to `public/images/brand/`):**
| File | What it is | Dimensions |
|---|---|---|
| `fdfdfdfd.png` | **Full-colour logo** — "HUMUSON" in green + "COMPLEX" in black, leaf dotting the O. The best master for light backgrounds (the original file name is junk; rename in the new repo) | 974×353 |
| `logo-1-Recovered.pnbnnbbn.png` | Header/footer logo — **all-white** lettering (transparent PNG, invisible on white) | 974×353 |
| `cropped-logo-1-Recovered.pnbnnbbn.png` | Cropped white variant used as site icon | 974×353 |
| `Bioenergy_naujas-logotipas-3.jpg` | Partner logo: Bioenergy LT (1.9 MB!) | 1177×960 |
| `partner-433fd162.jpg` | Partner logo: **Sapropel Organics** | 300×116 |

**Colour palette (extracted from live CSS):**
| Hex | Where found | Role |
|---|---|---|
| **#6a961f** | `themes/landmaster/assets/css/theme.css` (197 occurrences — buttons, links, accents) | Primary brand green |
| **#0d3c00** | theme.css (129×) + homepage/header/footer Elementor CSS | Dark green (headers, footer, overlays) |
| #0a3000 | header/footer Elementor CSS | Deeper dark-green variant |
| **#e2c998** | theme.css + homepage CSS | Gold/tan accent |
| #34592a, #6e8967 | homepage Elementor CSS | Secondary greens |
| #ededed / #fbf7f5 / #f3f4f0 | theme + page CSS | Light surfaces |
| #6EC1E4 / #54595F / #7A7A7A / #61CE70 | `--e-global-color-primary/-secondary/-text/-accent` in `uploads/elementor/css/post-3725.css` | **Untouched Elementor defaults** — the kit's global colours were never customized; do NOT treat these as brand colours |

**Typography (Google Fonts + Elementor kit):** Roboto 400/500/600/700 (`--e-global-typography-primary/-text/-accent-font-family: "Roboto"`), **Roboto Slab 400** (`--e-global-typography-secondary`), plus Outfit 400 loaded on the homepage. Icon sets: FontAwesome 4+5, Material Design Iconic, IcoFont (theme baggage).

**Tone of voice:** practical, farmer-direct, benefit-first; heavy use of soil-health framing ("Not only feed the plant, feed the soil!", "Home of Healthy Soil & Healthy Crop"). Copy quality is uneven (typos, pasted-label text) — the new site should keep claims but professionalize the prose carefully without inventing specifics.

**Contact & social:** phone/WhatsApp **+263 77 665 6433** (`tel:263776656433` sitewide); email **info@humusoncomplex.com**; address **78 Lomagundi Rd, Harare**; WhatsApp community group `chat.whatsapp.com/GgyfZKp9j0dEHTeETbVZJW`; Facebook `facebook.com/humusoncomplex`; Instagram `instagram.com/humuson_complex`. No YouTube/LinkedIn/X/TikTok accounts linked anywhere (the videos are on third-party channels: Agribusiness Media, Kumran TV, THE FARMER'S DIARY).

## 6. Content gaps & risks (explicit lists)

1. **Products with NO application rate stated** (new site must show "confirm with technical support"): **Azofix Plus, Fosfix Plus, Bacto-K, Bacto-Seed, Master, Grow+ Top Dressing, CarboAmin Basal Dressing, Ruinex, Bactoforce** (9 of 22). (Grow+/CarboAmin have FAQ *timing* guidance only — captured in notes/FAQ.)
2. **Products with NO suitable-crops statement**: the nine above minus none, plus **Maxprolin** and **Perfect Stick** (11 of 22).
3. **Products with NO composition stated**: Azofix Plus, Fosfix Plus, Bacto-K, Bacto-Seed, Master, Maxprolin, Ruinex (7). The bioenergy.lt PDF links could fill these, but that is off-site content — get supplier sign-off before importing.
4. **Products with NO pack size stated**: Azofix Plus, Fosfix Plus, Bacto-K, Bacto-Seed, Master, Ruinex, Bactoforce (photos suggest 5L/20L jugs — verify). The $120 Bio NPK Powder S pack size is unstated ("Covers 4 hectares").
5. **Prices missing** ($0.00 on site): IN5 1L, Mendelenium 1L. **Price plausibility check needed**: the $150 across the whole Bioenergy line and $110 Perfect Stick 5L vs $25 1L don't scale consistently; Elais rate conflict (0.5–1 vs 2–3 L/ha) needs an agronomist's confirmation.
6. **Strong unverified claims** carried in FAQ ("yield increase of not less than 30%", "reduce synthetic fertilizer up to 50%", "reduces costs at least 25% / efficiency up to 80%", "Ecocert-certified") — kept verbatim as site claims; the new site should attribute or verify (esp. Ecocert certificate number) before republishing prominently.
7. **Projects have no text**: 4 portfolio items are photo-only (no location, product, or outcome). Only the sugar-beans blog post documents an actual result (Chikombedzi, Grow Plus).
8. **No product documents on-site**: no downloadable datasheets/labels/MSDS hosted on the domain (2023 line links out to bioenergy.lt PDFs).
9. **About-page counters conflict**: "Years Of Experience 15 / Company Existence 15+" vs © 2023 launch and 2023-dated content — verify before reuse.
10. **Team data thin**: only the Director has a bio; team photos appear to be a single shared placeholder image.

**Theme placeholder content that must NOT be migrated (identified as fake/demo):**
- `/pricing/` — SaaS pricing table (Basic $24 … Premium $99/month with "Unlimited Live Dashboards").
- `/working-process/` — landscape-design process with lorem ipsum + template phone `1800 567 8990`.
- `/services/` testimonials — "Lanscop Garden Service", Catrina Bonus / Tom Holland / Katty Smith.
- FAQ page's trailing "Ask a question" widget ("Category 1/2/3" placeholders).
- **Testimonial avatar photos are stock images** (filenames: `DamonTweedy_alt1_StocksPhotography_HiRes.jpg`, `Tanya-Hales-Square-1024x1024-1.jpg`, `short-bob-hairstyles-for-black-women.jpg`, `ellington_custom-…jpg`, `front-view-smiley-woman-working-min.png`). The four quotes themselves are Zimbabwe-specific and name Humuson (kept in `testimonials.json`), but **do not pair them with the stock faces**; ideally re-verify the quotes with the company.
- Theme demo icons from `uploads/2020/02` (`icon_faq*.png`) — pre-date the company, not downloaded.

## 7. WhatsApp catalogue findings

- `https://wa.me/c/263776656433` returns a **1.5 KB JavaScript error shell** to server-side fetches (saved to `content/source/html/whatsapp-catalogue-response.html`) — no product data, no OpenGraph, nothing crawlable.
- The catalogue is only rendered inside WhatsApp clients. To sync it programmatically the team would need the **WhatsApp Business Platform / Meta Commerce Manager APIs** (business-owned catalogue via a WABA + access token), or a manual export from the phone.
- For v1, `/catalogue` on the new site should simply deep-link to `wa.me/c/263776656433` (and the group `chat.whatsapp.com/GgyfZKp9j0dEHTeETbVZJW`), with products mirrored from `products.json`.

## 8. Migration inventory summary

| Content type | Extracted | File |
|---|---|---|
| Products (canonical) | **22** (from 35 listings; 13 merged) | `content/products.json` |
| Product categories | 4 (organic 13, physio 13, value 5, uncategorized 22 — "uncategorized" holds the whole 2025 IKAR line and needs a real name, e.g. "Foliar & mineral") | `content/categories.json` |
| Crops mentioned | 15 | `content/crops.json` |
| FAQs | 16 | `content/faqs.json` |
| Articles (blog posts) | 6 | `content/articles.json` |
| Videos | 5 (YouTube) | `content/videos.json` |
| Projects | 5 (4 photo galleries + 1 blog-documented field result) | `content/projects.json` |
| Testimonials | 4 (flagged: verify authenticity; avatars were stock) | `content/testimonials.json` |
| Company profile | 1 (incl. team ×5, values ×5, stats, partner brands, hours, socials) | `content/company.json` |
| URL redirects | 77 rows (all 76 sitemap URLs + WhatsApp catalogue) | `content/old-url-map.json` |
| Assets downloaded | **63 files, ≈9.7 MB** (5 brand, 40 product, 6 article, 12 field photos) — all verified as real images >5 KB, none >2 MB | `content/assets.json`, files in `public/images/` |

**Path conventions:** `assets.json.localPath` is the repo path (`public/images/…`); `products/articles/projects.json` use the runtime web path (`/images/…`).

**Raw dumps kept:** `content/source/raw-products.json` (35 listings), `raw-categories.json`, `raw-posts.json` (6, `_embed`ded), `raw-pages.json` (19), plus raw HTML for 15 pages + 5 portfolio pages + the WhatsApp catalogue response in `content/source/html/`. WP media library index (310 items) was fetched during the audit; `/wp-json/wp/v2/portfolio` is not exposed (404) — portfolio content was extracted from HTML.
