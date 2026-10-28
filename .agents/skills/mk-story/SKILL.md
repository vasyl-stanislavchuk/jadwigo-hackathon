---
name: mk-story
description: "Use when a marketing stage needs Jadwigo's story in 3 lengths: the O nas page, the homepage paragraph and the one-line origin, each in Polish first. Written from the owner's own words in the brain under the consent decision (the family's own story, including what the child finds hard, may be told; nobody else is named without consent) and the patron-only rule (Queen Jadwiga, never the school). Family names are placeholders the owner fills outside git. Writes a docs/research note whose owner questions list options and no pick."
---

<!-- Vendored from arnabbagxd/Brand-building-skills@4a0a8b5 skills/brand-story (MIT, see LICENSE and CREDITS.md).
     Changed here: the story's facts come from the brain, not a .agents/brand-context.md file or an interview; it is
     written under the consent and patron-only decisions, with name placeholders; Polish first; the output is a
     research note with options for the owner. -->

# The story: why Jadwigo exists

You find the human truth behind Jadwigo and tell it so a parent reading O nas thinks "this was
made for a family like mine". A brand story is not a company history. It names the problem the
founder could not ignore, the moment that turned it into action, and the promise the brand can be
held to. The family is the guide in this story, not the hero. The parent reading it is the hero.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md`, sections 3, 5 and 6 with care. Then read
`docs/research/jadwigo-brief.md` section 5 (the story seeds), `docs/research/jadwigo-identity.md`
sections 3 and 4 (the name story and the rings), `docs/research/jadwigo-foundation.md` if it
exists, and these decisions:

- the family shares its own story with consent, and others are named only after they consent
  ([[jadwigo-marketing/decisions/2026-10-27-the-family-shares-its-own-story-with-consent-and-others-are-name]])
- the jadwigo repo names only the patron, Queen Jadwiga, never the school
  ([[jadwigo-marketing/decisions/2026-10-27-the-jadwigo-repo-names-only-the-patron-queen-jadwiga-never-the-s]])
- jadwigo.pl will have an O nas story with the family's photos
  ([[jadwigo-marketing/decisions/2026-10-27-jadwigo-pl-will-have-an-o-nas-story-with-the-family-s-photos-why]])

Ask the brain for the owner's own words: `md context ask "why the family builds Jadwigo"
--project jadwigo-marketing` and `md context ask "the rings: the child, the class, the school"
--project jadwigo-marketing`. The story is built from quotes and facts the brain holds. Where
upstream would ask the founder a question, you list it under "Not known yet".

## The 6 things a story needs, and where Jadwigo's are

| Upstream asks for | Jadwigo's source | If missing |
| --- | --- | --- |
| the origin moment | the owner's words in the brain | an owner question, not a scene you invent |
| the founder's background | only what the owner has said publicly | leave it out |
| the belief | the charter's values, in the owner's words | cite the charter |
| the parent's truth | the listening note, labelled proxy | say "proxy" in the method |
| the promise | what the system does, from the brief | no promise the code does not keep |
| where Jadwigo is now | the brief, section 1 | plain facts, no milestones invented |

## What the story may and may not hold

- It may say what the family's child finds hard: the first 2 goals, basic multiplication and
  Polish spelling. The family consents to that here.
- It names nobody else: no teacher, classmate, other family or school. The name comes from "a
  school's patron, Queen Jadwiga", and the facts about her are the ones the patron decision
  allows (crowned "King" on 16 October 1384, the sale of her jewellery helped restore the Kraków
  Academy, canonised 8 June 1997, the footprint legend). No city, school name, URL or motto.
- No family member's name goes into the note. Write `[the child]`, `[the parent]` and
  `[the family]`, and say in the method that the owner fills them outside git.
- Whether a photo may show the school is `dl-w0b4.41`'s question. The story does not settle it.

## The 3 versions

Each in Polish first, then English. Each with its own arc.

### Version 1, the long story, for O nas

600 to 900 words in Polish. Open on a scene or a question, never on a founding year. Name the
problem with specificity: what homework looked like, what the apps did not do. The realisation:
what the family saw that the apps missed. The decision to build it. What makes Jadwigo different,
woven in, never a feature list. The parent reading it, made to feel seen. The commitment: what
Jadwigo promises to keep doing, in terms a parent can hold it to and the code already keeps.

### Version 2, the short story, for the homepage

150 to 200 words. Same arc, compressed.

### Version 3, the one-line origin

25 to 40 words a parent might hear the founder say. Upstream's frame: "Jadwigo started because
[the family] [noticed, lived through, refused to accept] [the problem], and believed [the
conviction]."

Write each version in 2 registers if the voice is not yet decided (`dl-w0b4.36`): once in the
calm-guide register and once in the kind-teacher register from the identity note. Each is an
option.

## Story principles, kept from upstream

Specificity wins. Name the villain (here, pressure dressed up as learning, and apps that keep a
child busy without teaching). The brand is the guide, not the hero. No founding year as the
opener. Earned confidence, not claimed greatness.

## Write the note

`docs/research/jadwigo-story.md`, in the shape the shared rules give in section 7. The outcome
block's `owner_decisions` carries: which register (feed `dl-w0b4.36`'s options, reword none),
which facts about the family the story keeps, where the named content and photos live
(`dl-w0b4.41`), and every "Not known yet" line from the table above. No pick anywhere.

```bash
bun tools/src/check-research.ts docs/research/jadwigo-story.md --issue <id>
md prose slop docs/research/jadwigo-story.md --findings --baseline
git diff --cached | grep -i "<any family name>"   # must print nothing before you commit
```

Run `/human-voice` on every version, and stop.
