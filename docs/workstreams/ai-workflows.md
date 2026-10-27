# ai-workflows

**Goal.** A parent's request goes from an AI workflow through MCP calls to an outcome, with the human in charge at every step, and evals on Meta's models show which journeys turn into real outcomes.

- **md context project:** `jadwigo-ai-workflows`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-ai-workflows`).
- **Scope epics:** `dl-hin8`, `dl-u1y5`, label `project:jadwigo-ai-workflows`, on the shared david-learns tracker.
- **Builds in:** this repo (`apps/cli` for `jw`, and `workflows/` for the product AI workflows).

## Directories it owns

- `apps/cli/`
- `workflows/`

The labeler (`.github/labeler.yml`) puts the `ws:ai-workflows` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/cli`.
- The CLI on its own: `cd apps/cli && uv run pytest`.

## Done at the next milestone

Milestone 4, hackathon (the order is in `docs/README.md`). A judge plays without installing anything, and a parent's request goes from a workflow through `jw` and MCP calls to a lesson, with the human in charge at every step.

## Meets

- **platform:** `packages/api-client` under `jw`.
- **question-bank:** `jw question` verbs.
- **learner-knowledge:** the knowledge base a workflow reads.

## Decisions that shape it

- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-ai-workflows/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-hin8.3, dl-hin8.4, dl-hin8.10, dl-u1y5.8` (deferred until `jw` and the first workflow are built): what a parent's own agent may write, what enters a learner's record, missing reviewed material, the lesson-block words
