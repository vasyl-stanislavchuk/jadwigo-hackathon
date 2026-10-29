# Lane import: lesson-import check and import commands (dl-e8ov.5.38.3)

You are the import lane of wave 1 of epic `dl-e8ov.5.38`. Your worktree is
`/Users/vasyl/.md/worktrees/jadwigo-hackathon/import` (branch `import`, cut from `main`). Run every
command from there. Never cd into another worktree or the main checkout.

## Read first

1. `AGENTS.md` at the worktree root, then `packages/lesson-import/AGENTS.md` and `tools/AGENTS.md`.
2. The wave plan: `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/docs/worklog/dl-e8ov.5.38/2026-10-29-wave-1.md`
   (not yet on main). Its "Lead decisions" 1, 2 and 3 are yours to build.
3. The bead: `bd -C ~/projects/david-learns/.beads show dl-e8ov.5.38.3`. Read it, never write it.
4. `packages/lesson-import/src/{lesson-file.ts, compile.ts, import.ts, seed.ts, config.ts, ids.ts}`,
   `packages/lesson-import/src/import.test.ts` (how the fixtures are imported in tests),
   `packages/testing/src/lessons/*.json` (the 5 fixture lesson files), the `Makefile` (the seed
   target, `SUPABASE_LINK`, `PROD_GATE`, `POOLER_URL` handling, `api-dev`), `.claude/hooks/guard.ts`
   (`DB_TARGET`, `prodDbDenial`) and `.claude/hooks/guard.test.ts`, `apps/api/src/testing/client.ts`
   (`seeded`, which already imports the fixtures into a store the api int tests play).

## Scope

Two commands on `packages/lesson-import`, a Makefile target that runs the second against
jadwigo-dev, and the guard rule that keeps prod out of a session's reach.

1. **check** (`src/check.ts`, `bun run check <file> [--json]`): reads one lesson file, runs
   `compileLessonFile` on it, and prints every problem with its step id. Exit 1 on any problem, 0
   when clean. With `--json`, print exactly `{"ok": boolean, "errors": [{"step_id": string|null,
   "message": string}], "play_path": "/play/<assignment id>" | null, "lesson_id", "questions":
   number}`. The step id comes out of compile's error text (`lesson file <id>, step <step>: ...`)
   or the parse error's path; when neither names a step, `step_id` is null. `play_path` is
   `/play/${featuredAssignmentId(file.id)}`, known before any import. `jw lesson_check` (the
   compose lane, Python) will call this by subprocess and read the JSON, so the JSON shape is a
   contract between lanes: keep it exactly this, and document it in the file's header comment.
   Collect every error compile throws you can (parse errors are one message; compile stops at the
   first throw, so one run may report one error: say so in the header rather than refactoring
   `compile.ts`, which is frozen).
2. **import** (`src/import-file.ts`, `bun run import <file>`): imports one file through
   `importLessonFile` into `DATABASE_URL` (`databaseUrl()` from `config.ts`), the way `seed.ts`
   imports a folder, and prints one line: `<file>: <lesson id> version <n> published|unchanged,
   play /play/<assignment id>`. The assignment stays what compile writes: audience `anyone`,
   identity `none` (lead decision 3).
3. **Makefile** `lesson-import FILE=<path> ENV=dev`: refuse a missing `FILE` and any `ENV` other
   than `dev` with one line each (the message for prod: "lesson-import: only ENV=dev; prod imports
   are the owner's, by hand"). With `ENV=dev`, resolve the dev project's `DATABASE_URL` the way the
   seed target does (link, pooler URL, jadwigo_api's password, the 28P01 retry): factor that block
   into one shared recipe variable both targets use, so nothing is copied. With no `ENV`, import
   into the local Postgres (`postgresql://localhost:$${PGPORT:-5433}/jadwigo`, as the seed target
   does). Add the target to `.PHONY` and the help comment lines in the Makefile's style.
4. **Guard**: `DB_TARGET` in `.claude/hooks/guard.ts` adds `lesson-import`, so `make lesson-import
   ENV=prod` and its wrapped and pty forms are denied with the existing messages (edit the
   message that lists the targets so it names lesson-import). Add the planted-violation cases to
   `.claude/hooks/guard.test.ts` beside the db-seed ones. Touch nothing else in the guard.

## Owns

`packages/lesson-import/src/check.ts` (new), `src/import-file.ts` (new), `src/check.test.ts` (new),
`src/import-file.int.test.ts` (new), `packages/lesson-import/package.json` (scripts and the `"//"`
block), `Makefile`, `.claude/hooks/guard.ts` (the `DB_TARGET` regex and the one message),
`.claude/hooks/guard.test.ts` (new cases).

## Must not touch

`packages/lesson-import/src/{lesson-file.ts, compile.ts, import.ts, seed.ts, ids.ts, config.ts}`
and `import.test.ts`, `packages/contracts/**`, `packages/store/**`, `apps/**`, `supabase/**`,
`tools/**`, `packages/testing/**`. A gap in `compile.ts`'s errors or in a contract is a message to
the lead in your handoff.

knip fails an unused file: `check.ts` and `import-file.ts` are reached through `package.json`
scripts, which knip reads. If knip still flags one, say so in the handoff rather than adding an
ignore.

## Done when (run these, keep the output for the PR)

- `bunx turbo run lint typecheck test --filter=./packages/lesson-import` is green, and
  `src/check.test.ts` shows: `bun run check` passes all 5 files in `packages/testing/src/lessons/`
  (exit 0, `ok: true`, a `play_path`); a planted bad copy of one (a step whose `question_type`
  does not match its family, and a second with a `help` field the contract lacks) fails with exit 1
  and the step id in `errors[0].step_id`.
- `make migrate` then `DATABASE_URL=... bunx vitest run --project int packages/lesson-import` (or
  the repo's `bunx turbo run test:int --filter=./packages/lesson-import`): `import-file.int.test.ts`
  imports one fixture through `createPostgresStore`, and the store then returns the published
  version and the `anyone`/`none` assignment at the printed id. Playing it through the api is
  already covered by `apps/api/src/roundtrips.int.test.ts`, which seeds the same fixtures; do not
  add a test there.
- `bun .claude/hooks/guard.test.ts` (or however `make check` runs it) is green with the new cases:
  `make lesson-import FILE=x ENV=prod` denied, `make lesson-import FILE=x ENV=dev` allowed.
- `make lesson-import` with no `FILE` and with `ENV=prod` each print their one refusal line
  (run the no-FILE and ENV=staging forms yourself; the prod form the guard denies, which is the
  point: quote the denial).
- `make check` at the worktree root is green.

## Stop if

The check needs a change to `compile.ts` or a contract. The int test needs a migration. The same
step failed 3 times with no new information. Then write the handoff with the exact command and
error and stop.

## How you ship

- Stage by name, commit with `mise exec -- git commit`, push `import`, then open a draft PR titled
  `dl-e8ov.5.38.3: lesson-import check and import, make lesson-import ENV=dev` with
  `gh pr create --draft --body-file <file>`. The body follows `.agents/skills/dev-pr/SKILL.md`
  (Issue line, Summary, Evidence, Merge Danger, `**Door:** two-way`: no migration, no snapshot).
  Write the body in your scratchpad, not the repo. A `.claude/` change in the same PR is fine;
  `.github/workflows/` you do not touch.
- Never: merge, `gh pr ready`, `bd update`, `bd create`, publish, run anything with `ENV=prod`,
  write to jadwigo-dev (an `ENV=dev` run of the new target is the owner's step `.5`; you test
  against local Postgres only).
- End by writing `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/handoffs/import.md`:
  what landed (files), the exact `--json` shape of `check`, the commands that ran with their
  results, what did not run, the PR link, anything that belongs to another lane or the lead. Then
  say `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_DECISIONS` or `BLOCKED`.
