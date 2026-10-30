---
title: Copy
description: Every string a person reads, in Polish and English, for a child and for an adult.
---

This page is for anyone writing a line the app shows or reads aloud: where the words live, who
they are written for, and the rules every line keeps.

Every word the app shows or reads aloud lives in one place: the copy tables. A component never
holds a sentence of its own. It asks for a line by its key, in a language, for a reader.

See the interface words in use on the
[System page](https://app.jadwigo.pl/playground/system), under Words.

## Polish and English

Jadwigo speaks Polish and English. Both tables have exactly the same keys, and a test fails the
build when one is missing a line.

Polish is the first language. Every line carries a `reviewed` flag, which stays false until a
parent has read it. A Polish line ships unreviewed until then.

Polish has 3 plural forms, so a line never branches on "1 or more". A counted word names its own
plural rule, so both "2 rzędy po 3 kropki" and "7 rzędów po 8 kropek" come out right.

## 2 readers: a child and an adult

A line is written for a reader:

- **Child**, the default. Short, warm and plain, in words a first-grader reads.
- **Adult**: an adult who is learning, such as with the command-line tool. An adult reads its own
  line where one exists and the child's line otherwise. Adult lines are plain and short too, with
  no score, clock or loss words, and they never ask an adult to find a grown-up.

## A child never reads a bare "wrong"

A miss is information, not failure. The page says "not yet" and invites another look:

- Instead of "Wrong.", a child reads "Let's try that one again."
- Instead of "Incorrect, try again.", a child reads "Take another look, you can do it."

A test checks every line, and every plural form, against a list of harsh words in both languages,
such as "wrong", "mistake", "fail", "źle" and "błąd". A line with one fails the build.

The same care holds beyond the words:

- A miss is shown in red pen on the missed part. Its mark fades in, with no shake.
- Lines about a session's end say "finished" and "again", never lateness, loss or expiry.
- Progress shows how far through the lesson the child is, never a score.

## Writing a new line

1. Add the key to both tables, Polish and English, with `reviewed: false`.
2. Keep it short and kind. Say what to do next, not what went wrong.
3. Add an adult line only when the child's line does not fit an adult.
4. Never put a real name or a real learner's data in a line or an example.

## Next

- [Question types](/design-system/question-types/): where most of these lines are read.
- [Design system](/design-system/): the colours and rules the words sit beside.
