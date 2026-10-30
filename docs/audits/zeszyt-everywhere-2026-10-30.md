# Zeszyt everywhere: the app after dl-uukj.32, 2026-10-30

Epic `dl-uukj.32`. On 2026-10-29 the owner saw the parent's "Wyślij kod" button in Grape purple
(`#7706ff`), a palette superseded on 2026-10-26
(`david-learns/decisions/2026-10-26-zeszyt-replaces-the-grape-palette-the-2026-10`). Zeszyt's
tokens were scoped to `[data-lesson-theme]`, which only a lesson sets, so every non-lesson screen
fell through to the old `:root` palette and the system font. The owner's answer: Zeszyt
everywhere, one design system for `apps/web`, `packages/ui` and `packages/lesson-kit`.

The reference stays the System page, `/playground/system`
(`david-learns/decisions/2026-10-26-the-playground-system-page-is-the-latest-vision-for-the-zeszyt-t`).
This page records what changed and what the owner still decides.

## How it was walked

- The 3 audits of 2026-10-29 (the design-system inventory, `apps/web`, `packages/lesson-kit` and
  the board) and the plan review are summarised in the lead's plan; their findings became the
  lanes' beads (`dl-uukj.32.1` to `.12`).
- Each lane measured its screens in Chromium against a local vite with an in-memory api and
  placeholder sign-in values, at 390x844 and 1280x800, light and dark, before and after.
- Screenshots are on the branch `shots/dl-uukj.32`, never merged: `dl-uukj.32/<name>.png`.
  `before-parent-light` and `after-parent-light` are the tokens lane's (#200);
  `parent-before-signin-390x844` and `parent-after-signin-390x844` the parent lane's (#225);
  `playground-before-system` and `playground-after2-system` the playground lane's (#223, #229).
- CI's browser job ran on every PR; `parent.spec.ts` now asserts the sign-in button's computed
  fill is `--jw-act` and its font starts with Andika, at both sizes.

## What changed

| Where | Before | After | PR |
| --- | --- | --- | --- |
| `:root` tokens | Grape: `--primary #7706ff`, `--background #fef7ff`, Inter (never loaded) | Zeszyt's three tiers at `:root`; dark under `[theme="dark"]`; aliases on `[theme]` and `[data-lesson-theme]` too; the playground chrome keeps its compact scale on `html[data-playground]` | #200 |
| Utilities | `[var(--jw-*)]` and `[var(--kid-*)]` written in classes, about 50 in the System page and 85 in lesson-kit | `bg-jw-act`, `text-jw-body`, `min-h-kid-tap`, `rounded-jw-card`, `shadow-jw-act`, `duration-jw-*`, `ease-jw-out` and the rest, in `tailwind.css` `@theme inline`; `cn()` resolves their pairs | #192 |
| The check | `packages/lesson-kit` banned hex and px only | `@jadwigo/testing`'s `checkTokens` runs in `apps/web`, `packages/ui` and `packages/lesson-kit`: no literal colour, px, rem, palette class, `var()` in a class or dead class; allowlists shrink only | #192 |
| `packages/ui` | kid-sized primitives only; 3 Switches and 2 Tabs across the app | the adult kit: `Page`, `Heading`, `Label`, `Field`, `Link`, `Notice`, `OutcomeTile`; `Input kind="text"`, `Card size="compact"`, `Button size="control"`; `RadioGroup`, `SegmentedControl`, `Tabs`, `SideMenu` in one place | #204, #208, #220 |
| The action | `Button` default `bg-primary`: the ink blue outside a lesson, the action blue only under the lesson rules | `bg-jw-act text-jw-on-act shadow-jw-act` on every page, quiet when disabled | #205 |
| `packages/lesson-kit` | 10 copies of the tile class string, 3 of the dnd config, 5 pinned clocks, readouts at 2.5rem and 3rem by hand, motion literals, `border-black` | `TaskTarget` at `text-jw-target`, one `QUIET`, one `stillClock`, `duration-jw-*`, the ink role, `text-jw-small` labels, the keypad glyphs at `text-jw-key*`; allowlist 80 → 47 (8 kept with a reason, 39 wait on steps 5 to 8) | #194 to #203, #210, #212, #214, #222 |
| `/`, `/play`, results, the child's review | 2 copies of the kid page frame, inline frames, hand-rolled cards and pills, dead classes | one `Page width="kid"`, `Heading`, `Card`, `Badge`, `Link`; allowlists deleted | #224 |
| `/parent/**` | Grape purple, system font, the kid number `Input` for the e-mail, bare labels, 3 page frames, 2 outcome maps, the child's copy ("Poproś rodzica o pomoc") | white paper, Andika, `Page width="prose"`, `Field`, `Card`, `OutcomeTile`, `Badge`, the adult register everywhere, one tone table; allowlist deleted | #215, #225 |
| The playground | a second shadcn kit (13 files) with dead `destructive` and `animate-*` classes, a third set of controls in `settings.tsx`, 98 arbitrary values | its sheet from `@jadwigo/ui`, dead classes gone, the controls from `@jadwigo/ui`, the utilities; new System page sections "App pages", "Tiles and still answers", "Gaps for the owner"; allowlist 98 → 3 with reasons | #223, #229 |
| The tone named `amber` | `Tone = "idle" | "green" | "amber" | "missing"` while the colour had been red since 2026-10-24 | `try_again`, in code, selectors, comments and test names (`dl-uukj.29.18`) | this PR |

Measured on `/parent` at 390x844, light:

| | Before | After |
| --- | --- | --- |
| `--primary` | `#7706ff` | `#3a5fa8` |
| `--background` | `#fef7ff` | `#ffffff` |
| "Wyślij kod" fill | `rgb(119, 6, 255)` | `rgb(159, 186, 235)`, `--jw-act` |
| font | Inter, unloaded, so the system font | Andika |
| the e-mail field and the button | 56 high, the kid number input | 48 high, a text input with its label (`dl-og82`) |

`/play`, `/playground` and `/playground/system` are byte-identical before and after the root move;
the System page differs only by its three new sections and the promoted controls (its menu headings
are 15 px where the old file drew 13, and the header's language and dark controls are the kit's).

## What stays, and for whom

| Row | What | Who | State |
| --- | --- | --- | --- |
| S1 | lesson-kit's allowlist holds 39 entries that the kit lane's steps 5 to 8 clear (the tile part and `data-picked`, `StillAnswer`, the tone SVG maps, `InlineSlot`) | the kit lane, after `dl-uukj.29.150`, `.152`, `.156`, `.157` merge | waiting on the owner's audit fixes |
| S2 | the `[class~="bg-primary/10"]` selectors in foundation.css and stage.css stay beside `[data-picked]` until step 5 lands | the tokens lane, told by the lead | waiting on S1 |
| S3 | the playground's 3 allowlist entries and lesson-kit's 8 (em and ch sizes, a container breakpoint, the number line's 600 cap, a live swatch) stay with their reasons | nobody; they are the design | kept |
| S4 | the playground's English prose | the owner, `dl-uukj.32.5` | open |
| S5 | the parent's words: the adult table's lines (`play_ended_*`, `review_no_answer`, `review_praise`) and 6 new keys ship as drafts | the owner, `dl-uukj.32.6` | open |
| S6 | the gaps on the System page: the terminal card's `--code-*` purples, the readouts now 2.5rem, 6 outcomes on 3 colours, the app-page register itself | the owner, `dl-uukj.32.7` | open |
| S7 | the rem()-from-px geometry tables in SlotsTable, ColumnGrid, PyramidGrid, RichText | `dl-uukj.32.8` | open |
| S8 | turbo's test cache ignores a dependency's sources, so a stale green can replay | platform, `dl-5ssh.95` | open |
| S9 | `apps/docs`'s design-system pages read foundation.css; the app-page register and the new parts are not on them yet | platform, `dl-5ssh.90` | open |
| S10 | a browser check that segmented-control labels never clip, since the unit test no longer reads class names | `dl-uukj.32.15` | open |
