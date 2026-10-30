---
title: Design system
description: Zeszyt, the look of the whole app, in its 3 token tiers, light and dark, and the rules its tests hold.
---

Jadwigo is drawn in one design system, **Zeszyt**: a Polish school exercise book. It is the look
of the whole app: the lesson, the child's list and results, and the parent's screens.
White paper, blue ink for the one thing to press, a clear blue for what the child picked, warm
yellow for help, green for right and red pen for a miss.

Colour goes in 4 places only: the page, a picked option, the action that can be pressed now, and
one band after a check. Everything else is paper and ink.

## See it live

The [System page](https://app.jadwigo.pl/playground/system) in the app's playground draws all of
Zeszyt from the live tokens: the colours, the type, space and shape, motion, every component in
every state, the lesson frame and the 6 states of a lesson screen. A value changed in the code
shows there at once.

Every question type plays in the [playground](https://app.jadwigo.pl/playground). The
[Question types](/design-system/question-types/) page links to each one.

These docs describe the system and list its values. They do not embed it: the playground is the
place to see a part move.

## 3 tiers of tokens

Every value is a CSS custom property. Each tier is built only from the one above it.

1. **Primitives**, `--jw-p-*`: the only literal colours, such as `--jw-p-ink-600`. A primitive
   says what a colour is, never what it is for.
2. **Roles**, `--jw-*`: named for what they mean, such as `--jw-pick` for a
   picked option or `--jw-miss-edge` for the edge of a miss. A role always reads a primitive.
3. **Aliases**: the shadcn names (`--primary`, `--border`) and the `--kid-*` names that the
   parts, families and blocks read. An alias always reads a role, never a primitive.

So a part never names a colour. To change what a pick looks like, change the role `--jw-pick`.
To change a shade everywhere, change its primitive.

Beside the tiers sit the type, shape, space and motion steps (`--jw-size-*`, `--jw-space-*`,
`--jw-dur-*`), and the adult's type scale for app pages (`--jw-page-*`). They are the same in
light and dark.

The [Tokens](/design-system/tokens/) page lists every one, generated from the stylesheet when
these docs are built.

## Light and dark

The app follows the device's setting: in dark mode the page carries `[theme="dark"]`. Every role
is set twice, once for the day and once for the night, and dark mode swaps the roles to night
primitives. A primitive has one value. An alias follows the theme because it reads a role.

## Rules the tests hold

The design system's tests read the stylesheet as written, resolve every role in both themes and
fail the build when a rule breaks:

- **Text reads at 4.5:1.** Every pair of text and the surface it sits on holds a contrast ratio of
  at least 4.5:1, in light and in dark. That covers a field's placeholder, a picked option, help,
  and each verdict band.
- **Marks read at 3:1.** A dot, a tick, a line in a picture and the edge of a picked, right or
  missed part hold 3:1 on what they are drawn on.
- **Green means right, red means a miss.** Red is used for a miss and for nothing else. Green is
  used for right and for nothing else. The main action is neither.
- **A pick is not the action.** A picked option has its own blue, never the main action's fill
  and never a verdict's colour.
- **Help has its own colour**, yellow, apart from both verdicts.
- **The tiers stay apart.** Literal colours live only among the primitives, and aliases read only
  roles.
- **Child sizes have a floor.** The prompt is at least 28 px and an option at least 24 px, on a
  phone too.

## In this section

- [Tokens](/design-system/tokens/): every primitive, role and alias, with its value.
- [Primitives](/design-system/primitives/): the shadcn/ui components and when to use each.
- [Question types](/design-system/question-types/): every interaction family and its types.
- [Copy](/design-system/copy/): the words a child and a parent read, in Polish and English.
