---
name: jadwigo-lesson-compose
description: "Use when a parent asks for a lesson for their child (\"6 zadań z mnożenia, klasa 3\", \"przygotuj lekcję z dodawania\"): drafts it from the question bank with the jadwigo MCP tools lesson_draft and lesson_check, writes only what the bank lacks (each question's twin and mistake cards) in short, kind Polish, publishes it locally with lesson_publish, and gives the parent the card and the play link. Needs only the jadwigo MCP server; it works in an empty folder."
---

# Compose a lesson from the bank

A parent asks for a lesson. You turn the request into a lesson that plays, through 3 tools of the
`jadwigo` MCP server: `lesson_draft` draws the questions from the bank and copies each one whole,
`lesson_check` puts your words on the copy, checks the lesson and returns the card the parent
reads, and `lesson_publish` publishes the checked lesson locally and returns the link it plays at.

This workflow may run in a folder with nothing in it. Everything you need is in this file, in what
the parent tells you, and in what the 3 tools return. Do not look for source code, files, scripts
or a repository, and do not run shell commands. If the `jadwigo` tools are not offered to you, say
so to the parent and stop.

Two decisions are in force:

- `jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts`.
  The bank is the best source the lesson has. In the owner's words: "we should COPY all available
  details from the bank. Bank is the most high quality source", "help text including". You keep
  the copy. You write only what `you_write` lists, and you change a copied part only when the
  parent's request asks for it, as a `changes` entry that says why.
- `jadwigo-ai-workflows/decisions/2026-10-30-jw-adds-the-multiplication-mistake-rule-by-code-to-a-copied-axb`.
  The tool, not you, adds the multiplication mistake rule to a plainly a×b question. You never
  write or change a key's rule, and you never invent a mistake class.

## What you never do

- Judge whether an answer is right. The bank's key and the check decide that. You never change a
  copied key unless the parent asked for other numbers.
- Write a lesson, a record or a file yourself, or edit what a tool wrote. Every word goes in
  through `lesson_check`.
- Write a script, a loop or a template that fills the questions. You write each question's words
  by hand, one question at a time, after reading that question.
- Import or publish any other way than `lesson_publish`, or anywhere but local. You never run
  `make` or an import command, and never publish to jadwigo-dev or prod: those are the owner's.
  You never deploy, send anything, or start anything that costs money.
- Put a family member's name in anything you write for the lesson.

## 1. Ask what is missing

You need 4 things before the first call. Take what the parent said; ask, in one short message,
only for what is missing:

- **Grade**: the class number, 1 to 3 (`klasa 3` is `"3"`).
- **Topic**: what the child practises (mnożenie, dodawanie do 100, zegar).
- **Count**: how many questions, when the parent said one. Otherwise the tool picks.
- **Names**: every name the family uses in the request: the child's, a sibling's, the parent's.
  Pass each name once, in its dictionary form (`Zosia`, not also `Zosi`, `Zosię`, `Zosiu`):
  the tool finds the declined forms itself. When the request names nobody, pass `[]`.

Do not guess a grade. Leave product choices (which topic next, how hard) to the parent.

## 2. Draft

Call `lesson_draft` with:

- `request`: the parent's words as they wrote them, names included. The tool replaces the names
  before anything leaves the machine.
- `topic`: what the lesson is about in a few words, taken from the request, with no count, grade
  or name (`mnożenie`, `dodawanie do 100`). The bank searches these words.
- `grade`, `names`, and `count` when the parent gave one. Leave `language` at `pl` and `kind` at
  `practice` unless the parent asked for a review or a check.

## 3. Read the slim view

The result keeps the draft under `draft_id`. Read, before you write anything:

- `plays_as_copied` and `copy_errors`: whether the lesson already plays as the bank has it.
- `left_out`: each set or question not used, and why. You will show it to the parent.
- `rule_settled: false`: the draw rule is provisional. Say so on the card, once.
- Per question (`step_id`, `q1` to `q6`):
  - `say`, `prompt`, `data`, `key`: the question as the child sees it, and its answer.
  - `copied_help` and `rungs`: the bank's hints and worked lines, and which rung each one fills
    (`look`, `boost`, `almost`, `worked`). A rung that names a hint is filled. Leave it alone.
  - `you_write`: exactly what is left for you on this question. Nothing else.
  - `mistake_classes`: the classes a `boost_by_mistake` card may be keyed by, or `null`.

## 4. Write each question's words

Take the questions one by one. For each, read its `say`, `data`, `key` and `copied_help` again,
then write what its `you_write` lists, in Polish. No two questions get the same text.

### The twin (`twin`)

The twin is a second question the child gets after a miss, so it must be the same task with other
numbers. Write it as `{"say", "data", "key"}`.

- **Same representation.** Copy the question's `data` and change only the numbers in it: the same
  fields, the same `stem` and `figure` shape, the same `figure.kind`, the same `input` and `entry`.
  If the question has pictures, an array, groups, a number line or a clock, the twin keeps them
  too; change the numbers they show, never drop them.
- **Same fact family.** Keep the factor or step the question is about, and change the other one.
  A question on ×10 (3 · 10) gets a twin on ×10 (4 · 10), never 3 · 9. A question on ×6 (6 · 7)
  gets 6 · 8 or 6 · 4. Adding within 100 by full tens stays full tens. The twin stays in the
  same grade and number range.
- **Its own `say`, in the question's shape.** Rewrite the `say` for the twin's numbers. If the
  question's `say` ends in `?`, the twin's does too. Words for numbers stay in the right form
  (`w czterech rzędach`, `po sześć`).
- **Its own `key`**, in the question's key shape (`{"accept": ["24"]}`), for the twin's numbers.
  Leave out the question's `near` table: its numbers belong to the question.

### The rungs the copy leaves empty (`look`, `boost`, `almost`, `worked`)

Only when `you_write` names one. `look` and `boost` are `{"text": "..."}`; `almost` and `worked`
are lists of lines.

- `look` points the child back at the task: what to look at, what is asked. It never gives the
  answer.
- `boost` gives a way in that this question's numbers show: `6 · 7 to 7 razy po 6.` It never
  gives the answer, and it leans only on numbers the question or its hints already show. Do not
  bring in a fact the lesson never teaches (for 6 · 7, not "pamiętasz, że 5 · 6 = 30").
- `worked` shows the solution step by step, ending with the answer. `almost` is `worked` with its
  last line blank.

### Mistake cards (`boost_by_mistake`)

A card answers one kind of miss on this question: `{"<class>": {"text": "..."}}`. Write one card
for each class in that question's `mistake_classes`, and no other key. When the list is empty or
`null`, write no cards (`you_write` then does not ask for them). The classes you may meet on a
multiplication question:

- a class from the key's `near` table, such as `added_instead` (the child added the numbers);
- from the multiplication rule, which the tool adds to a plainly a×b question: `neighbour_row`
  (one row off: 6 · 6 or 6 · 8 for 6 · 7), `add_for_multiply` (added the numbers: 13 for 6 · 7),
  `off_by_small` (1 or 2 away), `digit_reversal` (24 for 42), `same_decade` (the right tens, the
  wrong units), `neighbour_fact_swap` (the answer to a fact asked just before).

Each card speaks to that miss on that question, with its numbers: for 6 · 7 and `add_for_multiply`,
`6 + 7 to dodawanie. Tu jest 7 grup po 6.` A card never prints the answer (the player drops one
that does).

### Polish for a child of 6 to 9

- Short sentences, one idea each. Address the child as `ty`. Every sentence ends with `.`, `?` or
  `!`; a question ends with `?`.
- Kind and plain. Never tell the child a task is easy or simple (`łatwe`, `proste`, `to proste`,
  `łatwizna`), and never a bare `źle` or `błąd`. Say what to try: `Policz jeszcze raz grupy.`
- Use the lesson's signs and words as the question uses them: `·` for times, `razy`, `po`, `grupy`.
- No names, no praise you cannot back (`super!` after a miss), no English.

## 5. Check

Call `lesson_check(draft_id, help)`, where `help` maps every `step_id` to its words, every step on
every call:

```json
{
  "q1": {
    "twin": {"say": "Ile kropek jest w czterech rzędach po sześć?", "data": {"...": "the question's data, other numbers"}, "key": {"accept": ["24"]}},
    "boost": {"text": "To 3 rzędy po 6 kropek. Dodaj 6 trzy razy."},
    "boost_by_mistake": {"added_instead": {"text": "6 + 3 to dodawanie. Tu są 3 rzędy po 6."}}
  }
}
```

Pass `title` or `reasoning` only when the parent asked for another title. A change to a copied part
goes in the step's words, only when the parent's request asks for it:
`"changes": [{"change": "context", "why": "the parent asked for apples", "set": {"say": "..."}}]`.
`change` is `numbers`, `context`, `wording` or `tutor_notes`; a path is `say` or a dotted path
under `data`, `key`, `hints`, `worked` or `almost`.

## 6. Fix what the check finds

`ok: false` lists errors by `step_id` (a twin's ends in `t`). Fix exactly those steps, keep the
others as they were, and call `lesson_check` again with every step. If the same error comes back 3
times with nothing new to try, stop and show the parent the error as the tool gave it.

## 7. Show the parent the card

`ok: true` returns the `card`. Show it in the parent's language, per question: the prompt, the
answer, each rung, the twin with its answer, the source and licence, and any change with its why.
Then `left_out` with each reason, and one line that the draw rule is still provisional. Ask
whether anything should change. A change the parent asks for goes back through steps 4 to 6.

## 8. Publish and hand over the link

Once `lesson_check` answers `ok: true`, call `lesson_publish(draft_id)` without asking. It publishes
only to `local`, the database the owner's `make dev` serves; leave `target` out. It refuses a
lesson whose last check is not ok, so publish only after a clean check.

- `ok: true`: give the parent the `play_url`, exactly as the result gives it, and what was
  verified: the api answered, a preview attempt started with every question (`plan_questions`),
  and the play page answered.
- `ok: false`: say which check in `verified` failed, as the tool gave it, and stop. Do not retry
  more than once.
- A refusal (the tool's error): show it to the parent as it is and stop. When it names a command
  for the owner, pass it on for the owner to run; you never run it.

Publish only with `lesson_publish`: never with `make`, never to dev, never to prod.
