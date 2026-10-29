:::meta
eyebrow: Jadwigo · the repo
subtitle: How a PR is written, which changes are one-way doors, and where drops, research, runbooks and wave plans go.
by: the jadwigo lead session
when: 2026-10-26T20:00:00Z
:::

# PRs, drops and docs

## The PR body

`/dev-pr` is the `pr` skill from Matt Pocock's skills, vendored with its MIT licence and credits. It writes these sections:

- **Summary:** the smallest visual that shows the change, such as a file tree, a call tree, a shaped diff or a diagram.
- **Evidence:** a before and an after, such as a failing test that now passes, changed output or a screenshot. It also says what did not run.
- **Merge Danger:** a **door**, one-way or two-way, and a **blast radius**.

Below them come the lines this repo adds: whether learner data is touched, and whether a contract snapshot changed. CI fails a body that is missing a heading or the door.

## One-way doors

A revert does not undo these, so they are always called one-way:

:::table The one-way doors
| Change | Why a revert doesn't undo it |
| --- | --- |
| a migration under `supabase/` | the data has already moved |
| a `packages/contracts/schemas/*.json` snapshot | every consumer of the contract sees it |
| `packages/contracts/openapi.json` | the API document docs.jadwigo.pl publishes |
| deleting, moving or exporting learner data | it cannot be called back |
| `infra/bootstrap/` and IAM | access granted is access used |
| a deploy, a publish, an email | it has already left the machine |
:::

## Dev commands and product workflows

The repo keeps its agent instructions in two separate homes. **Product AI workflows** live in `workflows/` as `/jadwigo-<record>-<verb>`: they are what Jadwigo's AI does for a parent, and they ship with the product. **Dev commands** live in `.agents/skills/` as `/dev-<verb>`: they help agents build the repo, and never reach a parent.

:::table The dev commands
| Command | Used when |
| --- | --- |
| `/dev-pr` | writing or rewriting any PR body |
| `/dev-drop` | making, checking or publishing a drop; it stops before the publish |
:::

`.agents/skills/` is the home other agents read, and `.claude/skills/` links to it. Product workflows are linked into both. The links are committed, so every worktree has them. `check-workflows.ts` fails a missing link, and it also fails an instruction filed in the wrong home.

## A home for each kind of doc

:::table Where docs go
| Kind | Home | Held by |
| --- | --- | --- |
| a drop | `docs/drops/<folder>/`, published as `jadwigo-<folder>` | `check-drops.ts` in CI, `md drops check` locally |
| a research note | `docs/research/<topic>.md`, ending in a `jadwigo-outcome` block | `check-research.ts` |
| a runbook | `docs/runbooks/<task>.md`, a numbered checklist the owner runs | review |
| a wave plan | `docs/worklog/<epic>/<date>-<slug>.md`, deleted when the epic closes | `check-worklog.ts` |
| a brief for another session | the issue: description, design, acceptance | `bd show <id>` is the whole prompt |
| a decision | the md context brain, cited by slug | never a file here |
:::

Drops and research notes written before this repo existed stay in david-learns. They carry family names, and this repo never holds one.
