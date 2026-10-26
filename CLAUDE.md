@AGENTS.md

## Claude Code only

- `.claude/settings.json` is committed: the guard on every tool, Biome after each edit, and
  `make check` on Stop. Worktrees inherit it. Personal overrides go in `.claude/settings.local.json`.
- Launch every subagent with `model: "opus"`. The guard refuses any other.
- `.claude/skills/` links in two kinds of instructions, and they never mix:
  - **Dev commands** (`.agents/skills/dev-*`), for building this repo: `/dev-pr` whenever you write
    or rewrite a PR body, `/dev-handoff` when work moves to another session, `/dev-drop` to make,
    check or publish a drop.
  - **Product AI workflows** (`workflows/jadwigo-*`), which the app runs for parents. You run
    one here only to develop or test it.
- Land a PR with `gh pr merge <n> --auto --squash`: GitHub merges it once `ci-ok` is green.
  It is allowlisted. A merge without `--auto` is not, and the ruleset refuses it while CI is red.
- A step the owner runs (paid, careful, outward) goes to the owner as one command to type with
  `!` in the prompt, so its output lands in the session. Never route around a guard denial.
- Ask the owner with `AskUserQuestion`, which keeps the turn alive, not with a question in prose.
- `CLAUDE.local.md` is seeded into each md worktree and never committed.
