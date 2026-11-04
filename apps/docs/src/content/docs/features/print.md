---
title: Print
description: A lesson prints as a PDF the server draws for paper, with a form for each question type and no answer key.
status: live
as_of: 2026-11-04
prs: [783, 878, 913]
---

A lesson prints as a PDF the server draws for paper, so a child can do it at the kitchen table
with a pencil.

## How it works

### Where printing starts

Drukuj on the lesson card opens the lesson's PDF. The play page's first screen has a print key
too, below the start. Printing doesn't give or publish the lesson, so a parent can print before
giving it.

### Sheet

The server draws the sheet from HTML and CSS with WeasyPrint. Each question is 1 card that never
splits across pages. The child answers in place: circle, write, draw, join, or number the order.
5 paper action icons keep the same meaning across the whole sheet. Type is Andika at 14 pt, a font
drawn for beginning readers.

### What never prints

No answer key, hint or solution prints, and a test fails the build if one does. Each borrowed
question keeps its credit line on paper.

## Limits

- **The sheet is A4 only.** There's no Letter size and no choice of layout.
- **The server draws at most 5 PDFs at once.** When more prints arrive together, they wait in turn.
- **A print is kept for 30 days,** then deleted. Printing the lesson again draws it again.

## Next

- [Sharing and play links](/features/share-and-play/): the other way a lesson reaches a child.
- [Player and question families](/features/player-and-families/): the same questions on
  screen.
