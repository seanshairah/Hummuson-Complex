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
- Motion: `src/components/motion` — `Reveal`/`RevealGroup`/`RevealItem` (expo-ease rise),
  `Parallax`, `Tilt`, `Counter` (real numbers only). **Every motion component renders
  statically under `prefers-reduced-motion`.**
- Signatures: ProductCard (hover quick-facts), GrowthTimeline (stage tabs + growing rail),
  FinderWizard, Flipbook (CSS-3D page turn), catalogue chapter themes
  (`soil / biology / vitality / nutrition`).

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
