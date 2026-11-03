---
title: Sharing and play links
description: A given lesson reaches the child as a link. A link with a learner in it starts as that child, with no sign-in.
status: live
as_of: 2026-11-03
prs: [698, 711, 712, 729]
---

This page is for a judge who wants to see how a lesson gets from the parent's screen to the
child's hands.

Daj lekcję gives a checked lesson revision to play. With no child named, it opens 2 choices:
open the lesson on this computer, or print it. With a child named, the parent gets a play link
with the learner in it, as `?learner=`. The child opens the link and the lesson starts as that
child. No sign-in stands between the child and the first question.

Giving on this computer and printing in place are live (#698). The `?learner=` links are on
`main`, not yet on prod: the play page starting as the named child (#711), the route that gives a
checked revision (#712), and the end-to-end test that plays such a link to the results (#729).

A lesson confirmed through the remote MCP reaches the child the same way, as a play link with the
learner in it.

## Next

- [The player and its question families](/features/player-and-families/): what the child plays.
- [Connect your AI](/features/connect-your-ai/): giving a lesson from the parent's own AI app.
