# Dev commands

Instructions for agents that build this repo: Claude Code, Muse Code, Codex, or any agent that
reads `.agents/skills/`, the cross-agent home. Each one is a folder holding a `SKILL.md`, and is
run as `/dev-<verb>`. Dev commands never ship to a parent. What the app's AI does for parents is
a product workflow, and those live in `workflows/` (`workflows/README.md`).

| Command | Use it when |
| --- | --- |
| [`dev-pr`](dev-pr/SKILL.md) | writing or rewriting any PR body |
| [`dev-drop`](dev-drop/SKILL.md) | making, checking or publishing a drop |

```
.agents/skills/dev-<verb>/SKILL.md          # the source: frontmatter (name, description), then the steps
.claude/skills/dev-<verb> -> ../../.agents/skills/dev-<verb>   # so Claude Code finds it too
```

This folder also holds the links to the product workflows, so other agents can run those as
well. `make skills` recreates every link, and `tools/src/check-workflows.ts` fails:

- a missing link
- a name that doesn't match its folder
- a dev command that isn't named `dev-*`
- a product workflow filed here instead of in `workflows/`

## Writing one

- `name` is the folder name, `dev-<verb>`. The `description` says when to use it.
- Keep it to one file, unless it needs a template or a credit. A command that only another
  command cites belongs inside that command.
- Work through the repo's own tools (`bd`, `md`, `gh`, `make`), and stop before anything paid
  or outward.
- When you copy one from elsewhere, keep its licence and a `CREDITS.md`, and name the commit it
  came from (as `dev-pr` does).
