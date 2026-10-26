:::meta
eyebrow: Jadwigo · the repo
subtitle: The working loop every agent follows, from david-learns' lessons: briefs, lanes, stop conditions, handoffs, and what stays with the owner.
by: the jadwigo lead session
when: 2026-10-26T20:00:00Z
:::

# How agents work

## Start here

An agent reads, in this order: the root `AGENTS.md`, the `AGENTS.md` nearest to its files, its issue, and the workstream page. Words it doesn't know are in `GLOSSARY.md`. A decision the docs leave open is a question for the md context brain, and never a guess.

## One issue, start to finish

An issue is a brief, with these parts: **Read**, **Owns**, **Frozen**, **Do**, **Done when** and **Stop if**.

:::table The loop
| Step | Command |
| --- | --- |
| Claim | `bd update <id> --claim` |
| Branch | `git switch -c <lane>/<id> origin/main` |
| Check | `make check`, then each "done when" check, keeping its real output |
| Open | a draft PR titled `<id>: <what>`, with a body from `/jadwigo-pr` |
| Land | `gh pr ready`, then `gh pr merge --auto --squash` |
| Close | `bd close <id> --reason "<what ran, what did not>"` |
:::

One issue is one deliverable. Work found along the way becomes a new issue linked with `discovered-from`, never part of the same PR.

## Lanes and waves

- **Step 0 is the lead's.** One PR carries the wave plan, the contract changes and the shared stubs. Lanes build against it and never edit a contract.
- **A lane owns its paths and nothing else.** A shared fixture, a dependency or another lane's file is a request to the lead.
- **One worktree per lane.** Inside a lane, agents work in parallel only on disjoint files.
- **The whole queue at once.** The lead hands a lane its full queue and waits for an acknowledgement.
- **The builder never reviews its own work.** A lane reporting green is a claim, and the reviewer's re-run is the evidence.

:::aside
These rules come from what failed in david-learns: lanes that edited contracts, lanes that closed issues with lint errors, and lane branches that reached `main` without CI. Where a rule could become code, it did. The Stop hook runs `make check`, the guard denies pushes to `main`, and the ruleset accepts only squash merges after `ci-ok`.
:::

## When to stop

An agent stops and hands off on any of these:

- the same step failing again and again with no new information
- a "done when" that needs a file outside the lane
- an ambiguous contract
- a failing test it didn't write
- a migration, paid call or publish the issue didn't name

The handoff is a short note on the issue: what was asked, what was done, the exact command and error, and what to try next. The session ends with `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_DECISIONS` or `BLOCKED`.

## What stays with the owner

- **Product questions.** They are asked with options and never a pick.
- **Paid, careful and outward steps.** That means applies, deploys, publishes and mail. The agent writes the script and the owner runs it.

The board is the agents' to keep current: they file, update and close issues without asking.
