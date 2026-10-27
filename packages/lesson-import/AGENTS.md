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
- Ids are named under the pod's uuid: `lesson/<file id>`, `question/<file id>/<step id>/<content hash>` (a twin's step id ends `t`), `assignment/<file id>`. The featured pod is `pod/jadwigo` under `IMPORT_NAMESPACE` in `src/ids.ts`, which never changes. The playground computes a featured assignment's id the same way (`featuredAssignmentId`).
- Skill ids are mapped into the contract's `SkillId` (`skillIdOf`), because the playground names some by brain page (`curriculum/math/...`) and one in Polish (`l-ł`). Two ids that map to one fail the import (the lead's call on `dl-e8ov.2.32.5`, until the bank's skill ids settle).
- The fixtures in `packages/testing/src/lessons/` are exported by david-learns `frontend/src/playground/sim/exportLessonFiles.ts`, never edited by hand. `bun run seed` imports them through `createPostgresStore`.
