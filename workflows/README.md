# Workflows

The AI workflows agents run here, as `/jadwigo-<name>`. In this repo "skill" means a learner's
skill, so these are workflows, even though Claude Code loads them as skills.

```
workflows/<name>/SKILL.md     # frontmatter (name, description), then the instructions
workflows/<name>/…            # anything the workflow reads: templates, credits
.claude/skills/<name>  -> ../../workflows/<name>   # Claude Code
.agents/skills/<name>  -> ../../workflows/<name>   # Codex and other agents
```

The links are committed, so every worktree has them with no setup. `make skills` recreates them,
and `tools/src/workflows.test.ts` fails when one is missing or a `name` doesn't match its folder.

| Workflow | Use it when |
| --- | --- |
| [`jadwigo-pr`](jadwigo-pr/SKILL.md) | writing or rewriting any PR body |
| [`jadwigo-handoff`](jadwigo-handoff/SKILL.md) | work moves to another session |
| [`jadwigo-drop`](jadwigo-drop/SKILL.md) | making, checking or publishing a drop |

## Writing one

- `name` is the folder name and starts with `jadwigo-`. The `description` says when to use it,
  because an agent picks a workflow by its description.
- Keep it to one file unless a template or credit needs its own. A workflow that only another
  workflow cites should be part of that one.
- It writes through the repo's commands (`bd`, `md`, `gh`, `jw`), never around them, and stops
  before anything paid or outward.
- Copied from elsewhere: keep the licence and a `CREDITS.md`, and name the source commit.
