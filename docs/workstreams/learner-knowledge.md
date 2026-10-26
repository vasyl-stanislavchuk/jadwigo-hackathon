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
