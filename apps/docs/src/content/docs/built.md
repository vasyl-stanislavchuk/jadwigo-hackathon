---
title: What's built
description: Every feature built during the hackathon, from 2026-10-26 to 2026-11-04, and how to try it on app.jadwigo.pl.
---

Everything on this page was built in 10 days and runs on app.jadwigo.pl today. What comes after
it is on [What's next](/next/).

## How to try it

- **Play a lesson as a child.** Open
  [Adding and taking away to 20](https://app.jadwigo.pl/play/asg_67ppftwzj9a4ttbtftc3mn4z45). No
  sign-in. It has 8 questions, in English.
- **Make a lesson as a parent.** Sign in at [app.jadwigo.pl](https://app.jadwigo.pl), add a child,
  and send a photo of a homework page in the chat.
- **Call the API.** [Your first call](/guides/first-call/) needs no account.

## For parents

- **[Photo to lesson](/features/photo-to-lesson/).** A photo, PDF, Word file or HEIC of a homework
  page becomes a checked lesson of at most 20 questions.
- **[Chat](/features/chat-and-workspace/).** The parent app is one chat. A finished lesson arrives
  as a card that opens in a preview.
- **[Share and play](/features/share-and-play/).** A lesson goes to the child as a link that starts
  as that child, with no sign-in.
- **[Print](/features/print/).** Any lesson prints as a PDF the server renders for paper.
- **[Sign-in and consent](/features/sign-in-and-consent/).** Parents sign in with an email code,
  Google or Facebook. Analytics run only after a parent says yes, with every input masked.
- **[Connect your AI](/features/connect-your-ai/).** A parent's own AI app, such as claude.ai or
  ChatGPT, connects by OAuth 2.1 and makes lessons from that chat.

## For children

- **[The player](/features/player-and-families/).** One question at a time, in 7 kinds of
  interaction, with a short celebration after 3 right answers in a row.
- **Lesson review.** After a lesson, the child looks back at each question, their answer and the
  right one.
- **Polish spelling lessons.** Many children in one class have already played them.

## Learner knowledge

Every answer a child gives is kept as evidence, and Jadwigo turns it into what the child knows:

- **Skills.** Code folds the evidence into a level for each skill, a flag when a skill needs
  attention, and a date when it's due again. No model computes a level.
- **Goals.** A parent sets goals in their own words, each tied to the skills it needs. Each goal
  shows what's going well, what needs attention and what comes next.
- **The learner panel.** The parent sees each goal's 3 lists, the last 4 weeks of practice and the
  newest report, in words, never as a score or a percentage.
- **Reports.** Code writes a digest of what moved. A model writes the parent's words from it, and a
  proposal changes nothing until the parent accepts it.
- **AI that reads it.** The chat's AI and a parent's own AI app both read a child's skills, week
  and mistakes before they suggest a lesson.

Today a person starts each report, and the next lesson isn't drawn from this picture on its own
yet. That is [the learning loop](/vision/learning-loop/).

## Content

- **[The question bank](/features/question-bank/).** Khan Academy maths for grades 1 to 4 and
  Alfik Matematyczny, in Polish and English, searchable, with only lesson-ready questions offered.
- **Credits.** Every borrowed question shows its source and licence.
- **Featured lessons.** A few lessons anyone can play, shown on jadwigo.pl.

## For developers and agents

- **[The API](/guides/introduction/)**, versioned, with an OpenAPI document and a typed
  [TypeScript client](/typescript/).
- **[Two MCP servers](/mcp/):** a local one for lesson authors and a remote one for a parent's AI.
- **[The AI engine](/architecture/ai-engine/).** Each chat turn runs as steps on Meta's Muse
  models, with a daily spending cap per family.
- **[The design system](/design-system/)** in 2 looks: a notebook look for children and a calm one
  for parents.
- **jadwigo.pl**, the marketing site in Polish and English, and **these docs**, built from the code.

## Next

- [What's next](/next/): the vision, and the experiments behind it.
- [How it is built](/architecture/): the system, from one page to the details.
- [The story](/story/): how it got here in 10 days.
