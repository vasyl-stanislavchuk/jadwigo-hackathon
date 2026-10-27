# question-bank

**Goal.** An agent sends a need and gets back fitting, credited question sets for the first school grades in Polish and English. Every change to search is measured on golden sets before it ships. The bank itself never enters git.

- **md context project:** `jadwigo-question-bank`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-question-bank`).
- **Scope epics:** `dl-n9fr`, `dl-r772`, label `project:jadwigo-question-bank`, on the shared david-learns tracker.
- **Builds in:** this repo (`packages/bank`). The Khan pipeline (Python, `scripts/khan`) keeps running in david-learns until an issue gives it a home. The bank's pages never enter this repo.

## Directories it owns

- `packages/bank/`

The labeler (`.github/labeler.yml`) puts the `ws:question-bank` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./packages/bank`.

## Done at the next milestone

Milestone 2, goals loop (the order is in `docs/README.md`). An agent sends a need and gets back fitting, credited question sets, and every change to search is measured on the golden sets.

## Meets

- **learner-knowledge:** lessons come from the bank and a child's own mistakes.
- **ai-workflows:** `jw question` and the workflows that compose lessons.
- **platform:** the bank routes in `apps/api`.

## Decisions that shape it

- `david-learns/decisions/2026-10-24-the-question-bank-is-never-committed-to-the-jadwigo-repo`: the bank is never committed; tests reach a fixture, local or remote bank
- `jadwigo-question-bank/decisions/2026-10-27-the-question-bank-lives-in-its-own-private-repo-separate-from-th`: the bank lives in its own private repo, and S3 serves a copy
- `jadwigo-question-bank/decisions/2026-10-27-khan-academy-items-carry-cc-by-nc-sa-4-0-named-on-every-page-wit`: Khan items carry CC BY-NC-SA 4.0
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-question-bank/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-n9fr.20, .12, .8, dl-r772.32, .33, dl-e8ov.5.18, .5.20, .5.28` (deferred until the bank's first build wave): the index grain, AI-written questions, golden sets, reviewers, read and write access, the OpenAI and Voyage setup
- `dl-liwi.21` (deferred): Alfik images on S3
- `dl-n9fr.30` (open): where the Khan pipeline (`scripts/khan`) runs once david-learns stops
