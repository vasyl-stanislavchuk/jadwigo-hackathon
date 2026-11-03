---
title: The player and its question families
description: The child plays a lesson 1 question at a time. 7 interaction families hold 29 question types.
status: live
as_of: 2026-11-03
prs: [742]
---

This page is for a judge who wants to see what the child plays, and how many kinds of question
the player can draw.

The player shows 1 question at a time. The child answers, checks, and gets a verdict with kind
words. A wrong answer stays on the step with help, never a bare "wrong". Every answer is graded
by pure functions in the `core` package, so the same question grades the same way everywhere.

Questions come in 7 interaction families: choose, enter, slots, sequence, group, place, and
explain. The catalog holds 29 question types across them. A test on `main` draws every type the
bank holds as a bank-shaped body, plays it, and grades a right and a wrong answer for each: 16
types, 49 tests (#742). 3 catalog types wait for bank items: true/false, clock reading, and
money counting.

## Every family

| Family | What the child does |
| --- | --- |
| `choose` | Picks 1 or more options, or compares 2 fractions. |
| `enter` | Types a number, a short text, or an expression on a keypad. |
| `slots` | Fills gaps in a text, a table, a picture, a column, or a pyramid. |
| `sequence` | Puts tiles in order. |
| `group` | Sorts into buckets or matches 2 columns. |
| `place` | Places a point on a number line, taps a picture, builds on a grid, draws a graph. |
| `explain` | Writes why. A lesson never asks it yet. |

## Next

- [Celebration](/features/celebration/): what plays after 3 clean right answers.
- [Credits](/features/credits/): whose question the child is answering.
