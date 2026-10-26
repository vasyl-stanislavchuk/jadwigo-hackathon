# question-bank

**Goal.** An agent sends a need and gets back fitting, credited question sets for the first school grades in Polish and English. Every change to search is measured on golden sets before it ships. The bank itself never enters git.

- **md context project:** `jadwigo-question-bank`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-question-bank`).
- **Scope epics:** `dl-n9fr`, `dl-r772`, label `project:jadwigo-question-bank`, on the shared david-learns tracker.

## Directories it owns

- `packages/bank/`

The labeler (`.github/labeler.yml`) puts the `ws:question-bank` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./packages/bank`.
