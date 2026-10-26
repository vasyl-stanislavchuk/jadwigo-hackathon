# marketing

**Goal.** Families find Jadwigo and want to try it: a marketing vision and go-to-market path, landing pages at jadwigo.pl and jadwigo.kids, social accounts, an illustration style and copy.

- **md context project:** `jadwigo-marketing`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-marketing`).
- **Scope epics:** `dl-w0b4`, label `project:jadwigo-marketing`, on the shared david-learns tracker.

## Directories it owns

- `apps/site/`

The labeler (`.github/labeler.yml`) puts the `ws:marketing` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/site`.
