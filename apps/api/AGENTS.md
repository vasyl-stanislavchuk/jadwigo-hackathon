# apps/api

The one Lambda: a router, `authorize()` and the routes, with an entry per function.

- **Not here:** Business rules (they go in `packages/core`) and SQL (it goes behind `packages/store`).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-5ssh.2` deploys it; the routes come with their contracts.
- **Imports:** packages: `contracts`, `core`, `store`, `config`. Never another app.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./apps/api`

## Rules here

- Every route's input and output is a schema in `packages/contracts`; the handler parses, never trusts.
- `authorize()` runs first on every route, and a pod only ever sees its own records.
- `app.ts` runs each request as one `store.unit()`. A route goes on from the record `authorize()`
  read and the rows its writes return, and reads the attempt again only after a race or a replay
  (`src/roundtrips.int.test.ts` pins the round trips per request).
- Read environment variables only in `src/config.ts` (the grit rule fails elsewhere).
- `authorize()` (`src/authorize.ts`) binds an attempt to its caller by its id: whoever holds the attempt id may read and answer it, since only the start reply carries it (decision `2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho`). It is one narrow seam, so a token can replace the id later. An unknown id, or another pod's, is 404.
- The page reads `ended` through `pageEnded(ended, verdictsHeld(assignment, attempt))` in every reply (snapshot, answer, help, results), and the results route returns `pageAttemptResult` rows, never the `attempt_result` row. While verdicts are held, the answer reply's `correct`, `parts` and `reveal` are null.
- **Held verdicts give each question one try** (decision `2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a`). The course is this route's call, the database only refuses `missed` outside it:

  ```text
  POST /api/v1/attempts/{id}/answers, a try judged by core
    verdictsHeld(assignment, attempt)?
      no  (practice)  right -> end `correct`, ask the next question
                      wrong -> keep it open: the next try, the help ladder, Not sure yet's twin
      yes (a check)   right -> end `correct`, ask the next question
                      wrong -> end `missed`,  ask the next question     <- no 2nd try, no help after it
    the reply: ended through pageEnded (`done` while held), correct/parts/reveal null while held
  ```

  Help asked for before answering, and Not sure yet, work the same held or not. A miss must never
  change what the page shows next: the same `done`, the same next question.
- The course (what is asked next, the growth rules) is `src/course.ts`, pure, and the server never asks an explain question in v0 (decision `2026-10-28-in-v0-the-server-never-asks-an-explain-question-a-lesson-plays-i`).
- The route suite is `src/testing/routes.suite.ts`: `src/routes.test.ts` runs it on InMemoryStore, `src/routes.int.test.ts` on PostgresStore. `bun run dev` serves the routes on this machine.
