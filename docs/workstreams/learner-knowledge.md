# learner-knowledge

**Goal.** Jadwigo keeps a knowledge base that understands each child. Every lesson is prepared from it, and parents see their child grow from it.

- **md context project:** `jadwigo-learner-knowledge`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-learner-knowledge`).
- **Scope epics:** `dl-e8ov.5`, `dl-liwi`, `dl-r77f`, `dl-e5c4`, label `project:jadwigo-learner-knowledge`, on the shared david-learns tracker.

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
