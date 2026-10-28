---
name: mk-voice
description: "Use when a marketing stage needs Jadwigo's voice written out in 2 registers, the parent's and the child's: each register writes the 7 lines of the voice sheet (landing headline, parent's call to action, child's welcome, right answer, miss, pause, class-chat message), starting from the 3 registers already drafted in docs/research/jadwigo-identity.md and from existing copy, with tone dimensions, vocabulary, style rules fixed by decision (digits, no em-dashes, never a bare 'wrong') and before-and-after examples. Writes a docs/research note whose owner questions list options and no pick."
---

<!-- Vendored from arnabbagxd/Brand-building-skills@4a0a8b5 skills/brand-voice (MIT, see LICENSE and CREDITS.md), with the
     extraction method from coreyhaines31/marketingskills@0cd9b3a skills/product-marketing/references/brand-voice.md
     (MIT, see LICENSE-corey-haines) in references/. Changed here: 2 registers, parent and child; the 7-line voice sheet
     from the identity note; style rules fixed by decision; the channel table reduced to Jadwigo's channels; the
     context is the brain, not a .agents/brand-context.md file. -->

# The voice: how Jadwigo speaks to a parent and to a child

You define how Jadwigo sounds so that any writer, and any later command, writes the same voice.
Jadwigo speaks to 2 people on the same page. The parent is "Ty"; the child is "ty". The voice is
1 character, and the register shifts between them the way a teacher's does between a parent at the
door and a child at the desk.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md`, sections 4 and 6 with care. Then read
`docs/research/jadwigo-identity.md` section 2 and the identity drop's voice page (source in
`docs/drops/identity/`, data in `docs/drops/identity/data/identity.json`): 3 registers already
write the 7 lines, and the owner's pick is `dl-w0b4.36`. Read `docs/research/jadwigo-brief.md`,
`docs/research/jadwigo-listening.md` (the parents' words, proxy) and
`docs/research/jadwigo-story.md` if it exists.

Then read `references/brand-voice.md`: build the voice from copy that exists and from the owner's
own writing, not from adjectives. The existing copy is the lesson's own lines (the brief says
where they live), the owner's pitch wording the decisions quote, and the 3 drafted registers.

## 1. The voice in 1 paragraph

4 or 5 sentences a writer could work from alone, and a 1-sentence essence: "Jadwigo sounds like
[a character], [quality], [quality] and [quality]." Write it for each register the owner is still
choosing between (the identity note's 3, or the 1 decided).

## 2. Tone dimensions

Upstream's 5 axes, each with where Jadwigo sits, what it means in practice, and 1 example
sentence per register:

- formality (casual to formal)
- energy (calm to energetic)
- humour (serious to playful)
- expertise (accessible to authoritative)
- warmth (distant to close)

Some positions are already decided and are not options: calm over energetic for anything a child
reads after a miss (no pressure), and a parent line that says what the system does over one that
sells.

## 3. Voice qualities

4 or 5, each with what it means for Jadwigo in 2 sentences, a "do" example and a "don't" example
in both registers.

## 4. The 7 lines, in 2 registers

The sheet from the identity note. Each line in Polish, then English, once for the parent register
and once for the child register where the line is the child's:

| Line | Who reads it |
| --- | --- |
| landing headline | the parent and the child, on the same screen |
| parent's call to action | the parent |
| child's welcome | the child |
| right answer | the child |
| miss | the child; starts with "Jeszcze nie", the lesson's own line |
| pause | the child; a pause is a valid outcome |
| class-chat message | a parent, forwarding it to other parents |

Start from the 3 drafted registers. A line you change, say why. A line a child reads uses no word
from the lesson's harsh-word list (źle, zły, błąd, błędnie, niepoprawnie, nie tak, porażka),
carries no points, clock or streak, and asks the child for nothing from the parent.

## 5. Vocabulary

Words we use, 10 to 15, Polish with English, from the glossary (`GLOSSARY.md`: a lesson, a
question, a learner, a parent) and from the parents' own words in the listening note. Words we
avoid, 10 to 15, with the reason: the harsh words above, the category clichés from the
positioning note, hollow adjectives, and any label for what the system does ("lessons that
remember").

## 6. Style rules, fixed by decision

These are not options:

- Numbers are digits: "6 lines", never "six lines", in Polish and in English.
- No em-dashes. A comma, a full stop or a plain dash.
- Every line goes through `/human-voice` before it ships.
- A miss is never a bare "wrong".
- Polish first. The child is "ty", the parent "Ty".

Sentence length, contractions (English only), exclamation marks, capitalisation and humour are
options: give each register's position with 1 example.

## 7. Per channel

Only Jadwigo's channels: the landing page, the class chat message, O nas, copy inside the app
(welcome, right answer, miss, pause). For each, how the voice flexes, with 1 example phrase.

## 8. Before and after

4 or 5 rewrites: a line in the wrong voice (a scoring app's, a slogan, a pressure line, an
English-first line) and the same line in Jadwigo's, with 1 sentence on why.

## 9. Things we never say

Specific phrases and patterns, grouped: hollow hype, false urgency, pressure on a child, a child
asked to persuade a parent, a slogan a parent cannot explain.

## Write the note

`docs/research/jadwigo-voice.md`, in the shape the shared rules give in section 7. The outcome
block's `owner_decisions` carries the register (feed `dl-w0b4.36`'s options, reword none) and
each open style position from section 6. No pick anywhere.

```bash
bun tools/src/check-research.ts docs/research/jadwigo-voice.md --issue <id>
md prose slop docs/research/jadwigo-voice.md --findings --baseline
```

Run `/human-voice` on every line, and stop.
