# packages/lesson-import

Turns a playground lesson file into lesson questions, a published lesson version and a featured
assignment, written through the `Store`.

- **Not here:** The lesson files themselves (david-learns exports them), judging (`packages/core`), SQL (`packages/store`).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-e8ov.2.32.5`.
- **Imports:** `contracts`, `store`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/lesson-import`

## Rules here

- Ids are uuid v5 of (pod, lesson file id[, position]), so importing a file twice hits the same rows, and a new version comes only when a content hash changes (decision `2026-10-27-jadwigo-ids-are-uuid-v4-in-the-database-written-as-a-prefix-and`).
- can_do lines and a question's reason are dropped (decision `2026-10-27-the-v0-attempt-rules-questions-only-on-the-wire-the-api-v1-route`).
- No family member's name: the lesson sources carry one in a header comment, and the JSON export drops comments.
- `knip.json` ignores this package's dependencies until `dl-e8ov.2.32.5` uses them; that issue removes the line.
