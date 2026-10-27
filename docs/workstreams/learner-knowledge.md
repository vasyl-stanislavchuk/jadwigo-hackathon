# learner-knowledge

**Goal.** Jadwigo keeps a knowledge base that understands each child. Every lesson is prepared from it, and parents see their child grow from it.

- **md context project:** `jadwigo-learner-knowledge`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-learner-knowledge`).
- **Scope epics:** `dl-e8ov.5`, `dl-liwi`, `dl-r77f`, `dl-e5c4`, label `project:jadwigo-learner-knowledge`, on the shared david-learns tracker.
- **Builds in:** this repo (`packages/core`).

## Directories it owns

- `packages/core/`

The labeler (`.github/labeler.yml`) puts the `ws:learner-knowledge` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./packages/core`.

## Done at the next milestone

Milestone 2, goals loop, then 3, parent login (the order is in `docs/README.md`). Lessons come from the bank and the child's own mistakes, and mastery in `packages/core` moves with each attempt. At parent login, a parent's account keeps the child's answers and knowledge base.

## Meets

- **question-bank:** the questions a lesson is composed from.
- **platform:** the records in `packages/store`.
- **learner-experience:** the parent screens in `apps/web`.

## Decisions that shape it

- `jadwigo-learner-knowledge/decisions/2026-10-26-learner-knowledge-is-the-knowledge-base-that-understands-each-ch`: learner knowledge is the knowledge base that understands each child
- `jadwigo-learner-knowledge/decisions/2026-10-27-a-returning-learner-continues-the-unfinished-lesson-first-a-newe`: a returning learner continues the unfinished lesson first
- `david-learns/decisions/2026-10-26-only-the-playground-matters-the-django-and-python-lesson-backend`: only the playground matters: the Python lesson path is thrown away, so ports start from the playground's TypeScript
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-learner-knowledge/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-e8ov.2.30, dl-e8ov.5.19, dl-e8ov.5.31, dl-r772.17` (deferred until their build starts): interest notes in S3, homework text in search queries, the name of the record that sends a lesson, when a spelling skill is Proficient
