---
title: Celebration
description: Once a lesson, after 3 first-try right answers in a row, the queen plays. The count is never shown.
status: main
as_of: 2026-11-03
prs: []
---

This page is for a judge who wants to see how Jadwigo praises a child without points or streaks.

Once a lesson, at the praise for the 3rd question in a row that the child got right on the first
try with no help, a short queen video plays. The count is never shown to the child. There are no
points and no streak flame. The player works the moment out from the answers already given, so a
reload past that question never plays her again, and a held verdict never triggers her.

On prod she never played. The cause was found on `main` in `dl-1eieq.4`, now closed: browsers
other than Safari skip the `.mov` source and fire an error at it, and the player read that error
as the video ending, about 2 ms after she mounted. The fix listens for the video's own error and
the last source's error only. It is on `main`, not yet on prod, so this page is labelled `main`.

## Next

- [The player and its question families](/features/player-and-families/): the screen she plays on.
