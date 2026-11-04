---
title: Photo to lesson
description: A parent photographs a homework page and Jadwigo builds a lesson from it.
status: live
as_of: 2026-11-04
prs: [737, 775]
---

A parent sends a photo of a homework page in the chat, and a lesson of at most 20 questions comes
back as a card.

## How it works

### Photo

A parent attaches photos to a chat message, or a PDF, DOCX or HEIC file. The files land in a
private bucket that only that family's account can read. A converter turns a PDF, DOCX or HEIC
file into 1 picture per page first, and refuses a file it can't read. The parent sees the photos
under their own message, full size on a tap.

### Lesson

The AI engine reads the pages, works out the topic, and draws lesson-ready questions from the
[question bank](/features/question-bank/). It writes only what the bank lacks. The lesson arrives
in the same chat as a card, and from that card the parent gives it to a child or prints it.

### Fence

Text a child or a photo wrote is data, never instructions. It reaches the model inside a fence
that marks it as untrusted, so words on a worksheet can't instruct the engine.

## Limits

- **A written question can be broken.** In E6, 1 of the 2 drafts didn't compile, and its card was
  still shown. The lesson check reports problems to the parent but doesn't stop the lesson.
- **The cost is measured on 2 invented worksheets only:** about $0.0024 and 40 seconds a lesson
  ([E6](/experiments/e6/)).

## Next

- [Chat and lesson workspace](/features/chat-and-workspace/): where the lesson lands.
- [Question bank](/features/question-bank/): where the questions come from.
