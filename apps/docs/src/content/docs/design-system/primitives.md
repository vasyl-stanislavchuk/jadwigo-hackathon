---
title: Primitives
description: The shadcn/ui components every screen builds on, for a child and for a parent, the rules they keep, and where to see each one.
---

This page is for anyone building a screen: the components every screen builds on, and the rules
they keep.

Each primitive is a [shadcn/ui](https://ui.shadcn.com) component on Radix, in `@jadwigo/ui`.
Lessons, parent screens and the playground build on them, so a rule set here holds everywhere.
The interaction families draw their own parts, such as options, tiles, keypads and the verdict
band, on top of these.

**See every primitive drawn in every state on the
[System page](https://app.jadwigo.pl/playground/system).** That live gallery is the reference, and
this page doesn't repeat it.

## Two looks

The child and the parent get different looks on purpose. A child's lesson uses Zeszyt: Andika,
round corners, 2 px lines and big taps. The parent's screens use Geist, small corners, 1 px lines,
flat controls and an ink-blue primary. `data-audience="adult"` or `data-audience="kid"` on a page
picks the look, and a primitive follows it through its tokens. [Tokens](/design-system/tokens/)
lists the values.

## Rules every primitive keeps

- **Colour from the tokens.** A primitive reads roles and aliases. It never holds a literal
  colour or size.
- **Green and red keep their meaning.** "On" or "chosen" is blue, never green. Green marks a right
  answer and red only marks a miss. A destructive action is never red.
- **Every word comes from the caller.** No primitive types a label or a message itself, so every
  screen says it in Polish and English.
- **A child's taps are big.** Every control a child taps is at least 56 px.
- **Disabled says why.** A parent's disabled control stays focusable, and its reason shows on
  hover, on focus and under it on touch.

## Next

- [System page](https://app.jadwigo.pl/playground/system): every primitive, live, in every state.
- [Question types](/design-system/question-types/): the interaction families built on these.
- [Tokens](/design-system/tokens/): the values these components read, in both audiences.
