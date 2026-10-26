# ai-workflows

**Goal.** A parent's request goes from an AI workflow through MCP calls to an outcome, with the human in charge at every step, and evals on Meta's models show which journeys turn into real outcomes.

- **md context project:** `jadwigo-ai-workflows`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-ai-workflows`).
- **Scope epics:** `dl-hin8`, `dl-u1y5`, label `project:jadwigo-ai-workflows`, on the shared david-learns tracker.

## Directories it owns

- `apps/cli/`
- `workflows/`

The labeler (`.github/labeler.yml`) puts the `ws:ai-workflows` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/cli`.
- The CLI on its own: `cd apps/cli && uv run pytest`.
