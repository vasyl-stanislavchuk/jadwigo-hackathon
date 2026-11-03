---
title: The chat and the lesson workspace
description: The parent app is 1 chat. A lesson built in it lands as a card the parent can give or print.
status: main
as_of: 2026-11-03
prs: [740, 744, 747, 782]
---

This page is for a judge who wants to see where a parent works: 1 chat, with the lesson beside
it on demand.

The parent app is chat-first. The account sits in the top bar. There is no details panel and no
footer. Each chat turn is 1 run of the AI engine. A turn that writes the lesson leaves a lesson
card in the chat: its title, its question count, and its first question. The newest card carries
its actions in its foot: Dla (who the lesson is for), Drukuj (print), and Daj lekcję (give the
lesson). There is no save button: every lesson is already in Lekcje. Citations in a message are
chips. A chip opens its thing
beside the chat, and so does a learner widget.

The chat-first build is on `main`, not yet on prod: the chat-first app (#740), chat objects and
the lesson-ready card (#744), and the card's actions (#747). The core chat is live. This page
is labelled `main` for the card and its actions. The lesson widget now opens a preview modal
and holds Daj lekcję and Drukuj, with no lesson column beside the chat (#782, also on `main`).

## Next

- [Sharing and play links](/features/share-and-play/): how a given lesson reaches the child.
- [The AI engine](/architecture/ai-engine/): what 1 chat turn runs.
