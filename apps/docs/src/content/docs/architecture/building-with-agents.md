---
title: Building with agents
description: Many agents build this repo at once, each in its own worktree. Beads brief them, fences check them, and a merge steward reviews them.
---

This page is for a judge who wants to see how Jadwigo itself was built: by AI agents, in
parallel, under checks a person set.

Work lives on 1 beads board. An issue is a brief. It names what to read, the paths it owns, the
tests that stay frozen, what to do, what done looks like, and when to stop. Big changes ship as
waves. A lead writes the wave plan and lands step 0 alone: the plan, the contract changes, and
the shared stubs. Lanes then build in parallel, 1 `md` worktree per lane, each on its own branch.
A lane owns its paths and nothing else. A gap in a contract is a message to the lead, never an
edit.

Every lane opens a draft pull request against `main`. Going ready starts the review. When
`ci-ok` is green, md's merge steward runs fresh reviewers on the PR and posts `review-ok`. GitHub
merges once both are green, by squash. The steward fixes only mechanical failures itself, such as
a flaky job or a stale branch. Anything else goes back to the PR's author. The builder never
reviews its own work: a lane reporting green is a claim, and a reviewer's re-run is the evidence.

Fences hold the line between reviews. A guard refuses force-pushes, pushes to `main`, and
deploys. Strict TypeScript brands every id. Biome errors on `any` and on skipped tests.
Dependency rules keep packages from importing apps. Contract snapshots fail on drift. Unit tests
fail on a network call. Each fence has a test that plants a violation to prove it still bites.

This epic's lanes run on the Muse CLI, model `muse-wonder-full-1.0`. Paid and outward steps stay
the owner's: `terraform apply`, a deploy, a publish. A merge deploys nothing.

## Next

- [The story](/story/): the decisions those agents worked under.
- [Monorepo](/architecture/monorepo/): the layout the lanes share.
