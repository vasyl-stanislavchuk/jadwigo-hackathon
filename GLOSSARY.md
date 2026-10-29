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
| **lesson version** | one published form of a lesson: the lesson questions it plans, in `position` order, and the spares growth may draw. Never changes | an edit in place |
| **lesson question** | one question a lesson can ask: its family, what the page shows, the key and the help. Written once; an edit makes a new one | a step, an item, a task |
| **lesson script** | the playground's authoring file for a lesson. Its import turns it into lesson questions and a version | the stored lesson |
| **assignment** | a lesson sent to an audience, with its growth settings. A featured lesson is an assignment to anyone | a homework task |
| **block** | one interaction inside a lesson, from an interaction family in `packages/lesson-kit` | a UI component |
| **attempt** | one play of one lesson version: in progress, paused or finished | a session |
| **attempt question** | one asking of a lesson question in one attempt, at its `seq`: why it was asked (`added`, `placed`), the help released, how it ended (`correct`, `skipped`, or `missed` when verdicts are held) | the lesson question itself |
| **attempt answer** | one try at an attempt question, or a skip. Never changed | a "response" |
| **try** | one committed answer to one attempt question, counted by `try_no` | an attempt |
| **missed** | how an attempt question ends after one wrong try while its assignment holds verdicts: there is no 2nd try, so the child can't tell a miss from a right answer until the attempt finishes. Never used in practice | "wrong", "failed" |
| **help** | the ladder a lesson question carries (look, boost, almost, worked, and Khan's cards in `help.hints[]`), released one rung at a time | "hint", outside `help.hints[]` |
| **correct** | the verdict on a try, and how an attempt question ends | "right" |
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
| **steward** | md's `merge-steward` persona: reviews each ready PR, posts `review-ok`, reruns flakes, sends red CI back, reverts a broken `main` |
| **fence** | a rule enforced by code (a hook, a lint, a test, CI), listed in `AGENTS.md` |
| **guard** | `.claude/hooks/guard.ts`, the fence that judges every tool call |
| **workflow** | a product AI workflow: what Jadwigo's AI does for a parent, such as composing a lesson. Lives in `workflows/`, named `/jadwigo-<record>-<verb>`. Never called a "skill" |
| **dev command** | instructions for an agent building this repo, such as writing a PR body. Lives in `.agents/skills/`, named `/dev-<verb>`. Never shipped to a parent |
| **drop** | a small published site that explains a design or a result, sourced in `docs/drops/<folder>/` |
| **worklog** | notes a running epic needs between sessions, deleted when it closes |
| **stop note** | 4 lines appended to an issue when a session stops short: what was asked, what was done, the exact error, what to try next |
| **owner** | the person who decides product questions, runs paid and outward steps, and deploys |

## The design system

| Word | Means | Not |
| --- | --- | --- |
| **Zeszyt** | the one look of the app: white exercise-book paper, blue ink for the one thing to press, the teacher's green and red pen, Andika. Its tokens are `packages/ui/src/styles/foundation.css`; `/playground/system` is the reference | a theme among several (the theme lab went on 2026-10-25) |
| **Grape** | the purple Material 3 palette of 2026-10-06, superseded by Zeszyt on 2026-10-26. Retired; the name survives only in history | a colour any screen may wear |
| **token** | one named value of the design system, a CSS custom property: a primitive (`--jw-p-ink-600`, the only literal colours), a role, or an alias | a Tailwind class |
| **role** | a token named for what it means on screen: `--jw-act`, `--jw-pick`, `--jw-miss-edge`, `--jw-size-body`. Set once by day and once by night | a colour named for its hue |
| **alias** | the shadcn and `--kid-*` names the parts already read (`--primary`, `--kid-correct`), each valued from one role | a second palette |
| **utility** | the Tailwind class a component writes for a token: `bg-jw-act`, `text-jw-body`, `min-h-kid-tap` (`tailwind.css` `@theme inline`). A `var()` written in a class is a violation | an arbitrary value |
| **act** | the action role: the one thing to press now, blue ink on its pressed edge; quiet paper until there is an answer to check | any button |
| **pick** | what the child chose, not yet judged: its own clear blue, colour only, never size | right or wrong |
| **band** | the footer after a check, at the footer's own height: right, a miss, or the solution | a toast |
| **help ladder** | the rungs a question carries (look, boost, almost, worked), one released at a time, in help's warm yellow, never a verdict's colour | a hint box |
| **lesson surface** | anything under `[data-lesson-theme]`: a lesson, a review step, a playground cell. Lesson behaviour rules (the pressed edge, the band, the fields) apply only here | the whole page: tokens apply everywhere, behaviour only on a lesson surface |
| **tool surface** | the playground's own chrome under `html[data-playground]`: neutral grey shadcn, so the lesson inside it is the only coloured thing | a learner screen |
| **app page** | a non-lesson screen (the parent's, the home list): Zeszyt on white paper at the app-page register (h1 `--jw-size-prompt`, body `--jw-size-body`, controls 48) | a lesson surface |

## Merge danger

| Word | Means |
| --- | --- |
| **two-way door** | a change that is cheap to reverse: revert the squash commit and nothing is lost |
| **one-way door** | a change a revert doesn't undo: a migration, a contract snapshot, deleted or exported learner data, IAM, anything sent outward. `AGENTS.md` lists them |
| **blast radius** | what breaks if the change is wrong, in one word or a short phrase: "player layout", "every API consumer" |
