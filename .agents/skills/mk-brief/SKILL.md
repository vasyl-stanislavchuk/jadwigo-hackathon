---
name: mk-brief
description: "Use when a marketing stage needs the Jadwigo brief, the one context every other mk-* command reads: what Jadwigo is and does today, who decides and who studies, what is decided (cited by decision slug), what is open (each owner pick by issue id), the story seeds the owner already gave, and what is not known yet. Assembles it from the md context brain and the research notes, never from an interview, and writes docs/research/jadwigo-brief.md. Run it first, and again when a sitting has decided something."
---

<!-- Vendored from coreyhaines31/marketingskills@0cd9b3a skills/product-marketing (MIT, see LICENSE and CREDITS.md).
     Changed here: the brief is assembled from the brain, not from an interview or the codebase; it is a research
     note in docs/research/, not a .agents/product-marketing.md document; the sections are Jadwigo's. -->

# The Jadwigo brief

You assemble the one context every other marketing command reads. Upstream calls this the
product marketing context and builds it by asking the user questions or reading the codebase.
Jadwigo already holds the answers in its brain and its research notes, so your job is to collect
them, cite each one, and say plainly what is not known. You add no claim of your own.

## Before you start

Read `.agents/skills/_shared/jadwigo-rules.md` and follow its section 1, "Read the brain first",
in full. For the brief, that means:

- `md context ask` for each of the 6 sections below, in the brain's own vocabulary ("who decides",
  "first audience", "lead message", "mission", "look", "name story").
- every page in `~/projects/medallion-context/jadwigo-marketing/decisions/`
- the charter's 5 values and its 4 standing questions
- `docs/research/jadwigo-go-to-market.md`, `jadwigo-mission-and-value.md`, `jadwigo-identity.md`,
  and the identity drop's source in `docs/drops/identity/`
- the open owner picks: `bd -C ~/projects/david-learns/.beads list --label project:jadwigo-marketing --label needs-owner`

If `docs/research/jadwigo-brief.md` already exists, you are updating it. Read it, keep what still
holds, change what a decision moved, and say in the method what changed and why.

## What the brief holds

Each section separates supplied facts from assumptions, as the shared rules require. A section
with nothing to say stays short and says so.

### 1. What Jadwigo is and does today

- One line a parent could repeat: what the system does, no slogan.
- What it does in 3 to 5 sentences: the lesson a parent opens, what Jadwigo records after it
  (what went well, where the child struggled, which mistakes), and how the next lesson is built
  from that. Use the owner's own wording where a decision holds it.
- The shelf it sits on: how a Polish parent would search for it, and what they would compare it
  with (tutors, workbooks, Squla, doing nothing).
- The business model as decided, and "not decided" where it is not.

### 2. Who decides and who studies

- The parent: holds the account, opens the lessons, sets goals, decides whether to pay.
- The child: studies, in grades 1 to 3.
- What each one worries about, taken from the research notes with their sources, not inferred.
- Jobs to be done, functional and emotional, for each, only where a note or a decision supports it.

No invented names, ages, incomes or cities. Upstream's B2B persona table does not apply.

### 3. What is decided

A table, one row per decision in force: the slug, one line of what it settled, and the issue it
was carried out in. Include the values from the charter as 5 rows at the top.

### 4. What is open

A table, one row per owner pick still waiting, by issue id (`dl-w0b4.29`, `.30`, `.35`, `.36`,
`.37`, `.38`, `.41`, `.49` at the time of writing, and whatever `bd list` shows now): the
question, the options already on the table, and the research note that offered them. Reword no
option.

### 5. Story seeds

What the owner has already said that a story could grow from, quoted and cited: why the family
builds it, the rings (the child, the class, the school), the patron Queen Jadwiga and the facts
about her that are allowed, the "go" in the name. Only seeds the brain holds. No new ones.

### 6. Not known yet

Every question the other commands will need answered that nothing in the brain settles: what
parents say in their own words (proxy evidence is stage B), the first audience, the lead
message, the price, the first families. One line each. This list is what the stages after you
fill in.

Upstream's sections that do not apply here, and why: Proof Points (there are none yet, and a
blank stays blank), Objections (none heard), Paid Ads (none run), Learnings and Changelog (the
brain's decisions and this note's git history are the record), Brand Voice (that is `mk-voice`).

## Write the note

The note is `docs/research/jadwigo-brief.md`, in the shape `docs/research/README.md` gives and
the shared rules repeat in section 7. The question in the title is "What does every marketing
stage need to know about Jadwigo before it starts?". The method names each brain query you ran
and each page you read. The outcome block's `owner_decisions` holds every open pick from section
4 with its options and no pick, and its `proposed_issues` is empty unless you found work no issue
tracks.

Then:

```bash
bun tools/src/check-research.ts docs/research/jadwigo-brief.md --issue <id>
md prose slop docs/research/jadwigo-brief.md --findings --baseline
```

Run `/human-voice` on the note, and stop. Adding the brief page to the foundation drop is the
stage issue's call, through `/dev-drop`.
