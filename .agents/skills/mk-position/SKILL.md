---
name: mk-position
description: "Use when a marketing stage needs Jadwigo's positioning against what parents use today: maps the alternatives (tutors, workbooks, Squla and the other comparable products, and doing nothing), what each one claims and where it falls short in parents' own words, the territory nobody holds, 3 versions of 'For X, Jadwigo is the Y that Z because W', proof points cited to decisions or research, and what Jadwigo refuses to be, tied to the charter's values. Writes a docs/research note whose owner questions list options and no pick."
---

<!-- Vendored from arnabbagxd/Brand-building-skills@4a0a8b5 skills/brand-positioning and skills/competitor-branding (MIT, see
     LICENSE and CREDITS.md). Changed here: the 2 skills are 1 command; the alternatives include tutors, workbooks and doing
     nothing; the context comes from the brain and the research notes, not a .agents/brand-context.md file; every
     recommendation becomes options for the owner; the visual-identity sections are gone. -->

# Positioning: where Jadwigo sits among what parents use today

You find the clearest place Jadwigo can hold in a Polish parent's mind, and you describe it so the
owner can choose between versions. Positioning is being different in a way that matters to the
parent, not being better. A well-positioned Jadwigo is the obvious choice for a parent described
in 1 sentence, is impossible to confuse with the alternatives, and can say no to what is outside its
territory.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md`. Then read `docs/research/jadwigo-brief.md`,
`docs/research/jadwigo-listening.md` (the parents' words, labelled proxy) and
`docs/research/jadwigo-go-to-market.md` sections 1 and 2. The 8 comparable products and their
lead messages are already in section 1. Do not research them again; read their own sites and
store pages only to fill the profile fields below.

Everything you need to know about Jadwigo itself is in the brief and the decisions. Ask the
brain, not the user: `md context ask "what does Jadwigo refuse to do" --project jadwigo-marketing`.

## 1. The category, challenged

- **Stated category**: what Jadwigo would say it is.
- **Actual category**: what a parent compares it with when deciding. In grades 1 to 3 that
  includes a private tutor, a paper workbook (ćwiczenia), the school's own homework, Squla and the
  other apps, and doing nothing.
- **Possible categories**: 2 or 3 framings that would give Jadwigo more room, each with what it
  costs. These are options for the owner, not a recommendation.

## 2. The alternatives, profiled

For each alternative, including the 3 that are not apps (tutor, workbook, doing nothing):

- What it is, 1 sentence.
- What it claims, quoted from its own site or packaging where it has one.
- Who it speaks to.
- Its core message and tagline, quoted. Does it say what the product does, or is it a slogan?
- Where it falls short for parents, in the parents' own words from the listening note, labelled
  proxy. Where there is no quote, say "no parent quote found", never a guess.
- The territory it holds: the 1 idea it has claimed.
- Strengths, described fairly. A dismissive profile is a weak one.

## 3. The map

Pick 2 axes that separate the alternatives in a way a parent would feel, and say why those 2.
Describe in text where each alternative sits and where the open territory is. Then offer 1 or 2
other axis pairs that would tell a different story. Jadwigo's place on the map is a proposal.

## 4. What the category keeps saying

- The 3 or 4 claims almost every alternative makes ("free, no ads" is already one, go-to-market
  note section 1). These no longer set anything apart.
- The clichés to avoid, as exact phrases.
- What nobody is saying: 2 or 3 messages no alternative uses, each with the evidence that a parent
  would care (a quote from the listening note, or a decision in force).

## 5. The territory

- **The space**: the idea or feeling Jadwigo would hold, 1 sentence.
- **The parent it is the obvious choice for**: 1 sentence, specific.
- **Why it is hard to copy**: 2 or 3 sentences, resting on what the charter decides (parents
  steer, no pressure, credited sources, the parent owns the data) and on what the system does.

## 6. The positioning statement, in 3 versions

Use the frame "For [the parent], Jadwigo is the [category] that [what it does for them] because
[what makes it true]". Write 3 versions, in Polish first and English after each:

1. One that leads with the parent's worry (from the listening note).
2. One that leads with what the system does (the decision on copy saying what Jadwigo does).
3. One that leads with the values (no pressure, the parent in charge).

Each version is an option. Say what each one gives up. No version is marked as the one to pick.

## 7. Proof points

4 or 5 reasons a parent could believe the statement. Each one cites a decision slug or a research
note. A proof with no citation does not go in. There are no metrics yet, and the note says so.

## 8. What Jadwigo refuses to be

3 or 4 "not for us" lines, each tied to a charter value:

- "Jadwigo will never [X]" (struggle-not-pressure: no scores, clocks, streaks, points,
  leaderboards)
- "Jadwigo is not for a parent who wants [Y]"
- "Jadwigo does not try to be [Z]"

## 9. Red flags

Before you write the note, test every version against upstream's 4 flags and say which ones it
trips: a position any alternative could claim, a parent too broad to own, a differentiator that is
a table stake, a claim no proof point carries.

## Write the note

`docs/research/jadwigo-positioning.md`, in the shape the shared rules give in section 7. The
outcome block's `owner_decisions` includes at least: the category framing (options from section
1), the positioning version (the 3 from section 6), and the first audience if the evidence moved
it (that pick is `dl-w0b4.29`; add to its options, reword none). No pick anywhere.

```bash
bun tools/src/check-research.ts docs/research/jadwigo-positioning.md --issue <id>
md prose slop docs/research/jadwigo-positioning.md --findings --baseline
```

Run `/human-voice` on the note, and stop.
