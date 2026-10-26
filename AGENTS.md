# jadwigo

A learning app for children in the first school grades, in Polish and English. This is the
monorepo: bun workspaces and Turborepo for TypeScript, a uv project for the `jw` CLI. Many agents
build it at once, each in its own worktree, and `main` changes only through a squash-merged PR.

## Start here

Read in this order, and stop when you know enough:

1. This file.
2. The `AGENTS.md` nearest to the files you will touch (every app and package has one).
3. Your issue: `bd -C ~/projects/david-learns/.beads show <id>`.
4. The workstream page in `docs/workstreams/` that owns those files.
5. Words you don't know: `GLOSSARY.md`. A decision the docs leave open: `md context ask "<question>" --project jadwigo-platform`.

## Layout

| Path | What it is for | May import | Workstream |
| --- | --- | --- | --- |
| `apps/api` | the one Lambda: router, `authorize()`, routes | packages | platform |
| `apps/web` | the app at app.jadwigo.pl: lesson player, parent screens | packages | learner-experience |
| `apps/site` | the marketing site, jadwigo.pl and jadwigo.kids | packages | marketing |
| `apps/cli` | `jw`, Python and Click, later `jw mcp serve` | nothing of ours | ai-workflows |
| `packages/contracts` | Zod schemas: ids, lesson script, answers, routes, errors; JSON Schema snapshots | Zod only | platform |
| `packages/core` | grading, numbers, mastery: pure functions | contracts | learner-knowledge |
| `packages/store` | the `Store` interface, in-memory and Postgres | contracts, core, config | platform |
| `packages/bank` | bank code: read, search, import. Never questions | contracts | question-bank |
| `packages/api-client` | the typed client web, cli and MCP share | contracts | platform |
| `packages/lesson-kit` | interaction families and lesson blocks | contracts, core, ui, copy | learner-experience |
| `packages/ui` | tokens, primitives, parts | copy | learner-experience |
| `packages/copy` | every string a person reads, in `pl` and `en` | nothing of ours | learner-experience |
| `packages/config` | hosts and languages for every environment, one source | nothing of ours | platform |
| `packages/testing` | fixtures, factories, the unit setup. Test files only | anything | platform |
| `tools/` | repo scripts, each with a test, run by `make check` | nothing of ours | platform |
| `workflows/` | product AI workflows, `/jadwigo-<record>-<verb>`: what the app's AI does for a parent (`workflows/README.md`) | n/a | ai-workflows |
| `.agents/skills/` | dev commands, `/dev-<verb>`: how agents build this repo (`.agents/skills/README.md`) | n/a | platform |
| `lint/` | GritQL house rules for Biome (`lint/README.md`) | n/a | platform |
| `docs/` | how it works: workstreams, research, drops, runbooks, worklog (`docs/README.md`) | n/a | each its own |
| `infra/` | Terraform, one root module (`dl-5ssh.34.4`) | n/a | platform |
| `supabase/` | migrations and their tests (`dl-5ssh.34.34`) | n/a | platform |
| `.claude/` | hooks, the guard, settings, and links to both kinds of instructions | n/a | platform |
| `.github/` | CI, the setup action, the ruleset, CODEOWNERS, Renovate's labels | n/a | platform |

dependency-cruiser enforces two edges of that column: packages never import apps, and
`contracts` imports nothing of ours. The rest is the intended direction. A new edge between
packages is the lead's call, so ask before you add one.

Not in the repo, on purpose: decisions (the md context brain), the question bank and its eval runs
(outside git, `JADWIGO_BANK_DIR`), learner data, and drop passwords.

## Commands

| Need | Command |
| --- | --- |
| Install | `mise install && bun install --frozen-lockfile` |
| The gate before you finish | `make check`: lint, typecheck and test on what changed (`turbo --affected`), then the repo checks |
| Everything | `make check-all` |
| One package | `bunx turbo run lint typecheck test --filter=./packages/core` |
| Integration tests | `DATABASE_URL=postgresql://localhost/jadwigo_test bunx turbo run test:int` |
| Drops | `make drops` (`md drops check` on each) |
| Workflow and dev command links | `make skills` |

Run the tests your change touches. CI runs the rest. Playwright is CI's job.

## One issue, start to finish

An issue is a brief. It names what to **Read**, the paths it **Owns**, the **Frozen** tests, what
to **Do**, **Done when**, and **Stop if**. If yours lacks one of these, ask before you start.

1. `bd show <id>`, then `bd update <id> --claim`.
2. `git switch -c <lane>/<id> origin/main` (with no lane: `<id>/<slug>`).
3. Do exactly the issue. One issue is one deliverable. Work you find along the way becomes a new
   issue (`bd create "…" --deps discovered-from:<id>`), not part of this PR.
4. `make check`, then run each "done when" check and keep its real output.
5. Push, open a draft PR titled `<id>: <what>` with a body from `/dev-pr`, and push often.
6. Ready: `gh pr ready`, then `gh pr merge --auto --squash`. GitHub merges it once `ci-ok` and
   `review-ok` are green. md's merge steward posts `review-ok` (`md merge-steward start`). No
   path needs the owner's approval, and a broken `main` is fixed forward.
7. `bd close <id> --reason "<what ran, what did not>"`.

## Lanes and waves

Big changes ship as a wave: a lead plans it, and lanes build it in parallel.

- The lead's wave plan lives at `docs/worklog/<epic>/<date>-wave-<n>.md`, with one row per lane:
  paths owned, paths not to touch, frozen tests, the issue queue in order, and the state.
  Issues carry `wave:<epic>-<n>` and `lane:<x>` labels, and a lane works `bd ready --label lane:<x>`.
- **Step 0 is the lead's:** one PR with the plan, the contract changes and shared stubs. Lanes
  build against it and never edit a contract. A gap in a contract is a message to the lead.
- **You own your lane's paths and nothing else.** A file outside them (a shared fixture, a
  dependency, another lane's code) is a request to the lead, not an edit.
- One md worktree per lane: `md worktree new <lane> --repo jadwigo-hackathon`. Inside a lane,
  parallelize only over disjoint files, never over phases of the same file.
- The lead hands a lane its whole queue at once and waits for an acknowledgement. A correction
  sent mid-queue arrives late.
- **The builder never reviews its own work.** A lane reporting green is a claim; a reviewer's
  re-run is the evidence.

## When to stop

Stop and hand off when:

- the same step failed 3 times with no new information
- "done when" can't pass without touching a file outside what you own
- a contract is ambiguous, or disagrees with the issue
- a test you didn't write and didn't touch fails
- the next step is a migration, a new database, a paid call or a publish the issue didn't name

The handoff is 4 lines on the issue (`bd update <id> --append-notes`): what the issue asked, what
you did, the exact command and error that stopped you, what you would try next.

End every session with one word, `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_DECISIONS` or `BLOCKED`,
then: issues closed or noted, the commands that ran with their results, the ones that did not,
and the PR link.

## The owner

- **Product questions are the owner's.** Ask with the options laid out, and don't pick one. Write
  down what the owner decides in the md context brain, never only in a file here.
- **Paid, careful and outward steps are the owner's to run:** `terraform apply`, a deploy, a
  publish, anything that sends mail. Write the script; the owner runs it.
- **The board is yours to keep current.** File, update, re-link and close issues without asking,
  and say why in the issue.

## Git and PRs

- Stage files by name. The squash subject is the PR title, so `git log --grep <id>` finds an issue's changes.
- The PR body has the `/dev-pr` shape: Summary (one small visual), Evidence (before and
  after), Merge Danger (door and blast radius). CI checks the headings.
- **One-way doors in this repo.** Call these one-way, never two-way:
  - a migration under `supabase/`
  - a change to a `packages/contracts/schemas/*.json` snapshot
  - anything that deletes, moves or exports learner data
  - `infra/bootstrap/` and anything that changes IAM
  - a deploy, a publish, an email: anything that leaves the machine
- After a merge that changes `docs/`, run `md context repo sync --project jadwigo-platform`.

## Fences

Each fence has a test that plants a violation (`tools/src/*.test.ts`, `.claude/hooks/guard.test.ts`).

1. **The guard** (`.claude/hooks/guard.ts`) denies:
   - every tool while `ANTHROPIC_API_KEY` is set
   - `terraform apply` and prod AWS profiles
   - Docker and `supabase start`
   - force-push, `--no-verify`, pushes to `main`
   - `gh pr merge --admin`, `gh pr review --approve`, and `gh api` writes to rulesets or branch protection
   - `git add -A` and `git add .`
   - `git pull --rebase` without `=merges`
   - `bd update --notes` (use `--append-notes`)
   - an Agent launch without `model: opus`
   - a bare `gbrain`, and other projects' databases
2. **Hooks:** Biome on every file you edit. The Stop hook runs `make check`, and you may not finish red.
3. **Strict TypeScript:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and ids that
   are branded types only the Zod parsers in `packages/contracts` create.
4. **Biome:** errors on `any`, `@ts-ignore`, `.only` and `.skip`. `lint/*.grit`: `process.env`
   is read only in a `src/config.ts`.
5. **Imports** (dependency-cruiser): apps import packages, never the reverse. `contracts` imports
   nothing of ours. Only test files import `@jadwigo/testing`. knip fails unused files, exports and
   dependencies.
6. **Unit tests** fail on network, real AWS and an unpinned clock. Anything that needs those is a `*.int.test.ts`.
7. **Contract snapshots** fail on drift. Update them with `vitest -u` on purpose and say so in the PR.
8. **No bank in git:** no question pages, Khan items, SQLite, bank media or files over 1 MB.
9. **Pre-commit** runs Biome and gitleaks. Never commit a family member's name.
10. **Ports** come from md's environment (`tools/src/ports.ts`).
11. **Docs:** worklog layout, drop sources, research outcome blocks, workflow links and the PR
    body each have a check in `tools/src/`.

## House rules

- Every dependency has a line in its `package.json` `"//"` block naming the one thing that needs it.
- Versions are pinned exact, and Renovate moves them after 7 days.
- A merge deploys nothing; the owner deploys by hand.
- Issues live on the david-learns tracker: `bd -C ~/projects/david-learns/.beads …`. In zsh,
  wrap it in a function, `B() { bd -C ~/projects/david-learns/.beads "$@"; }`, never a variable.
- Writing: digits for numbers, issue ids in backticks, "issue" (not "card"), outcomes rather
  than dates or costs. Text a child reads is short and kind, and never a bare "wrong".
- Shell: `cp -f`, `mv -f` and `rm -f` (the aliases prompt). Stop a dev server by its PID, never
  with `pkill -f`.
- Real learner data never goes into a prompt, a fixture or a test.
