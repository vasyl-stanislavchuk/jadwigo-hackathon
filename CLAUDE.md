@AGENTS.md

## Claude Code only

- `.claude/settings.json` is committed: the guard on every tool, Biome after each edit, and
  `make check` on Stop. Worktrees inherit it. Personal overrides go in `.claude/settings.local.json`.
- Launch every subagent with `model: "opus"`. The guard refuses any other.
- `.claude/skills/` links in two kinds of instructions, and they never mix:
  - **Dev commands** (`.agents/skills/dev-*`), for building this repo: `/dev-pr` whenever you write
    or rewrite a PR body (the guard refuses a `gh pr create` or `gh pr edit` body without its
    shape, so write it to a file and pass `--body-file`), and `/dev-drop` to make, check or
    publish a drop. `/dev-drop` builds on md's own `/md-drops`, which `md ai setup --yes`
    installs into `.claude/commands/`.
  - **Product AI workflows** (`workflows/jadwigo-*`), which the app runs for parents. You run
    one here only to develop or test it.
- Land a PR with `gh pr ready <n>` and `gh pr merge <n> --auto --squash`: going ready starts the
  review, and GitHub merges it once `ci-ok` and `review-ok` are green. md's merge steward posts
  `review-ok` (start it with `md merge-steward start`), and a red one comes back to you as a draft.
  The merge is allowlisted. A merge without `--auto` is not, and the ruleset refuses it while a check is red.
- A step the owner runs (paid, careful, outward) goes to the owner as one command to type with
  `!` in the prompt, so its output lands in the session. Never route around a guard denial.
- Ask the owner with `AskUserQuestion`, which keeps the turn alive, not with a question in prose.
- `CLAUDE.local.md` is seeded into each md worktree and never committed.
