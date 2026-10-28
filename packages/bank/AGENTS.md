# packages/bank

Code for the question bank: read, search, import. The bank itself never enters git.

- **Not here:** Questions, Khan items, media, SQLite files (`tools/src/check-no-bank.ts` fails them).
- **Owner:** the question-bank workstream (`docs/workstreams/question-bank.md`). **Filled by:** `dl-n9fr.1` to `dl-n9fr.7`.
- **Imports:** `contracts`, and `api-client` for `apiUrl` only (the lead's call, `dl-n9fr.2`).
- **Public surface:** `src/index.ts`, and `src/testing.ts` as `@jadwigo/bank/testing`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/bank`

## Rules here

- Profiles are `fixture` (made-up sets in memory) and `api` (`POST /api/v1/question-searches`), named by `JADWIGO_BANK`. `local` and `remote` are served by the Python service in `jadwigo-bank`, not built here (`docs/research/bank-into-the-monorepo.md`).
- Every answer goes through `publicEnvelope` (`src/envelope.ts`): a row carrying a private body is dropped, a field the envelope does not name is stripped.
- The doubles live at `@jadwigo/bank/testing`, which only tests may import (dependency-cruiser holds it): `fakeBank`, `emptyBank`, `bankThatAbstains`, `degradedRerank`, `bankThatTimesOut`, `keyLeakAttempt`.
