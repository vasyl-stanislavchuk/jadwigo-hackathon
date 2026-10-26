# learner-experience

**Goal.** A child moves through every lesson in one smooth, joyful screen on a phone or a laptop. Every question type is tuned in the playground and signed off before it reaches the free tier.

- **md context project:** `jadwigo-learner-experience`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-learner-experience`).
- **Scope epics:** `dl-uukj`, `dl-w3`, `dl-7wlo`, label `project:jadwigo-learner-experience`, on the shared david-learns tracker.

## Directories it owns

- `apps/web/`
- `packages/lesson-kit/`
- `packages/ui/`
- `packages/copy/`

The labeler (`.github/labeler.yml`) puts the `ws:learner-experience` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/web --filter=./packages/lesson-kit --filter=./packages/ui --filter=./packages/copy`.
