# Glossary

The words this repo uses in one sense only. Code, docs, PR bodies and issues use them this way.
When a word here clashes with an outside meaning (Khan's "lesson", Claude Code's "skill"), ours wins
inside the repo, and the outside sense gets a qualifier.

## The product

| Word | Means | Not |
| --- | --- | --- |
| **pod** | the people who learn and teach together: a family, an adult learning alone, a tutor's students. The privacy boundary: nothing crosses pods | "family", which breaks once a tutor joins |
| **member** | one account in one pod, with a role: `parent`, or `self` for an adult learning alone | a learner |
| **learner** | someone who plays lessons. A learner id is `lrn_…`, never a name | a user account; a child needs none |
| **skill** | the smallest thing a learner gets a level on, such as `maths.mul.7x8`. Reviewed or draft | an AI workflow; a Khan exercise |
| **goal** | what a pod wants a learner to reach, made of skills | a curriculum |
| **lesson** | prepared content a pod publishes, with versions. A published version never changes | a Khan lesson page |
| **lesson script** | the steps of one lesson version, as `packages/contracts` defines them | |
| **block** | one interaction inside a lesson, from an interaction family in `packages/lesson-kit` | a UI component |
| **attempt** | one play of one lesson version: in progress, paused or finished | a session |
| **question bank** | the credited question sets lessons are composed from. Lives outside git | fixtures |
| **free tier** | anyone plays a featured lesson with no login | |

## How we build

| Word | Means |
| --- | --- |
| **issue** | one unit of work on the beads tracker, with Read, Owns, Frozen, Do, Done when, Stop if. It is the whole brief a fresh session gets. "Bead" means the same; "card" is not used |
| **epic** | an issue that groups others toward one goal, such as `dl-5ssh.34` |
| **workstream** | one md context project and the directories it owns (`docs/workstreams/`) |
| **wave** | one round of parallel work on an epic, planned in `docs/worklog/<epic>/<date>-wave-<n>.md` |
| **lane** | one agent's column in a wave: its worktree, its paths and its ordered queue of issues |
| **lead** | the session that plans a wave, lands step 0 and reviews. It builds no lane itself |
| **step 0** | the lead's first PR in a wave: the plan, contract changes and shared stubs |
| **frozen test** | a test a lane must make pass and may not edit |
| **steward** | the agent that keeps PRs moving: reruns flakes, sends red CI back, reverts a broken `main` |
| **fence** | a rule enforced by code (a hook, a lint, a test, CI), listed in `AGENTS.md` |
| **guard** | `.claude/hooks/guard.ts`, the fence that judges every tool call |
| **workflow** | a product AI workflow: what Jadwigo's AI does for a parent, such as composing a lesson. Lives in `workflows/`, named `/jadwigo-<record>-<verb>`. Never called a "skill" |
| **dev command** | instructions for an agent building this repo, such as writing a PR body. Lives in `.agents/skills/`, named `/dev-<verb>`. Never shipped to a parent |
| **drop** | a small published site that explains a design or a result, sourced in `docs/drops/<folder>/` |
| **worklog** | notes a running epic needs between sessions, deleted when it closes |
| **stop note** | 4 lines appended to an issue when a session stops short: what was asked, what was done, the exact error, what to try next |
| **owner** | the person who decides product questions, runs paid and outward steps, and deploys |

## Merge danger

| Word | Means |
| --- | --- |
| **two-way door** | a change that is cheap to reverse: revert the squash commit and nothing is lost |
| **one-way door** | a change a revert doesn't undo: a migration, a contract snapshot, deleted or exported learner data, IAM, anything sent outward. `AGENTS.md` lists them |
| **blast radius** | what breaks if the change is wrong, in one word or a short phrase: "player layout", "every API consumer" |
