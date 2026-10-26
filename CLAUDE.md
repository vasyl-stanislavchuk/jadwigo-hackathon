@AGENTS.md

## Claude Code only

- `.claude/settings.json` is committed: the guard on every tool, Biome after each edit, and the
  affected checks on Stop. Worktrees inherit it. Personal overrides go in `.claude/settings.local.json`.
- Launch every subagent with `model: "opus"`. The guard refuses any other.
- Land a PR with `gh pr merge <n> --auto --squash`: GitHub merges it once `ci-ok` is green.
  It is allowlisted. A merge without `--auto` is not, and the ruleset refuses it while CI is red.
- `make skills` links the AI workflows in `workflows/` into `.claude/commands`.
- `CLAUDE.local.md` is seeded into each md worktree and never committed.
