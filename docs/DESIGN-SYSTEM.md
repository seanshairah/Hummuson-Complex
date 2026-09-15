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
