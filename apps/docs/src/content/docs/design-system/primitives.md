---
title: Primitives
description: The shadcn/ui components every screen builds on, for a child and for a parent, and when to use each.
---

This page is for anyone building a screen: the components every screen builds on, the rules they
keep, and when to use each.

Each primitive is a [shadcn/ui](https://ui.shadcn.com) component on Radix, in `@jadwigo/ui`.
Lessons, parent screens and the playground build on them, so a rule set here holds everywhere.
The interaction families draw their own parts, such as options, tiles, keypads and the verdict
band, on top of these.

See each one drawn in every state on the
[System page](https://app.jadwigo.pl/playground/system): the child's under Components and
Settings controls, the parent's under Adult kit and Adult kit: display.

## Two audiences

The app speaks to two people on purpose, and they get different looks.

- **The child (kid).** The lesson player, review tiles and any lesson preview use Zeszyt: Andika,
  corners 16, 2 px lines, 4 px pressed edges, the light Sprawdź blue and taps of 56 px or more.
- **The parent (adult).** The parent app, sign-in, consent and jadwigo.pl's frame use Geist,
  corners 6 on a control, 8 on what floats and 10 on a card or dialog, 1 px lines, flat controls
  and an ink-blue primary with white words. The parent app is light only for now.

One attribute picks the audience: `data-audience="adult"` on the page, and `data-audience="kid"`
(or a lesson's `LessonTheme`) on what a child reads inside it. A primitive takes the right look in
one of two ways:

- **By its tokens.** It reads roles such as `--primary`, `--border` and `--radius`, which each
  audience sets, so the same class draws both looks.
- **By the register.** Where the two looks differ in shape, not only in value, the component reads
  the register a `Page` (or `DensityScope`) provides: "app" draws the adult's, "lesson" the
  child's. A lesson inside a parent page keeps the lesson register, so it keeps Zeszyt.

An overlay (a menu, a tooltip, a dialog) renders in a portal outside the page's tree, so its
content marks the audience again from the register: an app page's overlay is the adult's, and a
lesson's (a gap's menu, a term) stays the child's.

## Rules every primitive keeps

- **Colour from the tokens.** A primitive reads roles and aliases. It never holds a literal
  colour or size.
- **Green and red keep their meaning.** "On" or "chosen" is the pick's blue, never green. Green is
  kept for a right answer and red only marks a miss. In the parent app the verdict hues appear only
  in the result bar and the attempt review. A form error is the ink with an alert mark, and a
  destructive action is never red.
- **Every word comes from the caller.** No primitive types a label, a name or a message itself, so
  every screen says it in Polish and English.
- **A child's taps are big.** Every control a child taps is at least the kid tap size, 56 px.
- **Focus.** In a lesson no ring is drawn on a button or an option; the keyboard still moves the
  focus. A parent's control shows a soft 3 px halo of the ink at 28 % on `:focus-visible` only, and
  a field's edge turns the ink with a light halo.
- **The parent's density.** Inside the signed-in parent app (`DensityScope value="parent"`) a
  control is 34 high (28 small, 40 at sign-in), body text 14 and a small line 12.5. A lesson shown
  there keeps the child's sizes.
- **Disabled says why.** A parent's disabled control is `aria-disabled` and stays focusable, and
  its reason shows on hover and focus and as a line under it on touch (`DisabledReason`).

## Every shared primitive

These serve both. In a lesson they draw as the child's; on a parent's page as the adult's.

| Primitive | Use it for | On a parent's page | In a lesson | Not for |
| --- | --- | --- | --- | --- |
| **Button** | The one thing to press now. Variants: default (the action), secondary, outline, ghost, quiet (Archiwizuj, never red) and link (inside text only). Sizes: default and commit for a child; sm 28, control 34 and lg 40 for a parent; icon. | Flat: no edge and no press move. The default is the ink primary, one per view. | The action stands on its pressed edge and moves 1 px on press. | A link to another page. |
| **Input** | One typed value. | The text kind is the field: 34 high, the field's light edge, the ink edge with a halo on focus, a heavier ink edge on a problem. | One typed number with answer-sized digits; a refused character shows the ink ring, never red. | A grade on the answer: that is the band's job. |
| **Field** and **Label** | One labelled control with its description and its problem line, which Field ties to the control by `aria-describedby`. | A 14/500 label, a muted description, and the problem in the ink with an alert mark. | A bold label at the lesson's size. | A group of controls: give each its own Field. |
| **Switch** | A setting that takes effect at once. The words and the track are one target. | A 32 × 18 track, ink when on, the label at 500 with the switch on the right. | The pause sheet's Dźwięk, 56 high with a wide track. | A lesson answer. |
| **Radio group** | One choice from two to five settings. Each option may carry a second line. | A 16 px ring that turns the ink with an 8 px dot. | The settings look: a 24 px ring in a 48 row. | A long list: that is a Select. |
| **Segmented control** | Two to four short choices as one row. | A stone track, the chosen segment white on the warm line. | Joined segments on a quiet track, the chosen one in the pick. | A filter: that is the filter bar. |
| **Tabs** | Sections of one page, written to the URL. | Underlined, 14/500, the active tab in ink on a 2 px line, an optional count. | Notebook tabs joined to their panel. | Switching a view inside a section: that is the segmented control. |
| **Toggle** and **Toggle group** | A one-of or on-or-off choice. The group has two adult kinds, set with `kind`: "segment" (the segmented control on a stone track) and "rating" (Za łatwa · W sam raz · Za trudna, each saying its meaning in words). | The kinds above. | The default kind: kid-sized options that stand apart, such as Tak or Nie. "On" means chosen, not right. | An answer checked at once. |
| **Popover** | A small panel beside its trigger. It closes on Escape or a tap outside and gives the focus back. | Corners 8, the warm 1 px line and the floating shadow. | A chosen gap's menu or a term, in Zeszyt's look. | A whole form. |
| **Dialog** | Making something with 1 to 3 fields, such as adding a child. It traps the focus, closes on Escape and gives the focus back. | Corners 10, the dialog shadow, a 16/600 title; footer ghost Anuluj and the primary. | Not used in a lesson. | A long form, or a panel to keep open: that is a sheet or a page. |
| **Sheet** | A panel that slides in from one edge: the parent's question sheet, the phone's sidebar. | The dialog shadow, a 16/600 title and a close the control's size. | The child's look. | A message that must be read before going on. |
| **Disc** | A person's first initial in a round disc. With `swap` it turns into a pencil while its row is hovered or focused. | A child's disc in the child's own tone (`tone` 0–9, kept for life); the parent's avatar in pale ink (`kind="parent"`, never a child's tone); "Bez dziecka" as a dashed empty disc (`kind="none"`); sizes 20, 22, 24 and 32. | Not used in a lesson. | A photo, or a button by itself. |
| **Badge** | A short label that is not a control. | `count`: a stone pill with a number. `tag`: an outline on the warm line ("klasa 3"). | The correct and try-again variants use the verdict colours. | Something to press. |
| **Breadcrumb** | "Lekcje / Nowa lekcja" in the parent's top bar. Each step before the last is a link; the last is the current page with `aria-current`. | As described. | Not used in a lesson. | A menu, or an action. |
| **Card**, **Table**, **Progress**, **Spinner**, **Slider**, **Panel toggle** | A surface for one thing; rows of data that scroll sideways on a phone; how far through the lesson; a short wait; the number line's fallback; folding a side panel. | Through the tokens. | As before. | Progress is never a score: Jadwigo shows no points. |

## Every adult overlay and menu

For the parent's screens only. None of them appears in a lesson. Each reads the tokens, and its
portal carries the audience, so on a parent's page it is always the adult's.

| Primitive | Use it for | Behaviour | Not for |
| --- | --- | --- | --- |
| **Tooltip** | Naming an icon button, showing a shortcut, giving a disabled control's reason. | The popover's look, small: white, the warm line, the floating shadow, 12/500 ink. Opens after 400 ms on hover and at once on focus; closes on Escape. `shortcut` adds a Kbd. | A table cell or an option. |
| **Kbd** | A key in a tooltip or a menu row. | Mono 500 on the quiet fill with the warm line, corners 4. | Anything to press. |
| **Dropdown menu** | Actions, or settings with checkbox and radio rows and submenus: the account menu with its Język strony ▸ submenu, a row's ⋯, Widok's columns. | Floats with corners 8. ↑ ↓ move, → opens a submenu, Escape closes, and the focus goes back to the trigger. | Picking one value: that is a Select or a Combobox. |
| **Context menu** | The same actions as a row's ⋯ on a right-click or a long press. | The dropdown's rows and look. | Actions found nowhere else. |
| **Alert dialog** | Only what can't be undone: "Usunąć Kubę na zawsze?", with the body naming what disappears and the reversible way. | The dialog's box. Focus starts on Anuluj. Escape closes but a tap outside does not. The footer is an outline Anuluj and the primary action, never black or red. | Anything reversible: archive acts at once and offers Cofnij in a toast. |
| **Toast** | Saying what just happened (Sonner, bottom right, 3 at most), by `showToast`. | Light, white card, corners 8; the icon says the kind. `done` (Zrobione, a blue check, 4 s); `undo` (Do cofnięcia, the action's icon and an outline Cofnij, 8 s); `failed` (Nie wyszło, the ink alert, Spróbuj ponownie, a close, until closed). Hovering pauses the time. One `Toaster` per app. | A question to answer: that is a dialog. |
| **DisabledReason** | Wrapping one control that can't be pressed yet. | Marks it `aria-disabled` and keeps it focusable, stops the press, shows the reason as a tooltip on hover and focus, gives it to a screen reader as the description, and shows it as a line under the control on a touch screen. | A control that is simply hidden. |

## Every adult form control

For the parent's screens only. Lesson answers have their own parts in the interaction families.

| Primitive | Use it for | Behaviour | Not for |
| --- | --- | --- | --- |
| **Textarea** | A longer text, such as what the child should learn. | The field's look; grows with its words to 6 lines, then scrolls. | One short value: that is an Input. |
| **Input OTP** | The 6-digit email code at sign-in. | One numeric input (`inputmode="numeric"`, `autocomplete="one-time-code"`, digits only), so a paste and the phone's suggestion work, drawn as 6 cells. It is kept out of session replay. | Any other number. |
| **Checkbox** | A yes or no in a list or a facet, inside a label row. | 16 px, corners 4, on the control's edge; ink with a white check when checked; a minus when mixed. Space toggles it. | A setting that takes effect at once: that is a Switch. |
| **Radio cards** | A small fixed set that should all be visible, such as the class (1–6 klasa with its age line). | 3 across on a laptop, 2 on a phone, or 6 across with `compact` in a dialog. The chosen card is the pick's fill on the ink edge. Arrows move and pick. | A long or changing list. |
| **Select** | One value from a long, rarely changed list, such as Język lekcji. | The field with a chevron; the list floats in the menu's look with a check on the pick. Enter or Space opens it, arrows move, a typed letter jumps, Escape closes and gives the focus back. | Rich rows or a create item: that is the Combobox. |
| **Combobox** | One pick with rich rows and an optional create item at the foot: the Dla picker. | A popover with a radio list and no search. ↓ or Enter opens it on the pick; ↑ ↓, Home and End move; a typed letter jumps to the next row that starts with it; Enter picks; Escape closes. After a pick, Escape or the footer item the focus goes back to the trigger, and the footer runs after that, so a dialog it opens returns the focus there too. A click elsewhere leaves the focus where it went. | Actions: that is a Dropdown menu. |

## Every adult display part

For the parent's screens only. They show state; none is a control except where said.

| Part | Use it for | Behaviour | Not for |
| --- | --- | --- | --- |
| **Status** | A lesson's state as a pill: Szkic, Gotowa, W trakcie, Zrobiona. | The dot's shape carries the meaning (dashed ring, ink ring, half filled, filled), so status never wears a verdict hue. | A result: that is the result bar. |
| **Chip** | A value the parent picked, in a facet or on its own. | The selected colours, corners 4, an optional × that removes it (its name from the caller). | A status or a tag. |
| **DiscStack** | Several people in one place, such as a lesson given to three children. | Discs overlap with a white ring, then a "+N" disc for the rest; one label names everyone. | A single person: that is a Disc. |
| **Skeleton** | A list loading, at the real row's height. | A stone bar with a slow pulse (still under reduced motion), shown only after 300 ms, so a fast load never flashes it. Decorative: the list says it is loading. | A spinner's short wait. |
| **Empty** | A list with nothing to show: first time, filtered, or failed. | A 40 icon tile, a title, one line and one action, all from the caller. | A page's whole body. |
| **Result bar** | How a lesson went, on a lesson row: "6 z 8 dobrze". | Segments right, with help and not yet, in the verdict hues, then the words in tabular figures. With the attempt review, the only adult place a verdict hue appears. | A score or a grade. |
| **Pagination** | A table's pager: "1–20 z 214", the per-page select, "Strona 1 z 11" and ‹ ›. | Small controls (28); every word and both buttons' names come from the caller. | A phone, which loads more on scroll. |

## Next

- [Question types](/design-system/question-types/): the interaction families built on these.
- [Tokens](/design-system/tokens/): the values these components read, in both audiences.
