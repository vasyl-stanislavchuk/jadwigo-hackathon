# The lesson player against Zeszyt, 2026-10-29

Issue `dl-uukj.29.144`. The reference is the System page, `/playground/system`
(`apps/web/src/playground/views/system/`), the latest vision for Zeszyt
(`david-learns/decisions/2026-10-26-the-playground-system-page-is-the-latest-vision-for-the-zeszyt-t`).
Also in force: white paper, with keyboard focus as an inner frame
(`david-learns/decisions/2026-10-25-zeszyt-goes-white-paper-keyboard-focus-is-an-inner-frame-and-eve`),
settings and navigation controls at the system's 48
(`david-learns/decisions/2026-10-25-settings-and-navigation-controls-take-the-design-system-s-48-and`),
and the short-phone keypad choice
(`jadwigo-learner-experience/notes/2026-10-29-on-a-short-phone-screen-the-keypad-keys-drop-from-72-px-to-the-k`).

## How it was walked

- The 5 featured lessons that `GET /api/v1/featured-lessons` lists: Równe grupy (`0ectzj`), Piątki
  wszędzie (`7kb53j`), Razy cztery (`4fygf2`), Ó i rz (`3d9tkg`) and the spelling diagnostic
  (`142qtv`). That is 56 steps.
- Each step was walked at 390x844 and 360x640 by touch and at 1280x800 by keyboard, in 4 states:
  open, the first Tab (laptop only), help open, and the solution after "Jeszcze nie wiem". A
  Playwright walker recorded each part's box and computed style (top bar, instruction, card,
  answer, field, option, key, dock, footer, close).
- The walk ran against a local api seeded with the same lessons (`make db-seed`), on `main` with
  `dl-uukj.29.143` applied, so the missing 16 px side padding is not reported again.
- app.jadwigo.pl was opened only for "before" screenshots of each lesson's first step, so that it
  writes as few attempts as it can. Only the laptop run and the 390 list page loaded there. The
  phone runs on prod lost the network.
- Screenshots are on the branch `shots/dl-uukj.29.144`, which is never merged. `<shot>` below
  means `dl-uukj.29.144/<shot>.png` on that branch. The `<size>-<lesson>-open` sheets show every
  step of a lesson at one size.

## What already matches

- **Column and gutters:** 358 with 16 px gutters at 390, 328 with 16 at 360, 720 at x 280 on the
  laptop. Phone sideways keeps 16 px gutters.
- **Top bar:** 56 on a phone and 72 on a laptop. The laptop's step bar is 720 wide at x 280.
- **Footer:** 96 tall on every frame. On a phone the bulb is 64 and Sprawdź fills the rest; on a
  laptop Sprawdź is 200.
- **Surfaces:** the prompt card is white with a 2 px line and 16 px corners, and fields have a
  2 px line.
- **Focus:** buttons draw no focus ring, as `Gallery.tsx:168` says.
- **Keypad:** keys are 72 at 390x844 and drop to 56 at 360x640, as the short-phone decision says.
- **Type on the laptop:** the instruction is 22 px, weight 700.

## Gaps

| Row | Step | Size | Screenshot | What breaks | Fix | State |
| --- | --- | --- | --- | --- | --- | --- |
| G1 | Every short step, and the list page | all; worst on 1280x800 | `before-1280x800-7kb53j-s01`, `prod-1280x800-7kb53j-s01`, `walk-390x844-7kb53j-s05`, `after-1280x800-7kb53j-s01` | White paper: under a step shorter than the window, the root's Grape `--background` #fef7ff (`tokens.css:26`, which `body` paints in `tailwind.css:92`) shows below the Zeszyt ground. That is 386,659 of 1,024,000 pixels at 1280x800, the same on prod and on `main`. | The player's `[data-lesson-theme]` fills the window and has square corners (`lesson.css`) | fixed in this PR |
| G2 | Every step with an instruction | 390x844, 360x640 | `walk-390x844-0ectzj-s01` | The phone instruction is 19 px (`stage.css` `--kid-instruction-size: 1.1875rem`). The System page says "we keep 20" (`frame/data.ts:277`, `data.ts:104`), which is `--jw-size-instruction` at 20 in `foundation.css`. | Read `--jw-size-instruction`. Then check that 360x640 still fits the instruction, the card and the field above the dock. | next PR (type) |
| G3 | The right, miss and solution bands | 390x844, 360x640 | `walk-390x844-0ectzj-s01-solution` | On a phone the band's title is 18 px and its second line is 16 px (`stage.css` phone band rules). The System page uses `--jw-size-verdict` (20 on a phone) and `--jw-size-body` (18) (`Foundations.tsx:154,157`). | Read the 2 tokens | next PR (type) |
| G4 | Every step | 390x844, 360x640, 1280x800 | `walk-390x844-0ectzj-s01` | The close control measures 56 by 56 on every frame. The System page and the 2026-10-25 decision make navigation controls 48 (`frame/data.ts:207,210`). In the 56 px phone bar it starts at y -1, because it is centred in the 54 px left inside the bar's 2 px line. | Make the close button 48, centred in the bar | next PR (navigation) |
| G5 | Every keypad step | all | `walk-390x844-0ectzj-s01` | Keypad keys and the fold and more-below arrows have 16 px corners (`Keypad.tsx:33`, `stage.css` "like the keys"). The System page says "10 px on keys and tiles" (`Foundations.tsx:239`); only letter tiles are 10. | Pick 10 or 16, then state it on the System page or in the CSS | owner's call (a value the System page draws) |
| G6 | The spelling steps | 390x844, 360x640 | `walk-390x844-142qtv-s01` | Phone letter keys are 48 tall (`stage.css` `height: 3rem`), and MEASURES says 48 (`frame/data.ts:257`). The same page also says lesson tap targets are 56 or more (`SystemPage.tsx:265,272`). | Settle 48 or 56 for the letter row | owner's call (the System page disagrees with itself) |
| G7 | 142qtv s02-s06, s08-s12; 3d9tkg s06, s11, s13, s14 | all | `walk-390x844-142qtv-s02`, `walk-390x844-3d9tkg-s01` | "Wpisz brakujące litery." stands inside the prompt card as the question, with the sentence and its gaps under the card. In every other step the instruction stands above the card and the question is inside it. | Draw the spelling family's task as the instruction | owner's call (the family's view and the lesson content) |
| G8 | 7kb53j s02 (clock), s06 (ruler) | 390x844 | `walk-390x844-7kb53j-s02`, `walk-390x844-7kb53j-s06` | On open, the instruction scrolls half under the top bar and is cut through its line. This is `openDelta`'s field-wins branch (Slots addendum 2.5): the box from the instruction to the field does not fit above the dock. | Scroll whole lines, or let the instruction go out of view completely | owner's call (the open-scroll rule) |
| G9 | 7kb53j s05 (compare: <, =, >) | 390x844, 360x640 | `walk-390x844-7kb53j-s05`, `walk-1280x800-7kb53j-s05` | On a phone the 3 sign options wrap 2 + 1, so ">" sits alone on a second row. On the laptop they stand in one row. The System page has no 2-column rule for 3 short options. | 3 short options in one row on a phone | next round, after the owner looks |
| G10 | none | none | none | A stale comment in `stage.css` says the dock pads "12 16 16"; the rule sets `2rem 1rem 1rem` (32 16 16). | Fix the comment | next PR (type), as a one-line change |

## Rounds

1. **This PR:** G1, the ground. The owner looks at the screenshots, and the owner's notes become
   rows here.
2. **Next:** G2, G3 and G10 together (type), then G4 (navigation). Each is its own PR, with before
   and after at the 3 sizes.
3. **The owner's calls:** G5 to G8. They wait for the owner's answer and are not fixed here.
