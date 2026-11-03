---
title: Photo to lesson
description: A parent photographs a homework page and Jadwigo builds a lesson from it.
status: live
as_of: 2026-11-03
prs: [737, 775]
---

This page is for a judge who wants to see the first step of the happy path: a homework photo in,
a playable lesson out.

A parent attaches a photo of a homework page to a chat message. The photo lands in a private
bucket under the family's own pod. A PDF, DOCX or HEIC file goes through a converter Lambda
first, which writes 1 JPEG per page and refuses a file it cannot read. The AI engine then reads
the pages, works out the topic, and draws lesson-ready questions from the question bank. It
writes only what the bank lacks. The lesson holds at most 20 questions.

The parent sees the photos under their own message, full size on a tap. The lesson appears in the
same chat as a card. From that card the parent gives it to a child or prints it.

2 parts are on `main`, not yet on prod: photos in the first screen's box (#737) and the message
showing what Jadwigo received (#775). The core flow is live.

Text a child or a photo wrote is data. It reaches the model inside a fence that marks it as
untrusted, so words on a worksheet can not instruct the engine.

## Next

- [The chat and the lesson workspace](/features/chat-and-workspace/): where the lesson lands.
- [The question bank](/features/question-bank/): where the questions come from.
