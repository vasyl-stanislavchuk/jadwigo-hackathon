@AGENTS.md

## Claude Code only

- `.claude/settings.json` is committed: the guard on every tool, Biome after each edit, and
  `make check` on Stop. Worktrees inherit it. Personal overrides go in `.claude/settings.local.json`.
- Launch every subagent with `model: "opus"`. The guard refuses any other.
- The workflows in `workflows/` are skills here, through the links in `.claude/skills/`:
  - `/jadwigo-pr` whenever you write or rewrite a PR body
  - `/jadwigo-handoff` when work moves to another session
  - `/jadwigo-drop` to make, check or publish a drop
- Land a PR with `gh pr merge <n> --auto --squash`: GitHub merges it once `ci-ok` and `review-ok`
  are green. md's merge steward posts `review-ok`; start it with `md merge-steward start`. The merge
  is allowlisted. A merge without `--auto` is not, and the ruleset refuses it while a check is red.
- A step the owner runs (paid, careful, outward) goes to the owner as one command to type with
  `!` in the prompt, so its output lands in the session. Never route around a guard denial.
- Ask the owner with `AskUserQuestion`, which keeps the turn alive, not with a question in prose.
- `CLAUDE.local.md` is seeded into each md worktree and never committed.
