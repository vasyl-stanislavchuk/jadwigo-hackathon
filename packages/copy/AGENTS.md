# packages/copy

Every string a person reads, in `pl` and `en`, with plurals and a reviewed flag.

- **Not here:** Strings that only a developer reads, such as log lines.
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). **Filled by:** `dl-5ssh.34.22` adds the plural, key, review and literal checks.
- **Imports:** nothing of ours.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/copy`

## Rules here

- Both locales have the same keys; the test fails a missing one.
- Polish plurals have 3 forms, so never branch on `count === 1`. The plural helper comes with `dl-5ssh.34.22`.
