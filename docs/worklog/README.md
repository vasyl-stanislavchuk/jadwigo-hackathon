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
  and the lead's workflows come with `dl-5ssh.34.13`. Each plan also names who takes the
  steward's hand-backs after the lanes stop. Lane PRs target `main`, and a stacked one goes ready by
  pointing at `main` (`AGENTS.md`, "Lanes and waves", `dl-03l2`). A plan dated before 2026-11-01
  may still say a lane PR stays a draft until step 0 merges; `dl-03l2` replaced that rule.
- **Notes between sessions** that would be noise on the issue itself.

A brief for one issue never goes here: it lives in the issue itself (`AGENTS.md`, "One issue, start to
finish"), and so does a stop note (`bd update <id> --append-notes`). The worklog is for what
spans issues.
