# Design system

The brand direction: **soil-first premium agritech** — deep humus greens and warm paper
neutrals from Humuson's own identity, sharpened with a luminous leaf accent and
editorial typography. The Harvest Smart-Agriculture reference set the quality bar
(layered imagery, floating data cards, oversized type); the execution is original and
built from Humuson's real assets (see `docs/design/REFERENCE-ANALYSIS.md`).

## Tokens (`src/app/globals.css`, Tailwind v4 `@theme`)

### Colour

| Token          | Value     | Use                                            |
| -------------- | --------- | ---------------------------------------------- |
| `brand`        | `#005820` | The logo green (extracted from the brand mark) |
| `humus-950…300`| `#08110b → #5c9670` | Dark grounds, headers, hero, footer  |
| `leaf-200…800` | `#ddf6b8 → #3c6518` | Luminous accent: CTAs, highlights    |
| `soil-300…700` | `#c9a678 → #52432a` | Earth accents, secondary badges      |
| `paper / -dim / -deep / cream` | `#f6f4ec…` | Light surfaces               |
| `ink / -soft / -faint` | `#131a12…` | Text on light                         |
| `line`, `line-dark` | | Hairlines                                          |

Rule of thumb: **dark sections are humus + grain + leaf glow; light sections are paper +
cream cards + ink text.** `leaf-400` is the primary CTA on dark; `humus-900` on light.

### Typography

| Font              | Role                                            |
| ----------------- | ----------------------------------------------- |
| Space Grotesk     | Display, headings, data, buttons (`font-display`) |
| Inter             | Body/UI (`font-sans`)                           |
| Fraunces (italic) | Editorial accents only (`text-editorial` / `Em`) |

Scale utilities: `text-display-1/2/3` (clamped, tight tracking), `text-title`,
`text-eyebrow` (uppercase, 0.22em tracking). These are registered with tailwind-merge
(see `src/lib/utils.ts`) — **add any new custom `text-*`/`bg-*` utility to that config**
or `cn()` will drop it next to a colour class.

### Surfaces & depth

- `bg-grain` — SVG noise overlay for dark sections (registered as a bg-image utility)
- `glow-leaf` — radial leaf-tinted glows for dark sections
- `glass-dark` / `glass-light` — floating cards over imagery (used sparingly)
- Shadows: `shadow-card` (resting), `shadow-pop` (hover), `shadow-float` (over imagery)
- Radii: cards `rounded-2xl/3xl`, actions `rounded-full`

## Layout: rhythm, measure, gutters

One scale, used everywhere, because the alternative is what this replaced:
`pb-16` on one page, `pb-20` on the next, `py-16 md:py-20` on a third, and
section seams that landed at different heights on adjacent pages.

| Step | Utility | Mobile → md → xl |
| --- | --- | --- |
| tight | `section-y-tight` | 2.5 → 3 → 3.5rem |
| base | `section-y` | 3.5 → 4.5 → 5.5rem |
| loose | `section-y-loose` | 5 → 6.5 → 8rem |

One-sided variants (`section-pt`, `section-pb`, `section-pb-loose`, …) exist for
a section that butts against the page opener or the footer and must not double
up on the gap. **`<Section>`** (`src/components/layout/section.tsx`) wraps the
scale with the container and the light/paper/dark tones; prefer it for new
markup. `PageIntro`'s bottom padding *is* the gap to the first section, which is
why sections after it take `top="none"` — two paddings meeting at that seam is
what produced the large voids.

Gutters are two values, not eight. `gap-3` for chips and tiles, `gap-4 sm:gap-5`
for cards, `gap-8 lg:gap-12` between the columns of a two-column page layout.
**`<CardGrid>`** applies the card gutter and sizes columns from a minimum card
width via `auto-fill` rather than from breakpoints, so a grid keeps working when
it is dropped inside a narrower column. Rows are equal height by grid default; a
card opts in with `h-full` and pins its action with `mt-auto`, which is what
keeps a row's links on one line.

Measure: `container-site` (80rem) for pages, `container-wide` (90rem) for the
header and footer, `container-reading` (68ch) for editorial bodies — characters,
not pixels, because line length is a function of the type.

### Type scale for page openers

`text-page-title` sits between `text-display-2` (a homepage hero, which earns
its size) and `text-display-3` (a section heading). Sub-page titles used to run
at `text-display-2` — 68px on a laptop — which pushed the first useful line of
every page most of a screen down.

> **Every custom `text-*` utility must be registered in the `font-size` group in
> `src/lib/utils.ts`.** tailwind-merge classifies an unknown `text-*` class as a
> *colour*, so an unregistered one is deleted from `cn("text-page-title
> text-ink")` silently — the heading still renders, at body size, with no error
> and nothing in the diff to see. `tests/unit/design-tokens.test.ts` fails if the
> set defined in `globals.css` and the set registered in `utils.ts` ever drift.

## Components

- UI kit: `src/components/ui` — Button/ButtonLink (pill), Badge, Field/Input/Textarea/
  NativeSelect (implicit label association — no ids), Dialog/Sheet, Tabs, Accordion,
  Table, Skeleton/Spinner, EmptyState (always includes a next action), SectionHeading + `Em`.
- Motion: `src/components/motion` — `Reveal`/`RevealGroup`/`RevealItem` in five shapes
  (`rise`, `wipe`, `scale`, `blur`, `fade`), `Enter` (the same shapes played on mount, for
  page openers, timed to the route veil), `ImageReveal` (curtain + settle), `Spotlight`
  (pointer-following pool of light on a card), `Parallax`, `Tilt`, `Counter` (real numbers
  only). See **Motion & transitions** below. **Every motion component renders statically
  under `prefers-reduced-motion`.**
- Scrolling: `src/components/layout/smooth-scroll.tsx` (Lenis, wheel devices only) with
  `src/lib/smooth-scroll.ts` (`useLenis`, `scrollToElement`); `route-transition.tsx` is
  the veil between pages.
- Homepage screens: `src/components/home/screen.tsx` (`Screen`, `Ambient`),
  `screen-nav.tsx` (dot navigation and the snap), `src/lib/screens.ts` (which screen is
  under a point).
- Signatures: ProductCard (hover quick-facts), GrowthTimeline (stage tabs + growing rail),
  FinderWizard, Flipbook (CSS-3D page turn), catalogue chapter themes
  (`soil / biology / vitality / nutrition`).

## Motion & transitions

One ease everywhere — `cubic-bezier(0.16, 1, 0.3, 1)`, the expo-out — and one idea:
an element is already where it belongs, and arrives there. Nothing bounces in from
off-screen; nothing loops for attention.

### Smooth scroll (`SmoothScroll`, Lenis)

On anything with a wheel, the page scrolls through Lenis
(`src/components/layout/smooth-scroll.tsx`): each wheel step moves a *target*, and every
frame the real scroll position closes a fraction (`lerp: 0.085`) of the remaining distance
— the page glides and settles instead of stepping. It is the native scroll position that
moves, so sticky elements, IntersectionObservers, parallax and the reading-progress bar
are untouched. Touch devices keep native scrolling (already inertial), and
`prefers-reduced-motion` gets no Lenis at all. The one instance lives in
`src/lib/smooth-scroll.ts` (`getLenis`, `useLenis`, `scrollToElement`); anything that
moves the page goes through `scrollToElement`, which falls back to `scrollIntoView`.

Three rules for anything that scrolls inside the page:

- A nested vertical scroller (a dialog body, a sheet, a combobox list, the flipbook's
  thumbnail grid) carries `data-lenis-prevent`, so a wheel over it scrolls *it* and the
  page stays put.
- A scroll lock (react-remove-scroll's `body[data-scroll-locked]`, which every Dialog sets)
  stops Lenis for its duration; the header's menu does the same by hand.
- Hash links glide: a click handler calls `lenis.scrollTo` on the target without preventing
  the click, so the hash and focus still land as a native anchor's do. `scroll-margin-top`
  is honoured.

### Entrances (`Reveal`, `RevealItem`, `Enter`)

| shape   | what it is                            | use it for                    |
| ------- | ------------------------------------- | ----------------------------- |
| `rise`  | fade up 40px over 0.85s (the default) | most content                  |
| `wipe`  | a curtain lifting off the block       | display headings, page titles |
| `scale` | settles from slightly larger          | media, a single feature       |
| `blur`  | sharpens as it rises                  | staggered cards               |
| `fade`  | opacity only                          | anything already in motion    |

`Reveal` plays when scrolled into view. `Enter` (`src/components/motion/enter.tsx`) plays
the same shapes on mount, for page openers that are in view from the first frame, and
holds for the route veil when it mounts under one (`useVeilLead`, which the homepage hero
uses too). `PageIntro` is the reference choreography — crumbs fade, eyebrow rises, title
wipes, lede rises, actions last — and the article and result pages open the same way.

`wipe` clips with `inset()` whose resting value is negative on every side, so nothing is
left clipped afterwards — a card's hover shadow still shows. `blur` clears its filter once
it has landed: `filter: blur(0px)` is not `none`, and would keep costing a layer.
`ImageReveal` is the photograph version: the curtain draws across the frame while the
picture settles from 1.16× to rest.

### The homepage as screens

The homepage is eight viewport-height screens (`min-h-[100svh]`, content centred, chapter
number in each eyebrow), and a scroll settles on one of them. Under Lenis the snap is
Lenis's (`screen-nav.tsx`): a beat after the wheel goes quiet, wherever the glide is
*heading* is compared with the screen edges around it — more than a fifth of the way into
a screen goes on to the next edge, less goes back, and a screen taller than the viewport
can be read through the middle. Touch is never retargeted. Without Lenis (phones, reduced
motion) the document does the same in CSS: `html:has([data-screens]):not(.lenis)
{ scroll-snap-type: y proximity }`, each screen `snap-start`. **`proximity`, never
`mandatory`**, for the same reason: nobody is dragged back. The header takes its tone from
the screen under its own bar (transparent over dark, frosted over light); the dot
navigation on the right marks the screen at the middle of the viewport. Dark screens —
and dark page openers, and the footer's CTA band — carry `Ambient`: two radial gradients
moved by transform on a 26–34s cycle, slow enough never to be seen moving.

### Route transitions

`src/components/layout/route-transition.tsx`. An internal link click sweeps a curtain up
over the page from the bottom edge — a hairline of leaf with a soft bloom at its front —
holds while the next page loads (a progress line creeps along its top), and once the new
route has rendered underneath, carries on up and off the top, uncovering the new page from
the bottom up: 0.42s in, 0.66s out, one continuous motion, with the scroll reset and the
swap happening behind it. The veil is tinted to the *destination* (`src/lib/route-tone.ts`,
shared with the header) so a move into a dark page reads as that page arriving, not a blink
to paper on the way. The `(site)` layout has **no `loading.tsx`** — a route-level skeleton
is exactly the hard cut the veil replaces.

It is a veil and not a transform on the page for a reason worth keeping: a transformed
element is a containing block for `position: fixed` descendants, and the product page's
mobile action bar, the flipbook's glow and the reading-progress bar are all fixed children
of the page. Transforming a fixed *sibling* breaks none of them. The veil is
`pointer-events-none` throughout, so a click during the sweep lands where it was aimed, and
it renders nothing under `prefers-reduced-motion`.

## Voice & honesty in UI

- Claims and stats shown must exist in the database (i.e. in Humuson's published
  material). The `Counter` is only ever fed computed real numbers.
- Missing agronomic data renders the confirm-with-support state, never a fabricated value.
- Empty and error states are designed (icon, explanation, useful next actions —
  usually WhatsApp and the finder).

## Accessibility baseline

Semantic landmarks, skip link, focus-visible rings (`leaf-500`), labelled controls,
keyboard-navigable tabs/timeline/flipbook (arrow keys), `aria-live` for async answers,
AA contrast on both grounds, reduced-motion support throughout.
