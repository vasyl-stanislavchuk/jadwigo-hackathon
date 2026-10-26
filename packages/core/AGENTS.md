# packages/core

Pure logic: grading, numbers, mastery, scheduling.

- **Not here:** I/O of any kind: no network, no database, no clock you didn't pass in.
- **Owner:** the learner-knowledge workstream (`docs/workstreams/learner-knowledge.md`). **Filled by:** `dl-5ssh.34.5`, with the golden corpus from the Python tests.
- **Imports:** `contracts`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/core`

## Rules here

- Every function takes its inputs, including `now`, as arguments.
- Rules get a fast-check property test, not only examples.
- Grading per language lands in `src/lang/pl` and `src/lang/en` (`dl-5ssh.34.24`).
