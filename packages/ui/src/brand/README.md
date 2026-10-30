# Brand

The logo and the favicon, as the owner chose them on 2026-10-30
(`jadwigo-marketing/decisions/2026-10-30-jadwigo-wears-lockup-4a-an-andika-wordmark-with-a-crown-tipped-o`).
Imported as `@jadwigo/ui/brand/<file>`.

| File | What it is |
| --- | --- |
| `wordmark.svg` | "Jadwi" in ink, "go" in blue, the crown tipped on the J. Text as paths, so it never waits for Andika. |
| `crown.svg` | The crown alone, 40 by 26, with its ink outline. |
| `favicon.svg` | The app icon: a blue square with 25% corners and the yellow crown 62% wide. |
| `favicon-16.svg` | The same at 16 px: the crown 69% wide with a thicker line, so it still reads. |
| `icons.json` | The hashes of the two favicon SVGs the PNGs were rendered from. |

## Colours

`wordmark.svg` reads Zeszyt's roles with a fallback, so it follows night mode wherever
`foundation.css` is loaded and shows the day colours anywhere else (an `<img>`, a chat card):
`--jw-ink` for "Jadwi", `--jw-brand-go` for "go", `--jw-crown` and `--jw-crown-line` for the crown.
By night the crown has no outline. Crown yellow is for the brand only, never a lesson control:
help keeps its own yellow.

## The crown tip (hover 5a)

The crown is `<g class="crown">`, so a page that inlines the SVG can tip it. Its pivot is the bottom-left
corner of the crown's box, (-12.5, 2.15) in the SVG's units (1 em = 100). Only the crown moves:

```css
.logo .crown { transform-origin: -12.5px 2.15px; transition: transform 320ms cubic-bezier(.34, 1.8, .5, 1); }
.logo:hover .crown, .logo:focus-visible .crown { transform: translateY(-12.5px) rotate(-18deg); }
@media (prefers-reduced-motion: reduce) { .logo .crown { transition: none; transform: none; } }
```

The crown already sits at -12°, so -18° more is the handoff's -30°, and -12.5 units is its 6 px lift
at a 48 px wordmark.

## How `wordmark.svg` was made

Once, by hand. Run it again only if the lockup changes:

1. Outline "Jadwi" and "go" with `opentype.js` 1.3.4 from `@fontsource/andika`'s
   `andika-latin-700-normal.woff` at size 100, with kerning on and the baseline at y = 91. That is where
   Chrome puts Andika's baseline in a line-height 1 box, measured in a real browser.
2. Place the crown per the handoff: 71 wide (0.71 em) at x -12.5, y -44, scaled 71/40 from `crown.svg`,
   rotated -12° about its bottom-left corner.
3. Check it: render the same lockup as HTML with the real font and the handoff's CSS
   (`left: -.125em; top: -.44em; width: .71em; rotate(-12deg)`, origin 0% 100%), lay the SVG over it,
   and look for any ghost edge. The outlines' width matched the browser's to 0.03 px.

The favicon PNGs in each app's `public/` come from `tools/src/brand-icons.ts`. Run `make icons` after
changing a favicon SVG, and `make check` fails until you do.
