---
title: What's real
description: What runs on app.jadwigo.pl today, how to try it in 2 minutes, and what doesn't work yet.
---

This page separates what you can use today from what is still a plan. On 2026-11-04 the API and
the web app on prod ran the same commit as `main`, so a feature on `main` is a feature you can try.

## How to try it

- **Play a lesson as a child.** Open
  [Adding and taking away to 20](https://app.jadwigo.pl/play/asg_67ppftwzj9a4ttbtftc3mn4z45). No
  sign-in. It has 8 questions, in English.
- **Make a lesson as a parent.** Sign in at [app.jadwigo.pl](https://app.jadwigo.pl) with a 6-digit
  email code, add a child, and send a photo of a homework page in the chat.
- **Call the API.** [Your first call](/guides/first-call/) needs no account.

## Limits

These are the gaps we know about today:

- **Spelling homework gets no lesson.** The bank has no Polish spelling questions for grade 3 yet,
  and the parent sees no error when that happens ([E6](/experiments/e6/)).
- **The connect-your-AI flow is untested end to end.** The server answers on prod. Nobody has yet
  connected a parent's own AI app to it and made a lesson.
- **A child's own-words answer is kept but not judged.** Judging it is a vision
  ([E7](/experiments/e7/)).
- **Nothing learns from a child's answers yet.** The learning loop is a vision, tried on invented
  learners only ([The learning loop](/vision/learning-loop/)).
- **The question bank covers maths first.** Khan Academy grades 1 to 4 and Alfik Matematyczny,
  in Polish and English.

## Every part

| Part | Status | What it means |
| --- | --- | --- |
| [Photo to lesson](/features/photo-to-lesson/) | Live | A homework photo in the chat becomes a lesson of at most 20 questions. |
| [Chat](/features/chat-and-workspace/) | Live | The parent app is one chat, and a lesson arrives as a card in it. |
| [Share and play](/features/share-and-play/) | Live | A play link starts as the child, with no sign-in. |
| [Player](/features/player-and-families/) | Live | One question at a time, in 7 kinds of interaction. |
| [Celebration](/features/player-and-families/) | Live | A short video after 3 right answers in a row. |
| [Credits](/features/question-bank/) | Live | Every borrowed question names its source and licence. |
| [Print](/features/print/) | Live | A lesson prints as a PDF the server renders. |
| [Sign-in and consent](/features/sign-in-and-consent/) | Live | Parents sign in with an email code. Children never sign in. |
| [Question bank](/features/question-bank/) | Live | Lessons draw from credited Khan Academy and Alfik question sets. |
| [Connect your AI](/features/connect-your-ai/) | Live, untested | A parent's own AI app connects by OAuth 2.1 and makes lessons. |
| [The learning loop](/vision/learning-loop/) | Vision | Knowing the child, the next lesson, and the parent's report. |
| [Growing the bank](/vision/growing-the-bank/) | Vision | New question sets read, indexed and tested by Meta models. |
| [Judging answers](/vision/judging-answers/) | Vision | Marking a child's own words against criteria. |

## Next

- [Photo to lesson](/features/photo-to-lesson/): the first step of the happy path.
- [How it is built](/architecture/): the system at 2 levels of detail.
- [The story](/story/): how it got here in 10 days.
