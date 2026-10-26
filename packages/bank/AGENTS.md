# packages/bank

Code for the question bank: read, search, import. The bank itself never enters git.

- **Not here:** Questions, Khan items, media, SQLite files (`tools/src/check-no-bank.ts` fails them).
- **Owner:** the question-bank workstream (`docs/workstreams/question-bank.md`). **Filled by:** `dl-n9fr.1` to `dl-n9fr.7`.
- **Imports:** `contracts`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/bank`

## Rules here

- Sources are `fixture`, `local` or `remote` (`JADWIGO_BANK`); local data lives in `JADWIGO_BANK_DIR`, outside the repo.
- Test doubles will live at `@jadwigo/bank/testing`, which only tests may import (dependency-cruiser holds it).
