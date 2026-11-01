# packages/jadwigo-ai

The Jadwigo AI engine: a parent's chat on the left becomes a lesson on the right, built PostHog's
way. A conversation holds runs, one per turn. A step is one Muse call and the lesson verbs it asks
for, and every effect is a run event the page folds into its 2 panes.

- **Not here:** The records (`@jadwigo/contracts/run`), the fold and the budget and deadline rules
  (`packages/core/src/run`), storage (`packages/store`), the page (`apps/web/src/playground/chat`).
- **Owner:** the ai-workflows workstream (`docs/workstreams/ai-workflows.md`). **Filled by:**
  `dl-z5ja.12` (step 0: the signatures, `src/scenarios.test.ts`), `dl-z5ja.15` (`src/muse`,
  `src/verbs`), `dl-z5ja.16` (`src/run`, `src/queue`).
- **Imports:** `contracts`, `core`, `store`, `lesson-import` (`check()` at
  `@jadwigo/lesson-import/check`). No package imports this one.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/jadwigo-ai`

## Rules here

- Read the wave plan first: `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`, Lead decisions 1-16.
  The research behind it is `docs/research/posthog-ai-runtime.md`, `ai-chat-engine.md` and
  `posthog-ai-production.md`.
- `src/scenarios.test.ts` is frozen: PostHog's production failures, one scenario each. A scenario
  waiting on lane code is named in its `EXPECTED_RED` and runs as `it.fails`. The lane that makes
  it pass removes the name. A gap in a scenario is a message to the lead.
- A verb takes who it acts for from `VerbContext`, which the runner builds from the run row. It
  never takes a pod, a learner or an owner from the model's arguments.
- The log is the draft. A verb reads the lesson from `VerbContext.lesson`, and one that changes it
  answers the whole file, which the runner writes as a `lesson_revision`.
- A redelivered step never pays twice and never writes twice. It reuses a recorded
  `model_response`, skips a tool whose `tool_result` exists, and every write is fenced on the
  run's `attempt`.
- What the dev page runs (`ScriptedMuse`, `fixtureBank`) lives outside `src/testing/`, which only
  test files may import.
- `HttpMuse` (`src/muse/http.ts`, `dl-z5ja.18`) is the one network call, to `/v1/responses`. It
  takes its `fetch` as a dependency, so unit tests run on recorded streams and never pay. Its live
  call is `src/muse/http.int.test.ts`, which the owner runs and which skips without `META_API_KEY`.
  A bank call (tag lane `bank`) passes the `jw.pii.guard` port (`src/muse/pii.ts`) before it leaves.
- A run sends the parent's own child's data to the model on purpose, names included, on any Meta
  model, the contributor model included. The `private` tier runs on the contributor model until
  a no-training model is named and priced. The name guard is kept for bank work only (owner
  decision of 2026-11-01, bead `dl-uafq`, `jadwigo-hackathon/notes/2026-11-01-a-learner-s-data-names-included-may-reach-any-meta-model-the-con`).
- Learner data reaches a prompt only through a verb that takes its pod from `VerbContext`. Text a
  child or a photo wrote goes inside the untrusted-content fence (`dl-z5ja.47`).
- Real learner data never goes into a fixture or a test, and nothing here writes a learner's
  record
  (`jadwigo-ai-workflows/decisions/2026-10-31-a-session-may-propose-notes-for-a-learner-s-record-at-its-end-an`).
- Nothing schedules a run
  (`jadwigo-ai-workflows/decisions/2026-10-31-a-report-runs-only-when-the-parent-asks-for-it-never-on-a-schedu`).
