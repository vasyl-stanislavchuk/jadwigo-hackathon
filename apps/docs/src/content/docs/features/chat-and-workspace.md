---
title: Chat and lesson workspace
description: The parent app is 1 chat. A lesson built in it lands as a card the parent can give or print.
status: live
as_of: 2026-11-04
prs: [740, 744, 747, 782]
---

The parent app is 1 chat, and every lesson made in it arrives as a card in that chat.

## How it works

### One chat

The parent app opens on the chat. The account sits in the top bar, with no side panel and no
footer. Each message the parent sends is 1 run of the [AI engine](/architecture/ai-engine/).

### Lesson card

A run that writes a lesson leaves a card in the chat with the lesson's title, its question count
and its first question. Opening the card shows the lesson in a preview, with 2 actions: Daj lekcję
(give the lesson) and Drukuj (print). There's no save button, because every lesson is already
listed under Lekcje.

### Citations

When a message cites something, such as a lesson or a learner, the citation is a chip. A tap on
the chip opens that thing beside the chat.

## Limits

- **A lesson from a photo takes about 40 seconds.** The chat shows the run working until the card
  arrives ([E6](/experiments/e6/)).
- **The card shows what the check found, but doesn't block.** A lesson with a problem still gets a
  card, so the parent's preview is the last check before a child plays it.

## Next

- [Sharing and play links](/features/share-and-play/): how a given lesson reaches the child.
- [AI engine](/architecture/ai-engine/): what 1 chat message runs.
