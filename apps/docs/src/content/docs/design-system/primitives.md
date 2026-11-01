---
title: Primitives
description: The shadcn/ui components every screen builds on, reshaped for a child, and when to use each.
---

This page is for anyone building a screen: the small set of components every screen builds on,
the rules they keep, and when to use each.

Each primitive is a [shadcn/ui](https://ui.shadcn.com) component on Radix, reshaped for a child.
Lessons, parent screens and the playground build on them, so a rule set here holds everywhere.
The interaction families draw their own parts, such as options, tiles, keypads and the verdict
band, on top of these.

See each one drawn in every state on the
[System page](https://app.jadwigo.pl/playground/system), under Components.

## Rules every primitive keeps

- **Big enough to tap.** Every control a child taps is at least the kid tap size, 56 px or more.
- **Colour from the tokens.** A primitive reads aliases such as `--primary` and `--kid-*`. It
  never holds a literal colour or size.
- **Green and red keep their meaning.** "On" or "chosen" is the pick's blue, never green. Green is
  kept for a right answer, and red only marks a miss.
- **No focus ring drawn on a button or an option in a lesson.** The keyboard still moves the focus.
  On an app page (a parent's page, `Page width="prose"`) parents tab through forms, so a button
  and an outcome tile drawn as a link show a 3 px outline of the focus ink, 3 px out, on
  `:focus-visible` only, and a typed field's edge turns the focus ink.
- **The parent's density.** Inside the signed-in parent app (`DensityScope value="parent"`) a
  control is 34 high, body text 14, corners 10 and lines 1 px. A disabled action there is quiet,
  with a dashed outline, and the screen writes the reason beside it.
- **Two registers.** An app page reads the adult type scale: H1 28, H2 22, body, labels and H3 17
  at leading 1.5. The learner's page (`Page width="kid"`) and anything outside a `Page` keep the
  lesson's sizes. `Page` sets the register for everything inside it, a sheet it opens included.

## Every primitive

| Primitive | Use it for | Not for |
| --- | --- | --- |
| **Button** | The one thing to press now: Check, Next, Start. Variants: default, secondary, outline and ghost. There is no red variant and no link variant. The default is the action on its pressed edge everywhere. On an app page the control size is 48 high at 17 bold, 24 px in, and outline is white on a 2 px line. | A link to another page, or a choice between options. |
| **Toggle** | One option a child can turn on or off. "On" means chosen, not right. | An answer that is checked at once. |
| **Toggle group** | A one-of choice with a few options, such as Tak or Nie. The options stand apart, so each is easy to hit. | A long list. |
| **Switch** | A setting that takes effect at once, such as sound on or off. The words and the track are one target. | A lesson answer. |
| **Input** | One typed number or short word, with answer-sized digits. A refused character shows the ink ring, never red. The text kind is an adult's field, 48 high; on an app page it is 17 and has no soft focus ring, only its edge turning the focus ink. | A grade on the answer: that is the band's job. |
| **Slider** | The number line's fallback: a value on a line, moved by a press anywhere on it or by the arrow keys. | An exact count. |
| **Card** | A surface that holds one thing: a question, an example, a summary. | A layout grid. |
| **Breadcrumb** | "Section / Page" in the parent's top bar. Each step before the last is a link; the last is the current page, bold, with `aria-current`. | A menu, or an action. |
| **Badge** | A short label, such as a status. It is not a control. Its correct and try-again variants use the verdict colours. | Something to press. |
| **Progress** | How far through the lesson the child is. | A score. Jadwigo never shows points. |
| **Spinner** | A short wait. It holds still under reduced motion, and its label is the page's own words. | A wait the child must watch for long. |
| **Popover** | A small panel beside its trigger, such as the menu a chosen gap opens. It closes on Escape or a tap outside and gives the focus back. | A whole form. |
| **Dialog** | Making something with 1 to 3 fields, such as adding a child. 440 wide on a 40% ink scrim; it traps the focus, closes on Escape and gives the focus back. | A long form, or a panel to keep open beside the page: that is a sheet or a page. |
| **Disc** | A person's first initial in a round disc, at the start of a row. With `swap` it turns into a pencil while its row is hovered or focused. | A photo, or a button by itself. |
| **Panel toggle** | The button that folds a side panel to a strip and back. It has its own name, such as "Zwiń menu", and says whether the panel is open. | Opening a dialog or a menu. |
| **Sheet** | A panel that slides in from one edge, such as the parent's question sheet. It closes on Escape, a tap outside or its close button. | A message that must be read before going on. |
| **Table** | Rows of data on a parent screen. The wrapper scrolls sideways, so a wide grid never scrolls a phone's page. | A layout. |

## Next

- [Question types](/design-system/question-types/): the interaction families built on these.
- [Tokens](/design-system/tokens/): the values these components read.
