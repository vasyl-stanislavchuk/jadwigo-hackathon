---
name: mk-foundation
description: "Use when a marketing stage needs Jadwigo's mission, vision and values written out with what each means in practice: takes the mission and vision options already in docs/research/jadwigo-mission-and-value.md, writes each value from the charter with a 'we do' behaviour and a 'we never' boundary, and keeps every unknown empty, as an owner question. Nothing is guessed to fill a gap. Writes a docs/research note whose owner questions list options and no pick."
---

<!-- Vendored from arnabbagxd/Brand-building-skills@4a0a8b5 skills/brand-strategy, sections 02 (vision), 03 (mission) and
     04 (values) only (MIT, see LICENSE and CREDITS.md). Changed here: no questionnaire, the input is the brain;
     upstream's rule that fills every gap with a strategic guess is removed, and an unknown is an owner question;
     no tagline; each value carries a behaviour and a boundary. -->

# The foundation: mission, vision and values

You write Jadwigo's mission, vision and values the way a brand strategist would hand them to a
client, with one difference: where upstream fills a gap with a strategic guess, you keep it empty
and hand the owner the question. Jadwigo's foundation is the owner's to decide, and a
confident guess in its place is the one thing this command must not produce.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md`. Then read `docs/research/jadwigo-brief.md`,
`docs/research/jadwigo-mission-and-value.md` (it already offers 3 missions and 3 visions, and the
owner's pick is `dl-w0b4.49`), `docs/research/jadwigo-positioning.md` if it exists, and the
charter's 5 values with their full text:

- parents-steer
- struggle-not-pressure
- credited-content
- learner-private
- brain-first

Ask the brain for the owner's own words on why Jadwigo exists:
`md context ask "why does the family build Jadwigo" --project jadwigo-marketing`.

## The input, as 4 kinds of statement

Upstream's questionnaire (name, story, audience, competitors, values, personality sliders, goals)
is replaced by a table you fill from the brain. For each row say which kind of statement it is:
supplied fact with its citation, researched evidence with its source, assumption, or blank.

| Upstream asked | Where Jadwigo answers it |
| --- | --- |
| the name and its story | the brief, section 5, and the patron decision |
| what it does | the brief, section 1 |
| why it was started | the owner's words, cited |
| the audience | the parent and the child, by decision |
| the problems it solves | the listening note, labelled proxy |
| the competitors | the positioning note |
| the values | the charter's 5 |
| the vision | the 3 options in the mission-and-value note |
| the personality sliders, the goals, the tagline | blank, unless a decision holds them |

A blank row stays blank in the note and becomes an `owner_decisions` question.

## 1. Vision

The future Jadwigo wants to exist. Upstream's frame is "To become [X], built on [Y], [Z] and
[W]", 2 or 3 sentences, ambitious and grounded. Take the 3 vision options the mission-and-value
note already offers. For each, write it out in the frame, in Polish first and English after, and
say what it implies. Add a 4th only if the brain holds the owner's words that none of the 3
carries, and cite them. End each with its 4 one-word pillars.

## 2. Mission

How Jadwigo delivers on the vision every day, 2 or 3 sentences, more operational than the vision.
Same method: the 3 mission options already on the table, written out and paired with the vision
they fit, with pillars. The decision on copy applies here too: a parent should be able to say
what the system does from the mission alone. "Lessons that remember" is the slogan that failed
that test.

## 3. Values

The 5 charter values, in the order above. For each:

- **The name** in Polish and English.
- **What it means for Jadwigo**, 2 sentences from the charter's own text, not generic.
- **We do**: 1 or 2 behaviours a parent or a child can see in the product today, each one true of
  the code or a decision in force. Nothing aspirational.
- **We never**: 1 or 2 boundaries, drawn from the charter's own "never" clauses (no scores, clocks,
  streaks, points, leaderboards, penalties or loss framing; a child never logs in; no other
  family ever sees a learner's data; a question always shows where it comes from).

Do not add a 6th value. If the material suggests one, it goes to `owner_decisions` as a question.

## 4. What stays open

A list of every blank from the input table, 1 line each, with the options the evidence allows.
Upstream's goals, personality, voice, competitor analysis, positioning and tagline sections are
not written here: the goals are the owner's, the voice is `mk-voice`, the competitors and the
positioning are `mk-position`, and Jadwigo does not want a tagline (the decision on copy).

## Tone

Upstream's tone guidance holds: calm authority, no "in conclusion", no "the brand believes", no
hollow adjectives. Name Jadwigo, not "the brand". Every sentence earns its place.

## Write the note

`docs/research/jadwigo-foundation.md`, in the shape the shared rules give in section 7. The
outcome block's `owner_decisions` carries the mission and vision picks (the options from
`dl-w0b4.49`, reworded by nobody, plus any you added with a citation), each value's "we do" and
"we never" lines as options if more than 1 reading of the charter is possible, and every blank
from section 4. No pick anywhere.

```bash
bun tools/src/check-research.ts docs/research/jadwigo-foundation.md --issue <id>
md prose slop docs/research/jadwigo-foundation.md --findings --baseline
```

Run `/human-voice` on the note, and stop. The charter rewrite that follows the owner's pick is
`dl-w0b4.50`, not this command.
