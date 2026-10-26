# jadwigo docs

How jadwigo works, and how work on it is organized. Decisions are not here: they live in the md
context brain, and the docs cite them by slug (`md context decisions --project jadwigo-platform --current`).

| Folder | What it holds | Its rules |
| --- | --- | --- |
| [`workstreams/`](workstreams/) | one page per workstream: goal, scope epics, owned directories, how to run and test, done at the next milestone, who it meets | these sections on every page |
| [`drops/`](drops/) | the sources of drops made from this repo, one folder each, and an index of the older ones | [`drops/README.md`](drops/README.md), `tools/src/check-drops.ts` |
| [`research/`](research/) | one note per research question, ending in an outcome block | [`research/README.md`](research/README.md), `tools/src/check-research.ts` |
| [`runbooks/`](runbooks/) | steps the owner runs by hand: deploy, roll back, secrets | [`runbooks/README.md`](runbooks/README.md) |
| [`worklog/`](worklog/) | what a running epic needs between sessions and that spans issues, such as wave plans. Deleted when the epic closes | [`worklog/README.md`](worklog/README.md), `tools/src/check-worklog.ts` |

## Workstreams

- [platform](workstreams/platform.md): the service, contracts, store, infra, CI
- [learner-experience](workstreams/learner-experience.md): the app, the player, question types
- [marketing](workstreams/marketing.md): the sites at jadwigo.pl and jadwigo.kids
- [question-bank](workstreams/question-bank.md): bank code, search, golden sets
- [learner-knowledge](workstreams/learner-knowledge.md): mastery and the knowledge base
- [ai-workflows](workstreams/ai-workflows.md): `jw`, MCP, the workflows

## Milestones

The workstreams meet at milestones, each named by what a family or a judge can then do. Each
one waits on the milestones before it:

1. **Free tier:** anyone plays a featured lesson, with no login.
2. **Goals loop:** lessons come from the bank and from the child's own mistakes.
3. **Parent login:** a parent's account keeps the child's answers and knowledge base.
4. **Hackathon:** a judge plays without installing anything.

Engaging lessons (children ask to play) run alongside these, and Alfik practice comes after.
