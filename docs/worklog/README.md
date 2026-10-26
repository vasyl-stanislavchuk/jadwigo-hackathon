# Worklog

What a running epic needs between sessions, in md's convention:

```
docs/worklog/<epic>/<yyyy-mm-dd>-<slug>.md
```

- The first line names the epic, e.g. `# dl-5ssh.34: wave 1 plan`. `tools/src/check-worklog.ts`
  fails a note that doesn't.
- When the epic closes, fold whatever is worth keeping into a lasting doc, and delete its folder
  in the same commit.
- Nothing outside `worklog/` links in. These notes are temporary, so link the issue instead.

## What goes here

- **A wave plan:** `<date>-wave-<n>.md`. One row per lane gives the lane, the paths it owns, the
  paths it must not touch, its frozen tests, its issue queue in order, and its state. The template
  and the lead's workflows come with `dl-5ssh.34.13`.
- **A handoff:** `<date>-handoff-<slug>.md`, written by `/dev-handoff`, for a fresh session
  to pick the work up. It covers:
  - the outcome, in the owner's words
  - what the work must answer
  - what to read first
  - the rules
  - "done when"
  - a prompt ready to paste
- **Notes between sessions** that would be noise on the issue itself.

A short stop note (what was asked, what was done, the exact error, what to try next) goes on the
issue with `bd update <id> --append-notes`, not here.
