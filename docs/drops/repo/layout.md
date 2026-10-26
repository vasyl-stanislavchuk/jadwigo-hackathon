:::meta
eyebrow: Jadwigo · the repo
subtitle: Apps run and packages are imported. Each folder has one job, one owner and a short AGENTS.md that says so.
by: the jadwigo lead session
when: 2026-10-26T20:00:00Z
:::

# Where things live

## Apps run

:::table The apps
| Folder | What it is for | Workstream | Filled by |
| --- | --- | --- | --- |
| `apps/api` | the one Lambda: router, `authorize()`, routes | platform | `dl-5ssh.2` |
| `apps/web` | the app at app.jadwigo.pl: the lesson player and the parent screens | learner-experience | `dl-5ssh.34.6` |
| `apps/site` | the marketing site at jadwigo.pl and jadwigo.kids | marketing | `dl-w0b4.1` |
| `apps/cli` | `jw`, in Python and Click, and later `jw mcp serve` | ai-workflows | `dl-5ssh.34.7` |
:::

## Packages are imported

:::table The packages
| Folder | What it is for | Imports | Workstream |
| --- | --- | --- | --- |
| `packages/contracts` | Zod schemas for everything that crosses a boundary, with JSON Schema snapshots | Zod only | platform |
| `packages/core` | pure logic: grading, numbers, mastery | contracts | learner-knowledge |
| `packages/store` | the `Store` interface: in-memory now, Postgres next | contracts, config | platform |
| `packages/bank` | code for the question bank. The bank itself never enters git | contracts | question-bank |
| `packages/api-client` | the typed client shared by web, `jw` and MCP | contracts | platform |
| `packages/lesson-kit` | interaction families and lesson blocks | contracts, core, ui, copy | learner-experience |
| `packages/ui` | tokens, primitives and parts | copy | learner-experience |
| `packages/copy` | every string a person reads, in `pl` and `en` | nothing of ours | learner-experience |
| `packages/config` | hosts and languages, the one source | nothing of ours | platform |
| `packages/testing` | the unit setup, fixtures and factories. Only tests import it | anything | platform |
:::

dependency-cruiser fails these edges outright: a package that imports an app, and `contracts` importing anything of ours. Every other edge is the intended direction, and a new one is the lead's call.

## Everything else

:::table The other top-level folders
| Folder | What it is for |
| --- | --- |
| `tools/` | repo scripts, each with a test, run by `make check`: no-bank, worklog, drops, research, workflows, PR body, ports |
| `workflows/` | the `/jadwigo-*` AI workflows, linked into `.claude/skills` and `.agents/skills` |
| `lint/` | GritQL house rules for Biome |
| `docs/` | workstreams, drops, research, runbooks, worklog |
| `infra/` | Terraform, one root module, under `dl-5ssh.34.4` |
| `supabase/` | migrations and their tests, under `dl-5ssh.34.34` |
| `.claude/` | the guard, the hooks, the committed settings |
| `.github/` | CI, the setup action, the ruleset, CODEOWNERS, the PR template |
:::

Not in the repo, on purpose: decisions (they live in the md context brain), the question bank and its eval runs, learner data, and drop passwords.
