---
title: Print
description: A lesson prints from the browser today. A server PDF with a paper form per question type is in build.
status: live
as_of: 2026-11-03
prs: [698, 747, 783]
---

This page is for a judge who wants to see a lesson on paper.

Drukuj on the lesson card prints the lesson in place. It mounts a print sheet, opens the
browser's print dialog once, and removes the sheet when printing ends (#747, from #698). That is
what runs today.

The server PDF is in build under `dl-1eieq.8` and `dl-1eieq.2`. Its sheet contract and keyless
builder landed on `main` (#783). It renders paper-first HTML and CSS with WeasyPrint in a Python
Lambda. Each question is 1 card that never splits across pages.
The child answers in place: circle, write, draw, join, or number the order. 5 paper action icons
keep the same meaning across the whole sheet. Type is Andika at 14 pt, a font drawn for beginning
readers. No answer key, hint, or solution prints, and a test fails the build if one does. A lesson
of only lettered choices gets an Alfik-style answer card instead. Printing does not publish or
assign, so a parent can print before giving.

Until that lands, Drukuj stays the in-page print above. This page is labelled `live` for the
browser print only.

## Next

- [Sharing and play links](/features/share-and-play/): the other way a lesson reaches a child.
