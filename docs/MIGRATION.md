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
file. And `mapsUrl` is deliberately empty: a Google Maps _directions_ URL carries
the sender's own starting point, so pasting one there would hand every visitor
directions from wherever that person happened to be standing.

### Ranges: several per product

`Product.categoryId` held one range per product, so the importer had to pick a
winner out of the several the old shop recorded — which is why Physio, the same
thirteen products as Organic, never had a single member. A product now belongs
to every range its own published text supports, through `ProductCategoryLink`.
It is still one product record: the catalogue shows it under each range and
once in any combined result.

The ranges themselves were reworked to say what a grower is choosing between:

| slug                 | name                        | what it means                                                                 |
| -------------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `microbiological`    | Microbiological Fertilisers | contains live bacteria or fungi, by its own description                       |
| `biostimulants`      | Biostimulants               | amino acids, seaweed, or a microbial product that calls itself a biostimulant |
| `liquid-fertilisers` | Liquid Foliar Fertilisers   | the liquid range, fed through leaf or irrigation                              |
| `crop-nutrition`     | Crop Nutrition              | supplies the crop's macro-nutrients: basal and top dressings, NPKs            |
| `organic`            | Organic                     | nutrition from organic matter; both members are titled "organic … fertiliser" |

`value` and `physio` are gone. They were live on the old shop and are in links,
so `filterProducts` maps them onto `crop-nutrition` and `microbiological`
respectively — `?category=` is a filter, not a route, so a stale one would
otherwise render the whole catalogue and look like it had worked.

Two judgement calls worth knowing: **Bio NPK Powder S** was in Value and is not
in Crop Nutrition, because it is a microbial product that releases nutrients
already in the soil rather than supplying them. **Perfect Stick** is in Liquid
Foliar Fertilisers and is a spray adjuvant, not a fertiliser — it has no other
home and belongs in the tank with them, but say so and it can stand outside the
ranges instead.

### Crops: one level of groups

`Crop.parentId` groups the individual crops under the group a grower plants by —
cabbage, broccoli and cauliflower under brassicas; Fruit and Fruit Trees merged
into one Fruit Crops parent. A parent is itself a crop, not a separate kind of
row, because products really are listed against "brassicas": that is what their
own text says, and those associations would be lost if groups lived apart.

Filtering by a group returns its own products **plus** its children's. Filtering
by a single crop returns only that crop's, so a product listed for cabbage is
never presented as suitable for broccoli. Inheritance runs upward only, and
`tests/unit/product-filters.test.ts` is what holds it there.

Nothing in the catalogue supports **Lawns & Turf** or **Pastures & Fodder
Crops**: no crop exists for either and no product's published text mentions
lawn, turf, pasture, fodder or grazing. They are not in the taxonomy, because an
empty group is a filter that leads nowhere. Name the products that cover them
and both can be added in an afternoon.

### Partner logos

`public/images/brand/` holds one file per producer. Bio Energy and Sapropel
Organics arrived as artwork; IKAR, Nando and Arvensis never did, so their marks
are cropped out of the catalogue product photographs by
`npm run assets:logos` (`scripts/assets/extract-brand-logos.mjs`). That script
is the record of which photo and which pixels each one came from, and it
flattens the lighting so a mark photographed on a bag sits next to one that
arrived on white. The outputs are committed; the script is not part of the
build.

They are the best available, not good: a logo printed at a centimetre across and
photographed on a phone will never be as crisp as a supplied file. If a producer
sends a press kit, drop the file in and delete that entry from the script rather
than re-cropping.

### Brands are manufacturers

Six products carried the brand "Humuson Complex", which is the distributor, not
a maker — the eMAXX pack says so itself ("Zimbabwe Distribution: PaLanga
Enterprises t/a HumusOn Complex"). Each was moved to the manufacturer its own
record names:

| product         | brand          | evidence                                                             |
| --------------- | -------------- | -------------------------------------------------------------------- |
| Fosto           | IKAR           | pack photo reads IKAR LIQUID FERTILIZERS · Fosto · ADD VALUE         |
| NPK 12-11-30+TE | IKAR           | pack photo reads IKAR LIQUID FERTILIZERS · NPK 12-11-30+TE · INTENSE |
| Bacto-Seed      | Bio Energy     | migration note: "Bioenergy LT product line"                          |
| Maxprolin       | Bio Energy     | migration note: "Bioenergy LT product line"                          |
| Ruinex          | Bio Energy     | migration note: 'Bioenergy LT product line (tag "bio-energy")'       |
| eMAXX Ultra     | CMD Industries | supplied by the owner                                                |

The instruction was to move them all to Sapropel Organics. That would have put
five products under a maker their own records contradict, so they went where
the evidence pointed instead; the requirement itself — no product appearing as a
brand — is met either way. `content/products.json` is one line per product if
any of them should read differently.

The admin editor was also dropping `brand`: the field was never passed into the
form, so it rendered empty and saving wrote the empty value back. Opening any
product to change anything at all silently erased its manufacturer.

### The Arvensis brand name

The A3 Biostimulant and Fortik Solid packs both print the _arvensis agro_ mark
and `www.arvensis.com`. The audit had recorded the brand as "Avensis", which is
a transcription slip rather than a second supplier, so `partnerBrands` and both
products now read "Arvensis Agro". The value is what `?brand=` filters on, so it
has to match in `content/products.json` and in the admin form's brand list — it
is not a display label.

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

## 17 Sep 2026 — delisting, crop families, stockists

### Five products withdrawn from Bio Energy

The owner asked for Bactoforce, Azofix Plus, Fosfix Plus, Bacto-K and Ruinex to come
off the Bio Energy range, and confirmed that meant delisting them rather than moving
them to another manufacturer. Bio Energy now carries three products — Bacto-Seed,
Master, Maxprolin — and the catalogue 22 rather than 27.

Delisting needed a mechanism, not just an edit. **The importer only ever upserts**, so
dropping a product from `content/products.json` left the row — and the live page —
exactly where it was: the content file said the product was gone and the site went on
selling it. Two things close that gap:

- `content/delisted-products.json` records what was withdrawn, when, why, and where its
  URL now points. `pruneDelistedProducts()` deletes exactly those slugs.
- The list is read from that file rather than inferred from "missing from
  products.json", because a truncated content file would otherwise wipe the catalogue.
  Absence is an accident; a delisting record is a decision.

Both URLs a withdrawn product owns now redirect (301) to `/products`: the old WordPress
one via `old-url-map.json`, and the one this site published itself via
`delistedRedirects()` in `next.config.ts`. Enquiries, FAQs and catalogue entries that
referenced a deleted product survive with a null reference — a customer's enquiry
records something that really happened and is not ours to delete alongside the product.

`public/catalogue/humuson-catalogue.pdf` still pictures all five. It is a binary the
build does not regenerate; **it needs re-exporting before it is handed to anyone.**

### Crops are botanical families now

The owner supplied a family taxonomy — Brassicaceae, Cucurbitaceae, Solanaceae,
Fabaceae, Alliaceae, Apiaceae, Poaceae, and Amaranthaceae/Asteraceae — with the field
signature, root and feeding habit, and pests for each. `Crop` gained `familyName`,
`signature`, `notes[]` and `alsoIncludes[]` to carry it.

Roughly 45 crops are named across those families; about 20 are named in some product's
own published guidance. The owner chose that **only the covered ones get a page**. The
rest are printed as text on their family page under "Also in this family", with no
link: a crop page that can only say "nothing listed" is a dead end, and inventing a
product–crop claim to fill it would be worse. Alliums and the carrot family have no
covered member at all, so they sit in the "other crops" strip with their agronomy
intact.

Judgement calls worth knowing about:

- **Solanaceae has no common name in the brief** (the line was left unfinished). It is
  titled *Nightshades*, the conventional English name. Say the word and it changes.
- **Rapeseed, sunflower and sugar beet lost every product.** All four products that
  listed them are among the five delisted, so they became text under Brassicaceae,
  oilseeds and field crops respectively rather than pages returning nothing.
- **Parents no longer answer to their children's names.** `brassicas` carried
  `cauliflower`, `broccoli` and `cabbage` as aliases, and `cucurbits` carried its three
  — which would resolve a search for "cabbage" to the whole group and put one cabbage
  product in front of every brassica grower. A unit test now forbids it.
- **`pea & bean` is gone.** It was a crop record with no products, kept alive by one
  project ("Peas & Beans") naming it. That project now names `legumes`, which is what
  the trial actually was and has nine products behind it.
- `validate-data.ts` counted only a crop's direct joins, so it reported every group
  whose products sit on its members as an empty facet. It counts children now, the same
  rule the site itself uses.

### Stockists

`/where-to-buy` lists the shops that carry Humuson product, grouped by town, with an
admin module at `/admin/distributors`. Ten shops across Bulawayo, Mutare, Banket and
Karoi, as supplied.

**No coordinate is invented.** Google's keyless embed takes one query, so the map shows
one town at a time and each shop carries its own link out. A shop with real coordinates
gets a pin; a shop with only a street address gets a Google *search* of that address —
Google's guess, plainly, rather than a pin we placed on its behalf; a shop with neither
gets no directions link at all. `Distributor.mapsLat/mapsLng` are there for when
somebody reads the real numbers off the map, and the admin form refuses one coordinate
without the other.

### The agro-dealer list (17 Sep, second pass)

The owner supplied `agro-dealer-addresses.docx` — 35 outlets across NTS, NTS FarmShop
and Farmer's Choice, transcribed from 20 screenshots. With the six Humuson supplied
directly, the list is **41 rows, 40 published, across 21 towns**.

**The document carries its own health warning and so does the data.** Its stated
sources: the NTS branch list comes from thedirectory.co.zw, *which rates its own listing
"0% accurate"*; the FarmShop addresses from NTS Facebook posts and a search summary; the
Farmer's Choice addresses from a Bulldozer insecticide flyer. The document says "verify
before outreach", and the screenshots are known to skip part of the NTS list — at least
one branch between Mbare and Mutare.

Publishing 40 third-party addresses as fact would be a claim about other people's
businesses that nothing here supports, and a wrong address costs a farmer a drive. So:

- `Distributor.sourceNote` carries the provenance of every row, admin-only, never
  rendered publicly. A unit test fails if any row lacks one.
- `Distributor.verifiedAt` is null until somebody rings the shop. The admin list has a
  **Checked** column, which is the queue; the edit dialog has the tick.
- The page says "ring ahead, because what each branch holds varies" rather than
  claiming every branch stocks Humuson. Two networks stock it; that every one of their
  40 branches does is not something the sources establish.
- The Belmont outlet (No. 2 Swansea Street) had **no business name** on its screenshot,
  so it is a DRAFT, not a published stockist called "Unnamed".

Reconciliations against the first pass: "Farmshop NTS, Shop 9 1st Street, Mutare" is NTS
Mutare, now with its phone number; "Farmshop NTS, Bulawayo" is NTS Bulawayo at 62 George
Silundika Street; Bulawayo Seed Centre and Farmer's Choice Bulawayo both gained
addresses. Frontline Farming still has none.

**The import stopped wiping the table.** `importDistributors` began as
`deleteMany()` + `create`, which was the obvious way to write it and was wrong:
checking forty addresses is hours of somebody's phone calls, that work lives in
`verifiedAt` and the map pins, and a re-import for an unrelated reason erased all of it
silently — the row count looked identical either way. It upserts by slug now and deletes
only rows the content file no longer mentions. The content file owns the facts it
states; the admin keeps what only it knows.

**Bulawayo is confirmed (17 Sep).** The owner supplied screenshots for the four Bulawayo
entries, and three of them name their shop:

| Shop | Evidence | Result |
| --- | --- | --- |
| NTS Bulawayo | A branch-listing page agreeing with the directory entry | 62 George Silundika Street — two independent sources, verified |
| Farmer's Choice Bulawayo | Their own branch-opening flyer (for 1 Aug 2025) | Corner 4th Avenue & Robert Mugabe Way, and 0781 469 078 — verified. The second number, 0777 723 649, is still flyer-only |
| Bulawayo Seed Centre | Its own Google Business listing, with a shopfront photograph | 109 Fife Street, cnr 11th Avenue — verified; signage reads "Seed Co — Bulawayo Depot" |
| No. 2 Swansea Street, Belmont | The shop's own contact card — address, hours, number | Still **no business name anywhere on it**, so still a draft |

The Belmont card is probably **Frontline Farming** — it is the one Bulawayo stockist
named without an address, and this is the one Bulawayo address without a name — but
nothing in the screenshot says so, so the row stays a draft with the inference recorded
in `sourceNote` rather than published under a guessed name.

Open with the owner:

1. **Banket and Karoi contradict the flyer.** 83 Ginnery Road (Banket) and 196 Jamer
   Street (Karoi) are recorded against Farmer's Choice on the reading of the original
   brief, but Farmer's Choice's own flyer lists seven branches and neither town is among
   them. NTS *does* have a Karoi branch, at "Stand 248, Fred Jameson Road" — which may
   be the same street as "196 Jamer Street" under a garbled name. Both rows say so in
   `sourceNote`.
2. **NTS FarmShop Murehwa has two addresses** — "Stand 244, Murehwa" and "287 Makunde
   Building, opposite CBZ" — and "Stand 244" is the same number recorded for Mhangura,
   so one of them is probably a transcription error. Only the first is stored.
3. **NTS FarmShop Centenary** is named Centenary while its address ends "Muzarabani".
   Filed under Centenary.
4. **Farmline Supplies at 9 First Street and NTS Mutare at Shop 9, First Street** still
   sit at the same street number. Worth one glance.
5. Shop names follow the document's spelling ("Farmer's Choice"), and Bulawayo Seed
   Centre carries a public note that its signage reads "Seed Co Bulawayo Depot".

## Pavet Agrikno (added 19 Sep 2026)

Four branches of **Pavet Agrikno (Pvt) Ltd**, trading as *Pavet Seedlings &
Chemicals*, added from the owner's screenshots of Pavet's own Facebook page:

| Branch | Address | Town filed under |
| --- | --- | --- |
| Pavet Agrikno Epworth | 617A Makomo, Epworth, Harare | Harare |
| Pavet Agrikno Macheke | NRZ Complex, Macheke Railway Station | Macheke *(new town)* |
| Pavet Agrikno Marondera | 42 Elm Street, Marondera CBD | Marondera |
| Pavet Agrikno Shepperton Road | 151 Shepperton Road, Industrial Site, Marondera | Marondera |

Phones for all four: 0714 660 491, 0786 801 551. Web pavetagrikno.com, email
pavetagrikno@gmail.com.

**Provenance.** These come from Pavet's own advert dated 17 April — self-published
by the business, which is firmer than the directory rows that make up most of this
list. But it evidences *Pavet's outlets*, not that they carry Humuson product, so
`verifiedOn` stays null and the Checked column in the admin still wants working
through.

**Owner follow-ups:**

- **742 Mbuya Nehanda Road, Marondera is held back.** Pavet's Facebook Details
  panel gives it as their address, but that panel is undated while the advert is
  dated, and publishing it would put three Marondera branches on the page. If it
  is a real third site, add it; if the advert superseded it, nothing to do.
- **A second number appears only on the Details panel:** 0773 597 453, against
  0786 801 551 on the advert. Worth confirming which one reaches a branch.
- **Epworth is filed under Harare**, the way NTS's Mbare, Southerton, Cameron and
  Bluff Hill branches are. Epworth is its own local authority, but a farmer
  driving there thinks of it as Harare. Say if it should stand as its own town.
- **Does Pavet actually stock Humuson product?** The screenshots do not say so.
  The page already tells growers to ring ahead, but if Pavet is a prospect rather
  than a stockist they should come off it.

## Owner corrections, 19 Sep 2026

Three changes from the owner, two of which close questions that had been open since
the Bulawayo pass.

**Frontline Farming has its address — the Belmont inference was right.** The list
carried the same shop twice: `frontline-farming-bulawayo`, a stockist Humuson named
with no address, and `unnamed-belmont-bulawayo`, an address with hours and a phone
number and no business name anywhere on its contact card. The note above called the
Belmont card "probably Frontline Farming" and refused to publish on a guess. The
owner has now confirmed it. The two are merged into `frontline-farming-bulawayo` at
No. 2 Swansea Street, Belmont, with the hours and number, marked verified 19 Sep;
the placeholder draft is deleted. **The list holds no drafts any more.**

**NTS's head office is at Bluff Hill, not Kenneth Kaunda Avenue.** The 0%-accurate
directory put the head office at 75 Kenneth Kaunda Avenue and a FarmShop at 750
Lorraine Drive, Bluff Hill. The owner says the head office is Bluff Hill, so the two
rows were the same site and are now one: `nts-farmshop-bluff-hill`, carrying the
+263 242 253866 line that had been on the head-office row, noted as head office and
FarmShop counter. `nts-head-office` is deleted.

> Careful with what is actually confirmed here: the owner confirmed the **suburb**.
> The street address (750 Lorraine Drive) and the phone number still come from that
> directory and are unverified. If the head office has a different street number in
> Bluff Hill, this row needs it.

**NTS FarmShop Chiredzi added**, at B72 Knobthorn Road, Chiredzi — from National
Tested Seeds' own Facebook announcement dated 22 Aug 2024 for a 23 Aug 2024 opening.
Chiredzi is a new town for the list and gets its OSM point with the rest. The
announcement is two years old, so it is worth a call to confirm the branch still
trades before anyone drives there.

## Winpat Agrochem (added 20 Sep 2026)

**Winpat Agrochem P/L** added as a Harare stockist, from an owner-supplied
screenshot of the shop's Google business listing:

| Field | Value |
| --- | --- |
| Address | 52 Kenneth Kaunda Avenue, corner Second Street, Harare |
| Phone | 077 136 6208 |
| Website | winpatagrochem.co.zw |

The listing describes the business as an agrochemicals supplier in Harare and
rates it 4.7 from three reviews. The shop's own banner among the listing's
photos reads *"Cnr Second Str & Kenneth Kaunda Ave"*, which corroborates
Google's street and is why the corner is recorded alongside the street number.
Harare already had a coordinate, so no new town point was needed; the list is
now 45 outlets across 23 towns, still with no drafts.

> **Not the row that was deleted.** The 0%-accurate directory used to place NTS's
> head office at 75 Kenneth Kaunda Avenue, and that row was removed on 19 Sep when
> the owner confirmed Bluff Hill. Winpat at number 52 is a different business on
> the same street, not that entry coming back. (NTS is back on this street from
> 23 Sep, but as its Harare *town branch* and with no street number — see below.
> Three separate things share Kenneth Kaunda Avenue now: Winpat at 52, NTS's town
> branch somewhere on it, and the deleted head-office row that claimed 75.)

**Provenance and what is still open:**

- The banner prints four further contact numbers beside the one Google shows, but
  the photograph is far too small to read the digits. They are **left out rather
  than guessed at** — a wrong number on a stockist row sends a farmer to a dead
  line. A legible photo of that banner would add them.
- As with Pavet, the listing evidences *Winpat's shop*, not that they carry
  Humuson product. `verifiedOn` stays null and the row keeps its place in the
  admin's Checked queue.
- **Hours are not recorded.** The screenshot caught only "Closed · Opens 8am Sun",
  which says it trades on Sundays but nothing about the rest of the week.
- There is no `website` field on `Distributor`, so winpatagrochem.co.zw lives in
  the admin-only `sourceNote` rather than on the public card. Winpat is the first
  stockist to have brought a website with it; if more do, the model needs a field.

## NTS Harare moved to Kenneth Kaunda Avenue (corrected 23 Sep 2026)

**The owner withdrew the Robert Mugabe address.** `nts-harare` carried *173 Robert
Mugabe Street, Harare*, from the branch list on thedirectory.co.zw — the source that
rates its own listing "0% accurate". The owner says the Harare town branch is on
**Kenneth Kaunda Avenue**, so the Robert Mugabe address is gone.

| | Before | After |
| --- | --- | --- |
| Address | 173 Robert Mugabe Street, Harare | Kenneth Kaunda Avenue, Harare |
| Source | 0%-accurate directory | Owner, 23 Sep 2026 (street only) |

The row keeps its slug, so the importer updates it in place rather than deleting and
recreating it; the list is still 45 outlets across 23 towns with no drafts.

> **No street number, deliberately.** The owner named the street, not a number. The
> only Kenneth Kaunda number this project has ever held is **75**, and that sat on the
> directory's separate "NTS Head Office" row — the one the owner corrected to Bluff
> Hill on 19 Sep. Moving 75 onto the town branch would republish an address the owner
> has already told us is wrong, on a row they never attached it to. The street alone
> is honest and sends a farmer to the right road; a number would be a guess dressed up
> as a correction. **Open with the owner: the street number.**

Three other rows still carry a Robert Mugabe address and were **not** touched, because
the correction was about Harare and those are different towns with their own Robert
Mugabe streets: `nts-gweru-2` (50 Robert Mugabe Way, Gweru), `nts-masvingo`
(26 Robert Mugabe Street, Masvingo), and the two Farmer's Choice rows in Bulawayo and
Gweru. If NTS Gweru 2 or NTS Masvingo is wrong in the same way, say so and they go the
same route — both are still directory-sourced and unverified.

## Owner corrections, 25 Sep 2026 — ranges, application methods, Bacto-Seed

Five instructions in one message, and the last of them is a layout change rather
than a content one.

### Master is a powder

`master` had no formulation recorded anywhere. Its note carried a guess — *"photo
filename suggests 5L — confirm"* — which had quietly read the pack as a liquid.
The owner says Master is a **powder**, so the 5 L is withdrawn and the note now
says why. No pack size replaces it: none is stated in any source we hold, and the
one number we had turned out to be a misreading of the form, not a size.

The word now appears where a farmer sees it. `shortDescription` opens
*"Microbial powder that promotes soil biological and enzymatic activity…"*, which
follows the two products that already state their form in the same place — Bio NPK
Powder S (*"Microbial powder for seed dressing…"*) and Ocean (*"Liquid fertilizer
with a high concentration of seaweed extract…"*).

> **Still open: Master's pack size.** Bacto-Seed, now delisted, was the row that
> gave the 5 L its plausibility — both were Bio Energy, both were photographed in
> the same set. With Bacto-Seed gone and the form corrected, nothing in the
> project supports a size for Master at all.

### Grow+ and CarboAmin are biostimulants; Organic is the four the owner named

| Product | Ranges before | Ranges after |
| --- | --- | --- |
| Grow+ Top Dressing | Crop Nutrition, Organic | Crop Nutrition, **Biostimulants** |
| CarboAmin Basal Dressing | Crop Nutrition, Organic | Crop Nutrition, **Biostimulants** |
| eMAXX Ultra | Biostimulants | Biostimulants, **Organic** |
| Ocean | Biostimulants, Liquid Foliar | Biostimulants, Liquid Foliar, **Organic** |
| Bio NPK Powder S | Microbiological | Microbiological, **Organic** |
| Master | Microbiological | Microbiological, **Organic** |

Organic is now exactly **eMAXX Ultra, Ocean, Bio NPK Powder S and Master**. Both
products kept Crop Nutrition — the owner's instruction was about where they sit as
biostimulants, and a product belongs to every range its own text supports.

> **The Organic description had to change with the membership.** It read
> *"…humified carbon, humic and fulvic acids, amino acids and natural-origin trace
> elements"* — which is Grow+ and CarboAmin, the two products that just left. Left
> alone, the range page would have described its own former contents. It now reads
> *"seaweed extract, amino acids, and the bacteria and fungi that release what the
> soil already holds"*, which is the four that are actually in it, and a `note`
> records the reclassification so the next person does not read the rewrite as
> drift.

### Soil and drench are one method; fertigation and basal dressing are gone

`ApplicationMethod` went from eight values to five:

| Before | After |
| --- | --- |
| FOLIAR, **SOIL**, SEED_TREATMENT, TOP_DRESSING, **BASAL_DRESSING**, **FERTIGATION**, **DRENCH**, OTHER | FOLIAR, **SOIL_DRENCH**, SEED_TREATMENT, TOP_DRESSING, OTHER |

"Soil application" and "drench" are the same instruction to a farmer — put it on
the ground, in water — and as two filters they split one answer, so a grower
picking either saw half the products that suited them. Three products declared
both and are now listed once.

Migration `20260925110000_application_method_merge` rebuilds the enum, because
Postgres cannot drop a value from one in place. The data moves through `TEXT` so
the remap is ordinary SQL: SOIL and DRENCH both land on SOIL_DRENCH and are
de-duplicated, and the two dropped values are removed from the arrays. It was
applied against a populated database before it was committed.

> **A dropped method does not become SOIL_DRENCH.** `ApplicationGuide.method` goes
> to null on those rows and keeps its rate — the rate is what Humuson published,
> and re-filing the row under a method nobody chose would invent a recommendation.
> The importer has no rule for `basal` or `fertigation` either, so a label that
> still says one falls through to OTHER and is filtered out, rather than being
> mapped onto SOIL_DRENCH and putting the same filter back under a new name.

Two product **names** still carry the dropped words: *Grow+ Top Dressing* and
*CarboAmin Basal Dressing*. Those were not touched — they are the names on the
packs, and the method taxonomy is a filter, not a product name. **Open with the
owner:** whether CarboAmin should still be called "Basal Dressing" now that basal
dressing is not a method the site offers.

### Bacto-Seed is withdrawn

The last of the Bacto line, after Bacto-K and Bactoforce went on 17 Sep. It
follows the same route as those five: out of `products.json`, into
`delisted-products.json` dated 2026-09-25, and its old WordPress URL
(`/product/bacto-seed/`) now redirects to `/products` instead of to a page that
would 404. Its photo stays in `assets.json` and `public/images/products/`, exactly
as the 17 Sep delistings did — the importer prunes the product, not the archive.
The catalogue is **21 products**.

The finder's unit-test fixture was named after Bacto-Seed. It now names Bio NPK
Powder S, which is genuinely seed-dressed and soil-applied, so the test no longer
asserts behaviour through a product that does not exist.

### Stockist details sit above the map on a phone

The Where to Buy list and map share a two-column grid. The map was **first in the
DOM** so that a phone got its collapsed "View map of …" control before the list —
which meant the first thing a farmer met on the page was a control, and the
addresses and phone numbers they actually came for were below it.

The list is now first and the map follows. Both `lg:order-*` overrides are gone
with it: the grid's own column order already puts the list in the wider first
column and the map beside it on a wide screen, so the desktop layout is unchanged.
