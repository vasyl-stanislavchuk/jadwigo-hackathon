---
name: dev-drop
description: "Use when a drop is to be made, continued, checked or published for the jadwigo project: a design or plan the owner must decide on, the result of a wave or an epic, or a research outcome worth showing. Jadwigo's layer over md's /md-drops: the drop's issue, its source in docs/drops/<folder>/, the project's content rules (glossary words, decisions by slug, owner questions as options, no names, no bank content, pl and en copy), the checks, and what follows the owner's yes to publish."
---

# /dev-drop

md's `/md-drops` is how any drop gets built: the block catalog, the fit table, a spec written by a
script, numbers computed once, `lint`/`check`/`shot`, publishing, and what every sentence owes.
Follow it for all of that. This command adds what is particular to jadwigo. If `/md-drops` is
missing, run `md ai setup --yes`. The md setup hook runs it in every new worktree.

## 1. Is a drop the right thing?

Make a drop when the owner, or someone outside the session, has to **see and decide**:

- a design or plan with open questions
- what a wave or an epic delivered, with its evidence
- a research outcome worth showing

Not for status (the project page shows the board), not to record a decision (the md context brain
does), and not for the brief of one issue (the issue holds it).

## 2. The drop has an issue

Every drop carries out an issue: `bd -C ~/projects/david-learns/.beads show <id>`, with no
exceptions. If there is no issue, file one under the epic it serves. The issue's "done when" says
what the reader can decide or do once they have read the drop.

## 3. The source lives in the repo

- **Folder:** `docs/drops/<folder>/`, short and lowercase. The slug is `jadwigo-<folder>`.
- **One page:** `spec.json`, written by `build.ts` beside it (`bun docs/drops/<folder>/build.ts`).
- **Several pages:** `site.json`, plus a spec or a markdown page for each one.
- **The generating script stays with the source**, so the next session reruns it rather than
  editing output. Write what it reads to `data/` inside the folder: board data from
  `bd … --json`, and figures from repo files.
- **Diagrams:** sources go in `diagrams/` and the exports in `img/`.
- **Evidence:** each `evidence` path in `site.json` is a file in this repo. A claim that rests on
  david-learns links to its GitHub URL instead.

To continue a drop, run `md drops where jadwigo-<folder>`. Edit the copy in `docs/drops/`, never
md's home copy, and rerun the script.

## 4. What jadwigo pages say

- **Words from `GLOSSARY.md`.** Pod, learner, lesson, attempt, skill, workflow, dev command.
- **No names, ever.** A child is "the learner" or a `lrn_…` id, and a family is "the pod" or "the
  parent". This applies to captions, screenshots and the data files. gitleaks and the review
  look for names.
- **No question bank content.** Show fixture questions from `packages/testing`, or describe the
  item. Never a Khan or Alfik item, nor a screenshot of one (`AGENTS.md` fence 8).
- **Learner-facing text appears in both `pl` and `en`, read from `packages/copy`.** Never retype it.
- **Screenshots** come from the dev server (`make dev`, on md's ports) with the fixture learner,
  never a real session.
- **Decisions are cited by slug**, found with
  `md context ask "<question>" --project jadwigo-platform`. A page never settles a question
  itself.
- **Owner questions go on their own page or section.** Each one gives the options, why it
  matters, and the issue that waits on it. Never pick an option. Each question is also filed as
  an issue, so the board and the drop agree.
- **No calendar promises.** Order the work by what blocks what.

## 5. Check, then open the PR

```bash
bun tools/src/check-drops.ts          # structure; CI runs it too
md drops check docs/drops/<folder>/site.json --numbers   # or spec.json; `make drops` checks them all
md drops shot docs/drops/<folder>/site.json              # then read the PNGs
```

Add a row to `docs/drops/index.md`, marked "not yet published". Open the PR with `/dev-pr`. The
PR changes only the source, so it is a two-way door. Publishing is a separate step.

## 6. Publish: the owner's yes, from merged `main`

Ask the owner with `AskUserQuestion`. Once they say yes, publish from an up-to-date `main`:

```bash
md drops publish docs/drops/<folder>/site.json --name jadwigo-<folder> --password auto \
  --summary "<what this version adds>"
md drops attach jadwigo-<folder> <issue-id>
```

When republishing, add `--force --password <current>`, and take the password from
`md drops history --json`. Never write a password into the repo, a PR or an issue.

Then:

- Put the link on the issue: `bd update <id> --append-notes "drop: https://drops.medallion.md/sites/jadwigo-<folder>/"`.
- Mark the `docs/drops/index.md` row as published, in a small PR.
- After it merges, run `md context repo sync --project jadwigo-platform`.

## 7. Reader comments

- **Content fixes and block feedback** follow `/md-drops` step 8. File block feedback with
  `md drops feedback`.
- **Threads:**
  1. Run `md drops comments plan jadwigo-<folder> --source docs/drops/<folder>/site.json`.
  2. Fill in a decision for each thread. A product question gets `owner`.
  3. Commit the plan, and run `md drops comments apply <plan> --dry-run`.
  4. After the owner approves, run `md drops comments apply <plan>` from merged `main`.
