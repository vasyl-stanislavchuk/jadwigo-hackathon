---
title: Player and question families
description: The child plays a lesson 1 question at a time, in 7 interaction families, with a short celebration after 3 clean answers.
status: live
as_of: 2026-11-04
prs: [742, 779]
---

The child plays a lesson 1 question at a time, gets kind words after every answer, and never
sees points or a streak.

## How it works

### One question at a time

The child answers, checks, and gets a verdict in kind words. A wrong answer stays on the step
with help, never a bare "wrong". Every answer is graded by the same pure functions, so a question
grades the same way everywhere.

### 7 families, 29 question types

Every question type belongs to 1 of 7 interaction families, listed below. The catalogue holds 29
types. A test draws every type the bank holds, plays it, and grades a right and a wrong answer for
each: 16 types, 49 tests.

### Celebration

At the 3rd question in a row that the child got right on the first try with no help, a short video
plays: the queen, or the class's teacher saying "Brawo!" ("Well done!" in English). After it, the
count starts again, so a lesson has 2 at most. A miss, help or a skip also starts it again. The
count is never shown, and a reload never plays the same celebration twice.

## Limits

- **3 catalogue types have no bank questions yet:** true or false, reading a clock, and counting
  money.
- **A child's own-words answer isn't judged.** The `explain` family keeps the answer, no lesson
  asks for one yet, and judging it is a vision ([Judging answers](/vision/judging-answers/)).

## Every family

| Family | What the child does |
| --- | --- |
| `choose` | Picks 1 or more options, or compares 2 fractions. |
| `enter` | Types a number, a short text, or an expression on a keypad. |
| `slots` | Fills gaps in a text, a table, a picture, a column, or a pyramid. |
| `sequence` | Puts tiles in order. |
| `group` | Sorts into buckets or matches 2 columns. |
| `place` | Places a point on a number line, taps a picture, builds on a grid, draws a graph. |
| `explain` | Writes why, in their own words. No lesson asks it yet. |

## Next

- [Sharing and play links](/features/share-and-play/): how the child gets here.
- [Question bank](/features/question-bank/): whose question the child is answering.
