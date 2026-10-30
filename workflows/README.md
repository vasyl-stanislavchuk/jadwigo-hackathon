# Product AI workflows

What Jadwigo's AI does for a parent, such as composing a lesson from a brief, planning the next
one from a learner's mistakes, or writing a report. These are part of the product: a parent's
request runs through one of them, through `jw` and MCP calls, to an outcome, with the parent in
charge at every step. The ai-workflows workstream owns them (`docs/workstreams/ai-workflows.md`).

Instructions for agents that *build* the repo, such as writing a PR body or building a drop, are not
here. They are dev commands in `.agents/skills/` (`.agents/skills/README.md`).

```
workflows/jadwigo-<record>-<verb>/SKILL.md   # one workflow: frontmatter (name, description), then its steps
workflows/_shared/                           # rules every workflow follows, in every language
workflows/_lang/{pl,en}/                     # style, glossary, checklist and examples per language
.claude/skills/<name>  -> ../../workflows/<name>   # Claude Code
.agents/skills/<name>  -> ../../workflows/<name>   # other agents, such as Muse Code and Codex
```

The links are committed. `make skills` recreates them, and `tools/src/check-workflows.ts` fails
a missing link, a wrong name, or a dev command filed here.

## Writing one

- **Name it record first:** `/jadwigo-<record>-<verb>`, such as `jadwigo-lesson-compose` or
  `jadwigo-report-write`. The record comes from `GLOSSARY.md`, and the verb matches the `jw`
  verb it calls (`jw <record> <verb>`).
- **Describe when to use it.** An agent picks a workflow by its `description`.
- **Write only through `jw`.** A workflow never writes a record, a brain page or a file by
  hand, and it trusts what `jw` returns rather than working it out again.
- **Leave judging to code.** A model never decides whether an answer is correct.
- **Stop before anything paid or outward**, and leave product choices to the parent.
- **The language comes from the record.** `jw` resolves it and assembles the `_lang` parts
  (`dl-5ssh.34.23`).
- **Every change is checked** on the evals for its journey before it ships.

## The workflows

| Workflow | Use it when | Its eval |
| --- | --- | --- |
| [`jadwigo-lesson-compose`](jadwigo-lesson-compose/SKILL.md) | a parent asks for a lesson | `apps/cli/evals/compose/` |
| [`jadwigo-report-write`](jadwigo-report-write/SKILL.md) | a learner's report needs its narrative for the parent, after `make dream` | `apps/cli/evals/report/` |

A workflow may run in an empty folder, with only the jadwigo MCP tools, so it keeps what the agent
needs in its own folder and never sends the agent to source, a shell or the repo. The per-language
parts (`_lang/pl`) wait on `dl-r772.34` and on `jw` assembling them (`dl-5ssh.34.23`); until then
`jadwigo-lesson-compose` carries its Polish rules itself.

**Its eval.** `apps/cli/evals/compose/test_compose_workflow.py` runs with `pytest -q`, no model:
it checks the workflow's text, and puts the words it teaches, and run A's (`dl-e8ov.5.38.5`), on
the canonical request through `lesson_check` and `words_check.py`. `eval_agent_words.py` is run by
hand on the lesson file a real session wrote, because only a model writes an agent's words.
