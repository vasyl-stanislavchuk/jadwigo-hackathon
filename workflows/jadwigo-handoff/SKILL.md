---
name: jadwigo-handoff
description: "Use when work in the jadwigo repo moves to a fresh session: the owner asks for a handoff or a prompt to run elsewhere, a lead briefs a lane, or a session ends with the issue unfinished. Writes docs/worklog/<epic>/<date>-handoff-<slug>.md with the outcome, what it must answer, what to read, the rules, done when, and a prompt ready to paste."
---

# /jadwigo-handoff

A handoff is the whole context the next session gets. Write it for a model that has read only
`AGENTS.md`, the issue and this note.

## Steps

1. Find the issue: `bd -C ~/projects/david-learns/.beads show <id>`. With no issue, file one
   first. A handoff always runs an issue.
2. Find the decisions in force: `md context ask "<the question>" --project jadwigo-platform`.
   Cite each one by slug, and quote the owner's own words where they set the outcome.
3. Write `docs/worklog/<epic>/<yyyy-mm-dd>-handoff-<slug>.md`, where `<epic>` is the issue's
   epic. The first line names the epic (`tools/src/check-worklog.ts` checks it):

```markdown
# <epic>: handoff: <the outcome, in a few words>

Written <yyyy-mm-dd> for issue `<id>`.

## Outcome

<the owner's words, quoted, and the decision slug>. Done means:

- <a result someone can check>

## What it must answer

1. <each question the work must settle; an owner question is marked "owner: options, no pick">

## Read first

<files, commands' --help, workstream page, the nearest AGENTS.md>

## Rules

<what is off limits; which steps are the owner's; "agents you launch run on Opus">

## Done when

- <each check, as a command and what it shows>

## The prompt

    Run issue <id> in <repo path>: read <this file's path> in full and follow it. <one sentence
    on the outcome>.
```

4. Record it on the issue: `bd update <id> --append-notes "handoff: <path>"`.
5. Commit the note on your branch and say where it is. The owner pastes the prompt into the new
   session.

## Rules

- Describe the outcome, not the steps. Name the files, never paste them.
- Leave out calendar dates and estimates. Order the work by what blocks what.
- A question that belongs to the owner stays open, with its options laid out.
- No names of family members or real learner data. Use the roles and ids from `GLOSSARY.md`.
