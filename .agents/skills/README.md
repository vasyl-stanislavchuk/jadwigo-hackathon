# Dev commands

Instructions for agents that build this repo: Claude Code, Muse Code, Codex, or any agent that
reads `.agents/skills/`, the cross-agent home. Each one is a folder holding a `SKILL.md`, and is
run as `/dev-<verb>`, or `/mk-<noun>` for the marketing commands below. Dev commands never ship to a parent. What the app's AI does for parents is
a product workflow, and those live in `workflows/` (`workflows/README.md`).

| Command | Use it when |
| --- | --- |
| [`dev-pr`](dev-pr/SKILL.md) | writing or rewriting any PR body |
| [`dev-drop`](dev-drop/SKILL.md) | making, checking or publishing a drop |

```
.agents/skills/dev-<verb>/SKILL.md          # the source: frontmatter (name, description), then the steps
.claude/skills/dev-<verb> -> ../../.agents/skills/dev-<verb>   # so Claude Code finds it too
```

## Marketing commands

The marketing workstream's commands (`project:jadwigo-marketing`) live here too, named
`mk-<noun>` and run as `/mk-<noun>`. Each one runs a research stage under epic `dl-w0b4`: it reads
the md context brain, then writes 1 note in `docs/research/` that ends in a `jadwigo-outcome`
block with options for the owner and no pick. They are vendored from 2 MIT skill sets, and each
folder's `CREDITS.md` names its source commit and what changed (`dl-w0b4.56`). Every one reads
[`_shared/jadwigo-rules.md`](_shared/jadwigo-rules.md) first.

| Command | Use it when | Stage |
| --- | --- | --- |
| [`mk-brief`](mk-brief/SKILL.md) | the brief every other stage reads is missing or out of date | `dl-w0b4.57` |
| [`mk-listen`](mk-listen/SKILL.md) | a stage needs parents' own words, as proxy evidence | `dl-w0b4.58` |
| [`mk-position`](mk-position/SKILL.md) | positioning against tutors, workbooks, Squla and doing nothing | `dl-w0b4.59` |
| [`mk-foundation`](mk-foundation/SKILL.md) | mission, vision and values, with what each means in practice | `dl-w0b4.60` |
| [`mk-message`](mk-message/SKILL.md) | the value proposition and message hierarchy, for parent and child | `dl-w0b4.61` |
| [`mk-story`](mk-story/SKILL.md) | the story in 3 lengths, under the consent and patron-only decisions | `dl-w0b4.62` |
| [`mk-voice`](mk-voice/SKILL.md) | the voice in 2 registers, parent and child | `dl-w0b4.62` |

3 more are vendored as is and not yet adapted. Each says so in its header and points at the
shared rules: [`mk-copywriting`](mk-copywriting/SKILL.md) and
[`mk-copy-editing`](mk-copy-editing/SKILL.md) for the landing copy (`dl-w0b4.33`), and
[`mk-identity`](mk-identity/SKILL.md) for the identity brief (`dl-w0b4.63`).

## Links and checks

This folder also holds the links to the product workflows, so other agents can run those as
well. A folder whose name starts with `_` holds shared parts, not a command. `make skills`
recreates every link, and `tools/src/check-workflows.ts` fails:

- a missing link
- a name that doesn't match its folder
- a command here that isn't named `dev-*` or `mk-*`
- a product workflow filed here instead of in `workflows/`

## Writing one

- `name` is the folder name, `dev-<verb>`. The `description` says when to use it.
- Keep it to one file, unless it needs a template or a credit. A command that only another
  command cites belongs inside that command.
- Work through the repo's own tools (`bd`, `md`, `gh`, `make`), and stop before anything paid
  or outward.
- When you copy one from elsewhere, keep its licence and a `CREDITS.md`, and name the commit it
  came from (as `dev-pr` does).
