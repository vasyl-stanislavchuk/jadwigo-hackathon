# dl-uukj.47.67: the owner's parent design system handoff (2026-11-02), as received

Copied verbatim from the design session (`design_handoff_parent_ds/README.md`); the drawing is `Parent Design System.dc.html` in the owner's design project. This README wins where the drawing drifts (its screenshots still show search, a dark selection bar and Ukrainian, all removed). Lead decisions for the build: `2026-11-02-wave-1.md` beside this file.

## Handoff: parent app design system (adult layer)

Date: 2026-11-02 · Source drawing: `Parent Design System.dc.html` · Repo: vasyl-stanislavchuk/jadwigo-hackathon (main)
Status: system reviewed by the owner, last revised 2026-11-02 (primary ink + white, adult controls fully flat); all decisions in §1. Next: rebuild the 8 parent screens at 1440 / 390 on this system.

This replaces the "one look for the whole app" rule (foundation.css header, dl-uukj.32) **for adult screens only**. Everything a child reads (lesson player, attempt review tiles, step previews inside the parent app) keeps Zeszyt as it is: Andika, radius 16, 2 px lines, 4 px pressed edges, the light Sprawdź blue, 48–72 px taps. The two audiences now differ on purpose in type, density, radius, action colour and elevation.

---

## 1. Decisions

Three kinds, all binding for the build: **D** = the owner decided in this session; **S** = a designer proposal drawn on the system page that the owner reviewed without changing (accepted); **P** = parked or removed. Numbers are stable; other sections cite them.

### 1.1 Owner decisions (2026-11-02)

| # | Decision | Beat / replaced |
|---|---|---|
| D1 | Adult typeface **Geist** 400/500/600; Geist Mono 400/500 for codes and URLs. Andika stays for everything a child reads. | Figtree (warmer, nearer Andika); Atkinson Hyperlegible Next (widest, longest Polish tables) |
| D2 | **Middle distance from Zeszyt**: white page and cards, stone fills (#f5f5f4, #fafaf9, #efeeeb), the warm line #e8e2d5 kept, Zeszyt blue as the accent. | Close (paper tones, only type changes); far (stock shadcn zinc, Jadwigo only in the logo) |
| D3 | Radius **6** on controls (8 floating layers, 10 cards). | 8–10 px; Zeszyt 16 / 10 |
| D4 | **Adult controls are flat: no pressed edge, no lift, no press translate**, the primary included. The pressed edge stays a kid-only signature. (Owner, 2026-11-02, revised the same day: an edge on the primary was tried first.) | Edge on the primary only; edge on everything |
| D5 | **Primary button = ink blue with white text**: #3a5fa8 fill, #fff label (6.3:1), no edge (D4), hover #33549a. A step darker than the child's Sprawdź #9fbaeb, same hue family. (Owner, 2026-11-02, revised the same day: the light Sprawdź blue was tried first and felt too soft for adults.) | Kid Sprawdź blue #9fbaeb with dark ink |
| D6 | **No near-black surfaces**: selection bar, confirm buttons, toasts, tooltips and the parent avatar are all light. | Dark selection bar, black "Usuń na zawsze", dark toasts, ink tooltips, black "AK" avatar |
| D7 | **Each child has a unique tone**: disc fill and initial in one hue, kept for life (§4). The parent avatar is pale ink blue, never a child tone. | Stone discs; the selected child's disc in pick blue |
| D8 | **List pages have no header row**: the top bar names the page; the content starts with the filter bar. "Nowa lekcja" is a `+` on the Lekcje row in the sidebar, the same as `+` on Dzieci. | Title + count + "Nowa lekcja" button above the table; title + subtitle + button |
| D9 | **The filter bar is always one row**: facets scroll sideways under a fade; Widok and "Wyczyść ×" stay pinned right. | A bar that wraps |
| D10 | Light only for now. | Light + dark |
| D11 | Lekcje and Historia are **data tables** built from shadcn/ui parts. | Plain table with an "Archiwizuj" button per row |
| D12 | The owner's priority at scale (10 children, 500 lessons) is **each child's state at a glance**. | Finding a lesson fast; bulk actions |
| D13 | **No search anywhere** for now: no list search, no search row in the Dla combobox or the facets, no command palette, no search in the top bar. | Search field in the filter bar, ⌘K palette, "Szukaj ⌘K" in the top bar |
| D14 | **No Ukrainian** in the parent app for now: the language menu is Polski / English. | Ukrainian listed once its copy is read; Cyrillic fallback font |
| D15 | **Focus is a soft halo**: 3 px ink blue at 28 % hugging the control (§5). | 2 px solid outline 2 px out ("too heavy") |
| D16 | **Tooltips use the popover look** in small: white, warm line, floating shadow, dark text, shortcut as Kbd. | Ink bubble |
| D17 | **Toasts are light and say what kind they are** by their icon: Zrobione, Do cofnięcia, Nie wyszło (§6.10). | One dark toast for everything |
| D18 | **Field borders stay** #d9d3c6 ("look nice"). | Darkening them to 3:1 |
| D19 | Icons sit centred on the text line in every button, menu row and chip. | Baseline-aligned inline SVG |
| D20 | Process: one design-system page first, then the 8 screens at 1440 / 390 in Polish. Options only for the typeface. | Options for filter bar, Dla, workspace, density |

### 1.2 Designer proposals accepted

| # | Rule | Why |
|---|---|---|
| S1 | One token per audience: `data-audience="adult"` / `"kid"`, `--jw-font-adult` / `--jw-font-kid`; a lesson preview inside the parent app is a kid subtree. | The parent sees exactly what the child will see |
| S2 | Type scale of 7 steps (§3); page h1 20 → 22, h2 15 → 16; body 14 and small 12.5 unchanged; sign-in and consent one step up (body 16, title 28, controls 40). | A page reads as a page; signed-out adults get the app scale |
| S3 | **Verdict hues only in results**: green, help yellow and red appear only in the result bar and attempt review. Form errors are ink with an alert icon; status uses dot shape, not hue; destructive actions are never red. | Red = a child's miss, green = right, nothing else wears them |
| S4 | **Archive acts at once** with Cofnij in a toast; only a permanent delete asks (Alert Dialog with a primary "Usuń na zawsze" and the reversible alternative named). Archiwizuj is a quiet ghost button. | Undo beats confirm for reversible actions (owner to confirm, §13) |
| S5 | **Disabled always says why**: `aria-disabled`, tooltip on hover/focus, the reason as the line under it on touch. Loading keeps the width and swaps the icon for a spinner. | No silent dead buttons |
| S6 | One Button system (7 variants, §6.1) replaces `primitives/button` and `chat/button.tsx`; the playground's unstyled shadcn copy is deleted. | Two button systems was the handoff's named problem |
| S7 | Picker rules: Select for long rarely changed lists; Combobox for one pick with rich rows and a create item; Dropdown Menu for actions and settings; Context Menu repeats row actions; Radio Cards for small fixed sets. Tabs switch page sections (URL); Segmented switches a view inside a section; filters are never tabs or segments. | One pattern per job |
| S8 | **Dla combobox** (§6.5): "Bez dziecka" first, disc + name + "klasa N", check on the pick, footer "Dodaj dziecko…" that returns focus to the trigger; typed letter jumps. | Replaces DlaSelect's popover of buttons |
| S9 | **Class in Dodaj dziecko = Radio Cards** (1–6 klasa with the age line); compact 6-across in the dialog. | Six fixed values should all be visible |
| S10 | **Language moves into the account menu** (Język strony ▸ radio submenu). | One menu for the account; sidebar keeps navigation only |
| S11 | **Rating becomes a labelled toggle group**: Za łatwa · W sam raz · Za trudna. | Icons alone didn't say what they meant |
| S12 | **Per-child state in two places** (serves D12): the sidebar child row shows a short state ("2 czekają", "w trakcie"); every lesson row has a **Wynik** result bar ("6 z 8"). | |
| S13 | **Status pill by dot shape**: Szkic dashed ring · Gotowa ink ring · W trakcie half · Zrobiona filled. | Status without borrowing verdict hues |
| S14 | **Facets**: dashed outline buttons with `plus-circle`; once set, up to 2 value chips then "3 wybrane"; content lists checkboxes with disc + name + count (counts reflect the other filters), "Bez dziecka" last, "Wyczyść wybór" footer. Facets: Dziecko, Status, Data (range presets). | shadcn Tasks example, scaled to 10 children |
| S15 | **URL holds every filter, sort and page**; Back restores; a filtered view can be bookmarked. | |
| S16 | **Data table behaviour**: whole row opens; checkbox and ⋯ don't; right-click = same menu; sort cycles asc → desc → off, default Ostatnio desc; sticky header under the top bar; light selection bar while rows are checked; Widok = column toggles + density, per device; pages of 20 on a laptop, load-more on a phone. | |
| S17 | **One child**: no Dziecko facet and no Dla column. | The bar and table don't carry what can't vary |
| S18 | **Every list has four states**: skeleton (after 300 ms, real row height), empty first time, empty filtered (names the filters, "Wyczyść filtry"), error ("Spróbuj ponownie"). | |
| S19 | Child tones: 10 hues ≥ 28° apart avoiding red, green and help yellow; one low-chroma stone tone; **stored on the learner** as `tone` 0–9, assigned in order on create, never derived from the name. Parent avatar uses the app's pale ink (not a child hue) so the parent never reads as an 11th child. | Colour stays stable across renames and devices |
| S20 | Elevation: page content flat; one soft shadow for floating layers (popover, menu, toast, tooltip), a deeper one for dialogs. | |
| S21 | Page template: content widths prose 640 / wide 960 / full; gutter 32 (16 phone); top bar to filters 20, filters to table 16, sections 32. Non-list pages (child page, lesson overview) may have a title block. | |
| S22 | Phone: sidebar in a left Sheet; tables become two-line rows; filters become "Filtry (n)" + sort, opening a bottom Drawer whose button states the count ("Pokaż 38 lekcji"); primary create floats bottom right; taps ≥ 44. | |
| S23 | Widok in the filter bar is an icon button (tooltip "Widok"). | Saves width in the one-row bar |

### 1.3 Parked or removed

- P1 Command palette (⌘K) and any search: removed (D13). Revisit only with real need at 500 lessons.
- P2 Dark mode: later (D10).
- P3 Ukrainian in the parent app: later (D14).
- P4 The archive confirm dialog from the original handoff: replaced by Cofnij (S4), pending the owner's confirmation.

### 1.4 Revised during review (same day)

The owner tried these first and changed them; build the final column.

| Topic | Tried | Final |
|---|---|---|
| Primary colour | Solid ink #3a5fa8 + white → kid Sprawdź blue #9fbaeb + dark ink | **Ink #3a5fa8 + white** (D5) |
| Primary elevation | 2 px #24407a pressed edge + 2 px press | **Flat**, no edge, no press move (D4) |
| Selection bar, "Usuń na zawsze", toasts, avatar, tooltips | Near-black #22252d | **Light** (D6, D16, D17) |
| Child discs | Stone, selected child in pick blue | **Unique tone per child** (D7) |
| Lekcje page header | Title + subtitle + "Nowa lekcja" → title + count + `+` | **No header row**; `+` on the sidebar's Lekcje row (D8) |
| Filter bar | Wrapping, search first | **One row, no search**, Widok + Wyczyść pinned (D9, D13) |
| Focus | 2 px outline, 2 px offset | **3 px soft halo** (D15) |
| Top bar | "Szukaj ⌘K" field | Removed (D13) |

---

## 2. Audiences and tokens

One attribute picks the audience. The parent app root carries `data-audience="adult"` together with the existing `data-density="parent"`. A lesson preview inside it carries `data-audience="kid"` and gets Zeszyt back (as `[data-density="parent"] [data-lesson-theme]` does today).

Add to `packages/ui/src/styles/foundation.css`:

```css
:root {
  --jw-font-kid:   "Andika", system-ui, sans-serif;
  --jw-font-adult: "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --jw-font-mono:  "Geist Mono", ui-monospace, monospace;
  --jw-font: var(--jw-font-kid); /* keep the old name pointing at kids */
}

/* Primitives that are new (everything else already exists in tier 1) */
:root {
  --jw-p-stone-50:  #fafaf9;  /* sidebar, table head, row hover */
  --jw-p-stone-100: #f5f5f4;  /* secondary fill, hover, track, skeleton */
  --jw-p-stone-150: #efeeeb;  /* active sidebar item */
  --jw-p-paper-250: #d9d3c6;  /* field / outline-button edge */
  --jw-p-paper-350: #b9b3a6;  /* dashed facet edge */
  --jw-p-paper-450: #8e897f;  /* checkbox / radio edge, error edge (3.4:1) */
}

[data-audience="adult"] {
  --font-sans: var(--jw-font-adult);
  --font-mono: var(--jw-font-mono);

  /* shadcn theme variables, mapped onto Zeszyt roles */
  --background: var(--jw-p-white);
  --foreground: var(--jw-p-paper-900);          /* #22252d */
  --card: var(--jw-p-white);
  --card-foreground: var(--jw-p-paper-900);
  --popover: var(--jw-p-white);
  --popover-foreground: var(--jw-p-paper-900);
  --primary: var(--jw-p-ink-600);               /* #3a5fa8 */
  --primary-foreground: var(--jw-p-white);
  --primary-hover: #33549a;                     /* new primitive --jw-p-ink-625 */
  --secondary: var(--jw-p-stone-100);
  --secondary-foreground: var(--jw-p-paper-900);
  --muted: var(--jw-p-stone-100);
  --muted-foreground: var(--jw-p-paper-600);    /* #50535c, 7.6:1 */
  --accent: var(--jw-p-stone-100);              /* shadcn uses accent for hover */
  --accent-foreground: var(--jw-p-paper-900);
  --selected: var(--jw-p-ink-100);              /* #dce8fb, new var: chips, picked card, selected row tint */
  --selected-foreground: var(--jw-p-ink-800);   /* #163a78 */
  --selected-edge: var(--jw-p-ink-300);         /* #9fbaeb */
  --border: var(--jw-p-paper-200);              /* #e8e2d5 */
  --input: var(--jw-p-paper-250);               /* #d9d3c6 */
  --control-edge: var(--jw-p-paper-450);        /* #8e897f, new var */
  --ring: var(--jw-p-ink-600);                  /* #3a5fa8, drawn at 28% as a 3px halo */
  --link: var(--jw-p-ink-600);
  --placeholder: var(--jw-p-paper-500);         /* #726f68, 4.9:1 */
  --destructive: var(--jw-p-paper-900);         /* deliberately NOT red (S3) */
  --sidebar: var(--jw-p-stone-50);
  --sidebar-accent: var(--jw-p-stone-150);

  --radius-sm: 4px;   /* checkbox, kbd, chip inside a facet */
  --radius: 6px;      /* every control */
  --radius-md: 8px;   /* popover, menu, toast, drawer top */
  --radius-lg: 10px;  /* card, dialog */

  --shadow-float: 0 8px 24px -8px rgb(34 37 45 / .16), 0 2px 4px rgb(34 37 45 / .04);
  --shadow-dialog: 0 16px 40px -12px rgb(34 37 45 / .22);
}
[data-audience="adult"] [data-audience="kid"] { --font-sans: var(--jw-font-kid); /* + Zeszyt aliases as today */ }
```

Load Geist from `geist` (npm, OFL) or Google Fonts: weights 400, 500, 600; Geist Mono 400, 500. Latin Extended is required (ą ć ę ł ń ó ś ź ż). No Cyrillic needed (D14).

---

## 3. Type scale (parent density)

| Token | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| `--jw-adult-question` | 28 / 34 | 600 | −0.02em | The first screen's one question |
| `--jw-page-h1` | 22 / 28 | 600 | −0.01em | Section titles on this page; page titles only where a page has no top-bar name (sign-in) |
| `--jw-page-h2` | 16 / 24 | 600 | 0 | Card and dialog titles |
| `--jw-page-body` | 14 / 20 | 400 | 0 | Body, table cells, menu items |
| label / button | 14 / 20 | 500 | 0 | Field labels, buttons, active nav |
| `--jw-page-small` | 12.5 / 18 | 400 | 0 | Row second line, hints, help under fields |
| table head | 12.5 / 18 | 500 | 0 | Column headers (muted ink; sorted header in ink) |
| micro | 11.5 / 16 | 500 | 0 | Counts, badges in nav |

- Tables and any number: `font-variant-numeric: tabular-nums`.
- Sign-in and consent run one step up: body 16, title 28, controls 40.
- Changes from today: page h1 20 → 22, h2 15 → 16. Body 14 and small 12.5 stay.

---

## 4. Colour roles and their meanings

| Role | Hex | Means | Never |
|---|---|---|---|
| primary | #3a5fa8 / white / hover #33549a, flat | The one thing to press on this view | More than one per view |
| ring / link / checked | #3a5fa8 | Keyboard focus (at 28 %), links, checked checkbox/radio/switch | Fills other than primary |
| selected | #dce8fb / #163a78 / edge #9fbaeb | Something the parent picked: filter chip, picked radio card, selected row tint (#f3f7fe), selection bar | Status |
| foreground | #22252d | Text, error outline | Surfaces (D6) |
| muted-foreground | #50535c | Second lines, inactive tabs, table head | Body text |
| placeholder | #726f68 | Field hints | Content |
| border | #e8e2d5 | Cards, rows, dividers | Field edges |
| input | #d9d3c6 | Field and outline-button edge (kept, D18) | |
| control-edge | #8e897f | Checkbox, radio, error field edge | |
| stone 100 / 50 / 150 | #f5f5f4 / #fafaf9 / #efeeeb | Hover + secondary fill / sidebar + table head / active nav item | |
| right / help / miss | #3f8a46 / #a07c14 / #c4402f | Result bar and attempt review only (S3) | Anything else |

### Child tones (D7)

Assigned in this order when a child is added; the 11th starts again. Fill `oklch(0.92 0.055 h)`, initial `oklch(0.40 0.11 h)` (≥ 4.5:1). Neighbours are ≥ 28° apart; no tone sits on red (~25°), green (~145°) or help yellow (~90°).

| # | Sample name | Hue | Read as |
|---|---|---|---|
| 1 | Marta | 348 | rose |
| 2 | Ola | 200 | cyan |
| 3 | Kuba | 55 | apricot |
| 4 | Zosia | 288 | violet |
| 5 | Antek | 170 | teal |
| 6 | Lena | 258 | indigo |
| 7 | Staś | 110 | olive |
| 8 | Hania | 70 (chroma .018 / .03) | stone |
| 9 | Franek | 228 | sky |
| 10 | Maja | 318 | orchid |

Store the tone index on the learner (`learner.tone: 0–9`), not derived from the name, so it never changes. The name always sits beside the disc. "Bez dziecka" is a 1 px dashed #8e897f empty disc. The parent avatar is #e6eeff fill, #24407a initials, 1 px inset #9fbaeb ring.

---

## 5. Shape, space, elevation

- Radius: 4 checkbox/kbd · 6 control · 8 popover/menu/toast · 10 card/dialog · full chip/badge/disc.
- Heights: 28 small (pager, chips' inner buttons, table toolbar) · **34 default** · 40 sign-in · 44 phone taps.
- Spacing (4 base): 4 8 12 16 24 32 48. Inside a control 8–12; between controls 8; groups 16–24; page gutter 32 (16 phone); sections 32.
- Lines 1 px everywhere. **Focus** (buttons, checkbox, radio, switch, links, rows): `box-shadow: 0 0 0 3px rgb(58 95 168 / .28)` hugging the control, no offset, `:focus-visible` only; a bordered control also turns its edge #6585c2; (shadcn `ring-[3px] ring-ring/30`). Fields on focus: edge #3a5fa8 + 2 px #dce8fb halo. (Owner 2026-11-02: the 2 px outline was too heavy.)
- Elevation: page content is flat (line only). Floating layers use `--shadow-float`; dialogs `--shadow-dialog`. No other shadows.
- No pressed edge anywhere in the adult app (D4). Hover darkens a filled button (primary #33549a, secondary #ebeae6); press does not move it. Transitions 120 ms on colour only.

---

## 6. Components (one shadcn set in `packages/ui`)

Rule: every adult part is a shadcn/ui component (Radix underneath) restyled only through the variables in §2, plus the variants below. The playground copy (`apps/web/src/playground/tool/*`) and `apps/web/src/chat/button.tsx` are deleted once this set lands. Each component has **default, hover, focus-visible, disabled-with-reason, loading (where it acts), error (where it takes input)**.

**Disabled-with-reason** is a rule, not a state: a disabled control is `aria-disabled` (still focusable), shows a Tooltip on hover/focus with the reason, and on touch the reason is the line under it. Examples: "Napisz, czego ma się uczyć." · "Lekcja jeszcze się układa." · "Lekcja nie ma jeszcze pytań."

**Loading** keeps the width; the leading icon becomes a spinning `loader`; the label may change ("Układam…").

### 6.1 Button — replaces `primitives/button` + `chat/button.tsx`

| Variant | Fill / ink / border | Hover | Use |
|---|---|---|---|
| `primary` | #3a5fa8 / #fff, flat | #33549a | One per view: Zrób lekcję, Dodaj, Daj lekcję, Usuń na zawsze |
| `secondary` | #f5f5f4 / #22252d | #ebeae6 | Pokaż lekcję |
| `outline` | #fff / #22252d / 1 px #d9d3c6 | #f5f5f4 | Drukuj, Spróbuj ponownie, Cofnij |
| `ghost` | transparent / #22252d | #f5f5f4 | Zwiń menu, Wyczyść ×, Anuluj |
| `quiet-destructive` | transparent / #50535c + icon | #f5f5f4, ink #22252d | Archiwizuj (never red) |
| `icon` | ghost or outline, 34×34 (24×24 in sidebar rows) | as base | Always has a Tooltip with its name |
| `link` | #3a5fa8, underline offset 3 | #24407a | Navigation inside text only |

Sizes: `sm` 28, `default` 34, `lg` 40. Disabled: #f5f5f4 fill, #726f68 ink. No variant has a pressed edge or moves on press (D4); hover changes colour only.

### 6.2 Field, Label, Input, Textarea, Input OTP

- Field = Label (14/500) + control + description (12.5, muted) or error. shadcn `Field`.
- Input 34, padding 10, edge #d9d3c6; focus edge #3a5fa8 + 2 px #dce8fb halo.
- **Error**: edge 1.5 px #22252d + an `alert` icon line in ink: "Wpisz imię, żeby dziecko je rozpoznało." Never red (S3). `aria-invalid` + `aria-describedby`.
- Read-only/disabled: #f5f5f4 fill, #e8e2d5 edge, the reason as description.
- Textarea grows to 6 lines, then scrolls.
- Input OTP for the 6-digit email code at sign-in.

### 6.3 Checkbox, Radio Group, Radio Cards, Switch

- Checkbox 16, radius 4, edge #8e897f; checked #3a5fa8 with white check; indeterminate shows `minus`.
- Radio 16 round; checked = #3a5fa8 ring + 8 px dot. Each radio may carry a second line (Na tym komputerze / Na papierze).
- **Radio Cards** for small fixed sets that should all be visible: the class in Dodaj dziecko (1–6 klasa, with "7–8 lat" second line). Picked = #dce8fb fill, #3a5fa8 edge (1 px + 1 px inset), #163a78 label. 3 columns laptop, 2 phone; in the dialog a compact 6-across row with the age line under it.
- Switch 32×18; on = #3a5fa8 track. Label + description row, switch right.

### 6.4 Select vs Combobox vs Dropdown Menu

| Need | Component |
|---|---|
| Pick one from a long, rarely changed list | **Select** (Język lekcji) |
| Pick one, rich rows, a create item | **Combobox** = Popover + Command list, no search input (Dla) |
| Actions, or settings with radio/checkbox items and submenus | **Dropdown Menu** (account, row ⋯) |
| The same actions on right-click | **Context Menu** (table rows) |

### 6.5 Combobox "Dla" — replaces `parent/newLesson/DlaSelect.tsx`

- Trigger (34, outline): "Dla" muted · child disc 20 · name 500 · `chevrons-up-down`. No child: dashed disc + "Bez dziecka".
- Content 280 wide, no search row (D13), scrolls past 8 children: "Bez dziecka" first · each child: disc, name, "klasa N" muted, check on the picked one · separator · footer item `+ Dodaj dziecko…` with the line "Imię i klasa, nic więcej."
- Keys: ↑ ↓ move, Enter picks, a typed letter jumps to the first matching name, Esc closes. The footer item opens Dodaj dziecko and returns focus to the trigger on close (as today, dl-uukj.47.20).

### 6.6 Dropdown Menu: account — replaces `shell/Sidebar.tsx` Account

- Trigger: parent avatar 24 + `chevron-down`, top bar right.
- Content 232: name + email header · separator · Ustawienia · **Język strony ▸** (submenu with radio items Polski / English; no Ukrainian, D14) · separator · Wyloguj się.
- The language switch moves here from the sidebar.

### 6.7 Tabs, Segmented (Toggle Group)

- Tabs: underline style, 14/500, active ink + 2 px #22252d underline, inactive muted; optional count badge. Tabs switch sections of one page and write the URL (child page: Przegląd · Cele · Raport · Lekcje).
- Segmented = shadcn Toggle Group (single) on a #f5f5f4 track, active segment white with a 1 px #e8e2d5 ring. 2–4 short options that switch a view inside a section (Tydzień / Miesiąc / Rok).
- A filter is neither: it is the filter bar (§7).

### 6.8 Badge, Chip, Disc, Status

- **Status** is a pill (22, 1 px #e8e2d5) with an 8 px dot whose **shape** carries the meaning: Szkic = dashed ring, Gotowa = ink ring, W trakcie = half-filled ink, Zrobiona = filled ink. No hue, so status never borrows green/red.
- **Filter chip** (inside a facet or on its own): #dce8fb / #163a78, radius 4–6, optional `x`.
- **Count badge**: #f5f5f4 pill, 11.5/500 muted.
- **Tag**: outline 1 px #e8e2d5, radius 4 ("klasa 3").
- **Disc** (Avatar): 20 / 22 / 24 / 32; child tone (§4); stack with −6 px overlap and a 2 px white ring, "+N" overflow disc.

### 6.9 Result bar and rating — replaces `chat/Rating.tsx`

- Result bar: 64–96 × 8 px, segments right #3f8a46 · with help #a07c14 · not yet #c4402f, 2 px gaps, then "6 z 8 dobrze" (tabular). Legend words: dobrze od razu · z pomocą · jeszcze nie.
- Rating becomes a labelled Toggle Group: Za łatwa · W sam raz · Za trudna. Picked = #dce8fb / #163a78. Words say what each choice means; no icons alone.

### 6.10 Overlays and feedback

- **Dialog** (Dodaj dziecko): 420 wide, radius 10, padding 24; title 16/600 + one line; fields; footer right: ghost Anuluj + primary. Esc and overlay click close; focus returns to the opener.
- **Alert Dialog** only for what can't be undone: "Usunąć Kubę na zawsze?", body names what disappears and offers the reversible alternative. Footer: outline Anuluj + **primary** "Usuń na zawsze" (D6, S3: not black, not red).
- **Sheet**: left on phone for the sidebar; right for side detail where needed.
- **Drawer** (bottom, phone): filters. Handle 36×4, title + "Wyczyść", groups of chip toggles 36 tall, full-width primary "Pokaż 38 lekcji" stating the result count.
- **Popover**: radius 8, `--shadow-float`.
- **Tooltip** (D16): the popover look in small: white, 1 px #e8e2d5, `--shadow-float`, radius 6, 12/500 ink, padding 6×8, no arrow, 400 ms open delay. Names an icon, shows a shortcut as Kbd, or gives a disabled reason. Never on table cells or options.
- **Toast** (Sonner, D17), bottom right, stacks 3, white card, 1 px #e8e2d5, radius 8, `--shadow-float`. The leading icon says the kind:

| Kind | Icon | Text | Action | Time |
|---|---|---|---|---|
| Zrobione | blue `check` on #dce8fb disc | "Lekcja gotowa. Marta zobaczy ją po zalogowaniu." | none | 4 s |
| Do cofnięcia | the action's icon (e.g. `archive`) on #f5f5f4 disc | "Lekcja przeniesiona do archiwum." | outline Cofnij | 8 s, paused on hover |
| Nie wyszło | ink `alert`, edge #8e897f, text 500 | "Nie udało się zapisać lekcji." | outline Spróbuj ponownie | until closed |

- **Skeleton**: #f0efec bars at the real row height, slow 1.6 s pulse; shown after 300 ms only.
- **Kbd**: 11/500 mono, 1 px #e8e2d5, #f5f5f4 fill, radius 4.

---

## 7. Lists: one pattern for Lekcje and Historia — replaces `parent/lists/ListControls.tsx`

### 7.1 Filter bar (D9)

```
[ ⊕ Dziecko | Marta  Ola ] [ ⊕ Status | Zrobiona ] [ 📅 Data ] ···fade···  │ [⚙ Widok] [Wyczyść ×]
 └──────── scrolls sideways, nowrap, 24 px fade at the right edge ───────┘     └── pinned right ──┘
```

- One row, always. The facets sit in an `overflow-x:auto` strip with hidden scrollbar and a right-edge mask fade; a 1 px divider, then **Widok** (icon button, 34) and **Wyczyść ×** (ghost) pinned right. Wyczyść shows only when a filter is set.
- **Facet** = dashed outline button (1 px #b9b3a6, 34): `plus-circle` + name; once set, a divider and up to 2 value chips, then "3 wybrane".
- Facet content = Popover with checkbox items, no search (D13): child rows with disc + name + count (counts reflect the other filters, sorted by count), "Bez dziecka" last, footer "Wyczyść wybór".
- Facets: **Dziecko** (multi; hidden with one child), **Status** (multi: Szkic, Gotowa, W trakcie, Zrobiona; Historia shows only done), **Data** (Date Range Picker: Dziś, Ten tydzień, Ten miesiąc, Własny zakres).
- **URL state**: every filter, sort and page lives in the query: `/parent/lessons?dziecko=marta,ola&status=zrobiona&sort=-ostatnio&strona=1`. Back restores; a filtered view can be bookmarked.

### 7.2 Data table (shadcn Data Table on TanStack Table)

- Bordered card (1 px #e8e2d5, radius 8), table head #fafaf9, 36 tall, 12.5/500 muted; pager inside the card.
- Columns (Lekcje): [select] · **Lekcja** (title 500 + "Matematyka · 8 pytań" small) · **Dla** (disc + name; "Bez dziecka" muted) · **Status** (pill) · **Wynik** (result bar + "6 z 8", or "3 z 10 zrobione", or —) · **Ostatnio** (tabular "02 lis") · ⋯
- Historia: same minus Status; Wynik and a "Kiedy" date.
- Row 48–52; hover #fafaf9; selected tint #f3f7fe. The whole row opens the lesson; the checkbox and ⋯ don't. Right-click = Context Menu with the ⋯ items: Otwórz · Daj lekcję · Drukuj · Archiwizuj.
- Sort: click header → asc → desc → off. Default Ostatnio desc. Sorted header in ink with an arrow; others muted with `arrow-up-down`.
- Sticky header under the 56 px top bar; the filter bar scrolls away.
- **Selection bar** (appears only while rows are checked): #dce8fb fill, 1 px #9fbaeb, #163a78 text: "2 zaznaczone" · white outline buttons Drukuj, Archiwizuj · `x` clears.
- **Widok** (Dropdown Menu): column toggles (Dla, Status, Wynik) and density (Wygodnie / Gęsto). Saved per device.
- **Paging**: laptop pages of 20 ("1–20 z 214" · Na stronie 20 ▾ · Strona 1 z 11 · ‹ ›). Phone loads 20 more on scroll.
- One child: no Dziecko facet, no Dla column.

### 7.3 States every list has

| State | Content |
|---|---|
| Loading | Skeleton rows at real height; header and filters stay live |
| Empty, first time | 40 icon tile `book` · "Tu będą lekcje" · "Napisz, czego dziecko się uczy, albo wrzuć zdjęcie zadania." · primary Nowa lekcja |
| Empty, filtered | `filter` tile · "Nic nie pasuje do filtrów" · the active filters in words ("Marta, Ola · Zrobiona · październik") · outline Wyczyść filtry |
| Error | `alert` tile · "Nie udało się wczytać lekcji" · "Sprawdź internet. Twoje lekcje są bezpieczne." · outline Spróbuj ponownie |

---

## 8. Shell and page template

- Sidebar 232 (rail 60), #fafaf9, one 56 px line shared by the logo row and the top bar.
- Sidebar items 34, radius 6, 14/500; active #efeeeb. **Lekcje** row carries a trailing `+` (24, ghost; tooltip "Nowa lekcja", key N). Historia. "Dzieci" group label 12/500 muted with `+` (Dodaj dziecko). Child rows: disc 20 · name · a short state on the right ("2 czekają", "w trakcie", "1 czeka"), so each child's state shows on every page (D12, S12). Foot: Zwiń menu.
- Top bar 56: page name (14/500) or breadcrumb (Lekcje / Nowa lekcja) left; account avatar menu right. Chat-first workspace keeps "Pokaż lekcję" in the top bar (dl-hz9ks).
- **List pages have no header row** (D8): the content starts with the filter bar, 20 below the top bar; filters → table 16.
- Pages that are not lists (child page, lesson overview) may have a title block: h1 22 + one muted line; the primary action follows the title; secondary actions in a ⋯ at the far right.
- Content widths: **prose 640** (first screen, consent, settings) · **wide 960** (child page, lesson overview) · **full** (Lekcje, Historia, workspace). Left-aligned to the 32 gutter.

## 9. Phone (below 768)

- Sidebar becomes a left Sheet (burger, 40 tap); account at its foot.
- Tables become two-line rows: title 14/500; "Marta · 6 z 8 · 02 lis" small. The row opens; a long press opens the row menu.
- Filter bar becomes `Filtry (n)` + sort button; filters open in the bottom Drawer.
- Primary create action floats bottom right (44, primary). Tabs scroll sideways; a segmented control with more than 3 options becomes a Select.
- Taps ≥ 44; toolbar controls 36 with 8 between.

## 10. Icons

Lucide (ISC), stroke 2, round caps, 16 in controls, 14 in small controls, 20 in empty-state tiles. Set used: chevron-down/right/left, chevrons-up-down, check, minus, plus, plus-circle, x, more (ellipsis), arrow-up-down, arrow-down, calendar, book, history, users, panel, loader, printer, archive, log-out, globe, sliders, filter, info, alert, send, menu, user, inbox, eye, settings. Centre icons on the text with flex `align-items:center` (the drawing's `icons.js` does this; in React use `lucide-react` with `className="size-4 shrink-0"`).

## 11. Replacement map

| Today | With | Why |
|---|---|---|
| `apps/web/src/parent/newLesson/DlaSelect.tsx` (Popover of buttons) | Combobox (Popover + Command) | Disc rows, Bez dziecka first, footer create item, Radix keyboard |
| `apps/web/src/parent/lists/ListControls.tsx` (SegmentedControl + Input) | FilterBar (faceted, chips, URL, one row) | The segmented row breaks past 3 children; one bar for Lekcje and Historia |
| `apps/web/src/parent/shell/Sidebar.tsx` Account popover | Dropdown Menu with radio submenu | Language joins the account menu |
| `packages/ui` primitives/button + `apps/web/src/chat/button.tsx` | One Button, 7 variants | Two button systems become one |
| `apps/web/src/chat/Rating.tsx` (icons) | Labelled Toggle Group | Icons alone didn't say what a rating meant |
| `apps/web/src/playground/tool/*` (select, collapsible, tooltip, sidebar) | `packages/ui` adult set | The unstyled copy moves into the one package |
| Plain Lekcje / Historia table | Data Table (TanStack) | Sort, select, row menu, column toggles, paging |
| "Nowa lekcja" button above the table | Sidebar `+` on Lekcje | D8 |
| Sidebar language switch | Account menu → Język strony | S10 |

Also to add to `packages/ui`: Field, Input OTP, Textarea, Checkbox, Radio Cards, Select, Combobox (Command list, no input), Dropdown Menu, Context Menu, Popover, Tooltip, Dialog, Alert Dialog, Sheet, Drawer, Sonner, Skeleton, Kbd, Badge, Avatar (Disc), Toggle Group, Tabs, Breadcrumb, Pagination, Date Range Picker (Calendar + Popover), Data Table, Empty.

## 12. The 8 screens to rebuild (1440 and 390, pl)

1. **Sign-in** (email code with Input OTP, Google, Facebook) + **AI consent**: prose 640, sign-in scale (body 16, title 28, controls 40).
2. **First screen** `/parent`: question 28, one Textarea box, Dla combobox, primary Zrób lekcję (disabled-with-reason until text).
3. **Lesson workspace** `/parent/lessons/:id`: chat-first, Pokaż lekcję in the top bar, giving/saving/printing as chat actions (dl-hz9ks, dl-uukj.47.55). Lesson preview is a kid subtree.
4. **Lekcje** `/parent/lessons`: §7, no header row.
5. **Historia** `/parent/history`: §7 minus Status.
6. **Child page**: wide 960; Tabs Przegląd · Cele · Raport · Lekcje; WeekStrip, GoalLists, ReportCard restyled adult; Lekcje tab reuses the data table filtered to the child.
7. **Lesson overview + attempt review**: overview adult; review tiles stay kid (Zeszyt) inside an adult frame; result bar on top.
8. **Dialogs and sheets**: Dodaj dziecko (Dialog + Radio Cards), archive (toast with Cofnij), permanent delete (Alert Dialog), phone drawer (Sheet + filter Drawer).

Mark every place a component replaces a hand-rolled one (badge "REPLACES" + file), as the system page does.

## 13. Open

Settled 2026-11-02: field edges (D18), search (D13), Ukrainian (D14), tooltips (D16), focus (D15).

1. **Archive confirm**: the original handoff lists an archive confirm dialog; this system drops it for Cofnij (S4). Owner to confirm.
2. **Drawing drift**: the drawing's §7 example filter bar still wraps, and §7's empty state and the phone mock still show a full "Nowa lekcja" button. Follow §7.1 / D8 of this README.
3. **Child tones in data**: add `tone` (0–9) to the learner contract; set by the server on create, in order.
4. **Primary hover** #33549a is a drawn value, not a primitive; add `--jw-p-ink-625`.

## 14. Acceptance checks

- No adult screen renders Andika outside `[data-audience="kid"]`; no lesson preview renders Geist.
- No adult control has a pressed edge or moves on press; kid subtrees keep theirs.
- Exactly one `primary` button per view.
- No #22252d surface except Tooltip; no green/yellow/red outside result bars and attempt review (extend `foundation.test.ts` to check the adult roles: every text pair ≥ 4.5:1, hues single-meaning).
- Every disabled control has a reason reachable by hover, focus and touch.
- Every list shows loading, empty (first and filtered) and error.
- Every filter, sort and page round-trips through the URL.
- With 1 child: no Dziecko facet and no Dla column. With 10: the Dziecko facet and Dla combobox scroll, sidebar lists all ten with distinct tones.
- Keyboard: Combobox, menus, facets, table rows and dialogs work without a mouse; focus is visible only on `:focus-visible`.
