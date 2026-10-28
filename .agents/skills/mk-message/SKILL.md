---
name: mk-message
description: "Use when a marketing stage needs Jadwigo's value proposition and message hierarchy: a core message, a value proposition, and 4 levels (headline, supporting statement, key messages, proof points), each written as a parent line and a child line, Polish first, with every proof point cited to a decision or a research note. No tagline is recommended and no stat goes in without a source. Writes a docs/research note whose owner questions list options and no pick."
---

<!-- Vendored from arnabbagxd/Brand-building-skills@4a0a8b5 skills/brand-messaging (MIT, see LICENSE and CREDITS.md).
     Changed here: the context is the brain, not a .agents/brand-context.md file; every level has a parent line and a
     child line; proof points cite a decision or a research note; the "Recommended" tagline flag is gone; the channel
     table is reduced to the channels Jadwigo has. -->

# Messaging: what Jadwigo says, to the parent and to the child

You build the messaging architecture the copy will be written from: the single thing Jadwigo
needs to say, and under it the messages and the proofs. Messaging is not copy. Good messaging
says the same thing everywhere, has 1 core idea carried by 3 or 4 messages carried by proof, and
flexes per audience. Jadwigo has 2 audiences on the same page, the parent who decides and the
child who studies, so every level comes in 2 lines.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md`. Then read `docs/research/jadwigo-brief.md`,
`docs/research/jadwigo-listening.md` (the parents' words, labelled proxy),
`docs/research/jadwigo-positioning.md` and `docs/research/jadwigo-foundation.md`, and the
decisions they cite. The go-to-market note, section 4, already offers 3 ways to lead, in Polish,
for the parent and for the child; the owner's pick is `dl-w0b4.30`. Start from those 3. Do not
reword them.

Ask the brain for what is decided about the message:
`md context ask "lead message" --project jadwigo-marketing`.

## 1. Core message

The 1 sentence everything else expands, in the frame "Jadwigo helps [the parent] [outcome] by
[what the system does]". Write it as a parent line and a child line, Polish first, English
after. Offer 2 or 3 versions, matched to the 3 ways to lead already on the table. Each is an
option.

## 2. Value proposition

2 or 3 sentences that answer what Jadwigo does, for whom, with what outcome, and how it differs.
The test from the decision on copy: a parent should be able to say what the system does from
these sentences alone. The second core promise is written as what happens after each lesson
(Jadwigo records what went well, where the child struggled and which mistakes they made, and
builds the next lesson from that), never as a label for it.

## 3. The hierarchy, in 4 levels

For each level, a parent line and a child line. A child line follows section 4 of the shared
rules: short, kind, no pressure, no scores, no streak, nothing that asks the child to get the
parent to do anything.

- **Level 1, the headline**: 1 line for the landing page's first screen.
- **Level 2, the supporting statement**: 1 or 2 sentences under it.
- **Level 3, the key messages**: 3 or 4, each with a bold claim of 5 to 8 words, 2 sentences of
  support, and 1 proof point.
- **Level 4, the proof points**: a bank of 6 to 8. Each cites a decision slug or a research note.
  A fact with no citation, a metric with no source, a testimonial, a logo: none of these exist
  yet, and none is invented. Say "no metric yet" where upstream expects one.

## 4. Per audience

- **For the parent**: what they care most about (from the listening note, with its proxy label),
  how to lead, which proofs land, what to avoid.
- **For the child**: what they need to feel at home on the page, how the child line is written,
  what never appears (section 4 of the shared rules).
- **For the class teacher**, if the first audience is the class (`dl-w0b4.29`): the class-chat
  line a parent would forward, and nothing a teacher would have to endorse.

## 5. Per channel

Only the channels Jadwigo has or has decided to have:

| Channel | Headline approach | Tone | Length |
| --- | --- | --- | --- |
| jadwigo.pl landing page | | | |
| the class chat message | | | |
| O nas | | | |
| copy inside the app (welcome, right answer, miss, pause) | | | |

Social bios, email subject lines, sales decks and paid ads are not in the table until a decision
puts them there.

## 6. Things not to say

Upstream's 4 categories, made Jadwigo's: a claim without a proof point; the category clichés
from the positioning note ("free, no ads" alone); anything a child reads that carries pressure;
a slogan a parent could not explain. Add the exact phrases to avoid, from the listening and
positioning notes.

## No tagline

Upstream offers 4 or 5 taglines and flags a recommended one. Jadwigo does not want a tagline:
copy says what the system does (the decision on copy). If the material produces a short line that
passes that test, list it as a level 1 headline option. Nothing is flagged as recommended.

## Write the note

`docs/research/jadwigo-messaging.md`, in the shape the shared rules give in section 7. The
outcome block's `owner_decisions` carries the core message versions, the headline options (feed
them to `dl-w0b4.30`'s options, reword none), and any per-audience choice the evidence left open.
No pick anywhere.

```bash
bun tools/src/check-research.ts docs/research/jadwigo-messaging.md --issue <id>
md prose slop docs/research/jadwigo-messaging.md --findings --baseline
```

Run `/human-voice` on every line, keep numbers as digits, and stop.
