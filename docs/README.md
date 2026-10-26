# jadwigo docs

The index. Decisions are not here: they live in the md context brain, and the repo cites them by
slug (`md context decisions --project jadwigo-platform --current`).

- [`workstreams/`](workstreams/): one page per workstream project, with its goal, scope epics,
  the directories it owns and how to run and test it.
  - [learner-experience](workstreams/learner-experience.md)
  - [platform](workstreams/platform.md)
  - [ai-workflows](workstreams/ai-workflows.md)
  - [question-bank](workstreams/question-bank.md)
  - [learner-knowledge](workstreams/learner-knowledge.md)
  - [marketing](workstreams/marketing.md)
- [`worklog/`](worklog/): `<epic>/<YYYY-MM-DD>-<slug>.md`, what a running epic needs between
  sessions. The first line names the epic, and the note is deleted when the epic closes.
  `tools/src/check-worklog.ts` holds the layout.

Research, drops and the how-it-works pages move in from david-learns under `dl-5ssh.34.8`.

CI skips the code jobs on a PR that only touches `docs/` or Markdown; `ci-ok` still reports.
