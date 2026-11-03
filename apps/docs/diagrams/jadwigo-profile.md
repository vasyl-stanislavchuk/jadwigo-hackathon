<!-- diagram-design-profile
name: Jadwigo
slug: jadwigo
source-url: none
created: 2026-11-03
updated: 2026-11-03
notes: Zeszyt, the Jadwigo design system: every colour a --jw-* role from packages/ui foundation.css, Andika with system-ui fallback, font source system. Source of truth in the jadwigo repo at apps/docs/diagrams/jadwigo-profile.md; install with bun run diagram-profile in apps/docs.
-->
# Style Guide

**The single source of truth for colors, typography, and tokens.** Every diagram draws from this — not from hex values inlined in other reference files. If you want to change the visual skin of Diagram Design, change this file.

The Jadwigo skin is Zeszyt, the app's design system: white paper by day and one flat dark tone by night, blue ink for the one thing to press, warm yellow for help. Every colour below is a `--jw-*` role from `packages/ui/src/styles/foundation.css`, resolved to its hex; the docs' test (`apps/docs/src/lib/diagram-profile.test.ts`) fails a value that differs from its token, so edit the token there and this profile with it.

To generate your own from a website URL, see [`onboarding.md`](onboarding.md).

---

## Tokens

### Semantic roles

Every token is referred to by **semantic role**, not by its hex value. Type references (`type-*.md`) and SKILL.md say `accent`, not `#bf4520`.

| Role | Purpose | Default (light) | Default (dark) |
|---|---|---|---|
| `paper` | Page background, default node fill (`--jw-ground`) | `#ffffff` | `#1d1e22` |
| `paper-2` | Diagram container bg, secondary fill (`--jw-act-quiet`) | `#f2eee6` | `#2a2c33` |
| `ink` | Primary text, primary stroke (`--jw-ink`) | `#22252d` | `#ece8de` |
| `ink-strong` | High-contrast text on the action fill (`--jw-on-act`) | `#0f285a` | `#e6eeff` |
| `muted` | Secondary text, default arrow stroke (`--jw-ink-soft`) | `#50535c` | `#b9b4a7` |
| `soft` | Sublabels, boundary labels (`--jw-placeholder`) | `#726f68` | `#918c83` |
| `rule` | Hairline borders (`--jw-line`) | `#e8e2d5` | `#373941` |
| `rule-solid` | Stronger borders, baselines (`--jw-line-strong`) | `#50535c` | `#b9b4a7` |
| `accent` | Focal / 1-2 max per diagram: the ink-blue action (`--jw-focus`) | `#3a5fa8` | `#93b6ff` |
| `accent-tint` | Fill for accent-bordered boxes: what was picked (`--jw-pick`) | `#dce8fb` | `#1d3157` |
| `link` | HTTP/API calls, external arrows (`--jw-pick-edge`) | `#2f63b8` | `#7aa6f0` |

> **Brand palette source:** the `--jw-*` roles named in each row's Purpose, in `packages/ui/src/styles/foundation.css`. Primitives (`--jw-p-*`) are never named here: a diagram reads roles, as the app does.

### Contrast contract

Every token must clear the threshold for each role it plays, against the background it actually sits on, in both skins. `scripts/verify-contrast.py` computes the WCAG 2.x ratio for every row above against the `paper` of its skin (`ink-strong` against the 0.85 `accent` fill it labels) and fails CI when one falls short.

| Use | Minimum vs. its actual background |
|---|---|
| Regular text, including any `soft`, `link`, or `accent` used as text | 4.5:1 |
| Large text (24px+, or 18.7px+ at weight 600+) | 3:1 |
| Essential non-text marks: lines, arrows, borders, focus outlines, data points | 3:1 against the adjacent color |
| Decorative rules and translucent tints (`rule`, `rule-solid`, `paper-2`, `accent-tint`, fills at opacity) | No minimum, but never the only carrier of meaning |

- **A token used in several roles must pass each one.** `accent` is a stroke in one place and a label in another, so it is held to 4.5:1, not the 3:1 its strokes alone would need. Don't assume a token is non-text because it usually is.
- **Translucent colors are composited first.** An `rgba()` fill or stroke is blended over `paper` before its ratio is measured. A value that clears the bar at full strength can fail at 0.5 opacity.
- **Surfaces other than `paper` cost contrast.** Inside an `accent-tint` box or on `paper-2` every ratio drops. Measure text placed there against that surface, not against `paper`.
- **Current values:** each role is a `--jw-*` token whose text pairs `foundation.test.ts` already holds to 4.5:1 by day and by night; a role reused as text here keeps that bar.

### Inversion rule (light → dark)

Each role is declared twice in `foundation.css`, at `:root` and under `[theme="dark"]`; the dark column is that second declaration resolved, never an inversion computed here.

### Series palette (multi-series chart types only)

A small set of desaturated, editorial-tone colors for chart types that genuinely need to distinguish multiple overlapping entities (currently: **radar**). The "1-focal" rule still holds — `accent` is reserved for the focal series; the palette below covers the rest.

| Token | Light | Dark | Notes |
|---|---|---|---|
| `series-1` | `#7c8f6f` (sage) | `#9caf8f` | Non-focal series |
| `series-2` | `#5e7a9b` (dusty-blue) | `#82a0c0` | Non-focal series |
| `series-3` | `#b8915a` (mustard) | `#d3ad7a` | Non-focal series |
| `series-4` | `#9c6b50` (rust-brown) | `#b88670` | Non-focal series |
| `series-5` | `#6e6479` (slate) | `#8d8298` | Non-focal series |

Fills sit at `0.18` opacity light, `0.22` dark; strokes use the full color. **Don't backfill these tokens to non-chart types** — architecture, swimlane, etc. continue to use muted-ink variants. The series palette is opt-in for diagrams where overlapping shapes demand distinguishable color, not a license to add color elsewhere.

### Terminal skin (opt-in alternate)

A self-contained palette for the terminal-window primitive (see [primitive-terminal.md](primitive-terminal.md)) — a CLI-chrome register for dev-tool posts and technical social cards. It does not replace the default skin above and isn't affected by onboarding; it's a second, fixed skin you opt into per-diagram.

| Token | Hex | Purpose |
|---|---|---|
| `terminal-page` | `#0a0a0a` | Page background behind the window |
| `terminal-paper` | `#141414` | Window body, node fill |
| `terminal-bar` | `#1b1b1b` | Titlebar strip |
| `terminal-border` | `#2b2b2b` | Window border, hairlines |
| `terminal-ink` | `#f5f5f5` | Primary text, primary stroke (same white-smoke as default `ink`) |
| `terminal-muted` | `#9a9a9a` | Secondary text, sublabels, ring stroke |
| `terminal-soft` | `#5c5c5c` | Tertiary — inactive dots, spokes |
| `terminal-accent` | `#ff5a36` | The one accent — focal station, prompt sign, active dot |
| `terminal-accent-tint` | `rgba(255,90,54,0.12)` | Fill for accent-bordered boxes |

**1-accent rule still holds.** Everything that isn't `terminal-ink` or `terminal-muted`/`terminal-soft` should be `terminal-accent` — never introduce a second hue.

---

## Typography

| Role | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `title` | Andika, system-ui, sans-serif | 1.75rem | 700 | Page H1 |
| `node-name` | Andika, system-ui, sans-serif | 12px | 700 | Human-readable labels |
| `sublabel` | ui-monospace, monospace | 9px | 400 | Port, protocol, URL, field type |
| `eyebrow` | ui-monospace, monospace | 7–8px | 500, tracked 0.18em, uppercase | Type tags, axis labels |
| `arrow-label` | ui-monospace, monospace | 8px | 400, tracked 0.06em | Arrow annotations |
| `callout` | Andika *italic*, system-ui, sans-serif | 14px | 400 | Editorial asides only |

### Font stack

No font link ships (see Font source below). Every stack names Andika first — the docs site already loads it — and falls back to the reader's system face:

```css
font-family: 'Andika', system-ui, sans-serif; /* names, titles, callouts */
font-family: ui-monospace, monospace; /* sublabels, eyebrows, arrow labels */
```

### Font source

The font source decides whether a diagram makes any network request. It is a skin setting, so a saved profile carries it too.

Font source: `system`

| Value | What ships | Network |
|---|---|---|
| `web` | A Google Fonts `<link>`; not used by this profile | One stylesheet request, plus the font files |
| `system` | No font `<link>`; every family stack falls through to the platform's own serif, sans, and monospace faces | None |

Use `system` when the user asks for offline output, system fonts, or no Google Fonts, or when this line says `system`. In `system` mode:

- Omit the font `<link>` (and the export `@import`) entirely. Keep every `font-family` stack as written: each one already ends in a generic family (`system-ui, sans-serif`, `ui-monospace, monospace`), so a viewer on docs.jadwigo.pl, which loads Andika, gets Andika and everyone else gets their system face.
- Fallback faces have different metrics from Andika, so keep the 8px label padding intact rather than trimming boxes to the Andika measurement.
- Export with `python3 scripts/export_svg.py <file> --system-fonts`, and verify with `python3 scripts/self_check.py --offline <file>`, which fails if the Google Fonts link is still present.

The render linter's default run (`lint-render.py` with network blocked) measures exactly this fallback rendering, so every shipped template and example is already checked in system-font mode.

Andika is SIL Open Font License; with it installed locally the stacks resolve to it first, still with no network.

### Polish, English and Ukrainian labels

Jadwigo's labels are Polish or English, and Andika carries every Polish and Ukrainian letter, so no label extends its family and there is no register switch: names, sublabels, arrow labels, eyebrows and legend text keep the treatments in the table above. Measure a name per character (0.60em sans, 0.62em mono), add padding, and round the box up to a multiple of 4; Polish capitals such as `Ż` and `Ł` cost no more than a Latin capital.

**Load-bearing rule:** Mono is for *technical* content (ports, commands, URLs, field types). Names go in Andika. The page title is Andika at 700, and italic Andika is reserved for annotation callouts (see [primitive-annotation.md](primitive-annotation.md)).

---

## Stroke, radius, spacing

| Token | Value | Use |
|---|---|---|
| `stroke-thin` | `0.8` | Tag-box outlines, leaf nodes |
| `stroke-default` | `1` | Most strokes |
| `stroke-strong` | `1.2` | Emphasis strokes |
| `radius-sm` | `4` | Small tags |
| `radius-md` | `6` | Node boxes |
| `radius-lg` | `8` | Containers, rings |
| `grid` | `4` | Every coord, size, and gap is divisible by 4 (hard rule) |

---

## Node type → treatment

Semantic role combinations — reference these by name in type specs.

| Type | Fill | Stroke |
|---|---|---|
| `focal` (1–2 max) | `accent-tint` | `accent` |
| `backend` | `#ffffff` (white) | `ink` |
| `store` | `ink @ 0.05` | `muted` |
| `external` | `ink @ 0.03` | `ink @ 0.30` |
| `input` | `muted @ 0.10` | `soft` |
| `optional` | `ink @ 0.02` | `ink @ 0.20` dashed `4,3` |
| `security` | `accent @ 0.05` | `accent @ 0.50` dashed `4,4` |

---

## Customizing the skin

Four options:

1. **Run onboarding** — see [`onboarding.md`](onboarding.md). Drop a URL; the skill extracts the palette + fonts and rewrites this file.
2. **Edit by hand** — change the hex values in the tables above. Run the pre-output taste gate afterward to verify the accent still reads as "focal" against the new paper color.
3. **Brand handoff** — paste your existing design-token JSON into a new section here and map its tokens to the semantic roles above.
4. **Client profiles** — save and switch named skins, or bind one to a project, using [`profiles.md`](profiles.md).

### Constraints (don't break these)

- **Contrast**: every text token (`ink`, `muted`, `soft`, `link`, and `accent`) must clear 4.5:1 on `paper`, in both skins. See the [contrast contract](#contrast-contract); `scripts/verify-contrast.py` checks it.
- **One accent**: pick one color for `accent`. Two accents erases the focal signal.
- **No rainbow palette**: if your brand ships 8 colors, pick 3 (paper, ink, accent). The rest become `muted` variants.
- **Sans + mono**: Andika carries names, titles and callouts (it has 400 and 700 only, and every Polish letter a label here needs); mono stays for technical sublabels. No third family.
- **Paper is the app's ground**: white by day (`--jw-ground` went from cream to white in the app), one flat dark tone by night. Do not warm it here; change the token.
- **Dot pattern is optional, not default**: the 22×22 dot pattern is an opt-in "dotted paper" variant (good for long-form editorial hero diagrams). The default background is a clean `paper` fill, no pattern. When the pattern is enabled, it should sit at ~10% opacity of `ink` on `paper` — visible but quiet.
- **Container is clean by default**: the diagram sits directly on the page paper, no secondary container background or border. A framed variant (`paper-2` bg + `rule` border + 8px radius + padding) is available as an opt-in for card-heavy layouts, but don't reach for it by default — the extra chrome fights the figure.
