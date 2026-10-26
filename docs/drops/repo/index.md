:::meta
eyebrow: Jadwigo · the repo
subtitle: The monorepo as built: what each folder is for, how a swarm of agents works in it, and where PRs, drops, research and handoffs go.
by: the jadwigo lead session
when: 2026-10-26T20:00:00Z
tile: Gate | ci-ok | teal
tile: Workflows | 3 | good
tile: Repo checks | 6 | good
:::

# The jadwigo repo: where things live and how agents work in it

## TL;DR

- **Every folder says what it is for.** The root `AGENTS.md` has a layout table, and each app and package has a short `AGENTS.md` of its own: its purpose, what does not belong there, what it imports, how to test it. More on [Where things live](layout.html).
- **One issue, one PR, one squash.** An agent claims an issue and branches from `main`. The agent opens a draft PR titled with the issue id and turns on auto-merge, and GitHub merges once `ci-ok` is green. More on [How agents work](agents.html).
- **Swarms run as waves of lanes.** A lead lands the contracts first. Each lane owns its own paths and works through its queue in its own worktree, and the builder never reviews its own work.
- **Agents know when to stop.** Repeated failures with no new information, a file outside the lane, an ambiguous contract or someone else's failing test all end in a short handoff and a status word.
- **PR bodies show rather than tell.** `/jadwigo-pr` writes a small visual, a before and after, and whether the change is a one-way or a two-way door. CI checks the shape. More on [PRs, drops and docs](conventions.html).
- **Drops live in the repo from now on.** Each one is a folder in `docs/drops/`, checked in CI and by `md drops check`, and published from `main` once the owner says yes.

## Pages

:::table The pages of this drop
| Page | What it answers |
| --- | --- |
| [Where things live](layout.html) | what each folder is for, what it may import, which workstream owns it |
| [How agents work](agents.html) | the issue loop, lanes and waves, when to stop, what is the owner's |
| [PRs, drops and docs](conventions.html) | the PR shape, one-way doors, the workflows, and the homes for drops, research, runbooks and handoffs |
:::

## Done when

- A fresh agent session, given only an issue id, finds its files, its rules, its tests and its stopping point from `AGENTS.md` and the nearest package `AGENTS.md`.
- Every PR body has a Summary, Evidence and a door, and CI fails one that doesn't.
- A new drop, research note or handoff has one place to go, and a check that holds it.
