# Lesson import: a lesson file onto jadwigo-dev, then jadwigo-prod

The owner runs the prod step. A merge imports nothing. A lesson reaches a Supabase project only when
someone runs `make lesson-import` against it. Import on dev first, play the lesson there, and import
on prod only once it plays as it should (`dl-9t2o.9`).

A lesson file is the `lesson_file` that `lesson_check` writes once a draft answers `ok: true`. Lesson
files copy bank questions whole, so they stay outside git, in `JADWIGO_DRAFTS_DIR` on the machine
that drafted them (`~/.local/state/jadwigo/drafts` by default; draft decision `dl-jhnl`).

## Before

- The file passes the lesson checks:
  `bun run --cwd packages/lesson-import check $HOME/.local/state/jadwigo/drafts/<draft>.json`
  prints no error.
- The secrets file exists and is mode 600: `stat -f %Lp ~/.config/jadwigo/supabase.env` prints
  `600` (see `migrations.md`).
- The project's migrations are pushed: `make db-push ENV=dev DRY_RUN=1` lists nothing to push.

## Steps

`FEATURED=1` is what makes a lesson featured. Without it, `make lesson-import` imports the lesson as
a draft: it plays at its own `/play/` path, but it never joins the featured list (`dl-e8ov.2.59`).
With it, the lesson lands in the featured pod as an open anyone-assignment, at a different
`/play/` path (`dl-e8ov.2.97`).

1. **Dev.** From the jadwigo checkout:
   `make lesson-import FILE=$HOME/.local/state/jadwigo/drafts/<draft>.json ENV=dev FEATURED=1`
   - It links jadwigo-dev and imports as `jadwigo_api` through the session pooler, the way
     `make db-seed` does.
   - It prints the lesson's `/play/<assignment>` path.
   - Rerunning is safe: the same content publishes nothing new.
   - `curl -s https://app.dev.jadwigo.pl/api/v1/featured-lessons | jq '.lessons[] | [.language, .title]'`
     lists it.
2. **Play it on dev.** Open app.dev.jadwigo.pl at that path, in the lesson's language: add
   `?lang=en` for an English lesson. Answer a few questions right and one wrong.
3. **Prod.** From your own terminal:
   `make lesson-import FILE=$HOME/.local/state/jadwigo/drafts/<draft>.json ENV=prod FEATURED=1`
   - It asks you to type `prod` before it links.
   - A session can't run it. The guard refuses it, and the gate refuses any run with no terminal
     (`tools/src/db-targets.test.ts`).
   - Running it with `FEATURED=1` is your approval of the lesson as featured. It lands in the
     featured pod as an open anyone-assignment, so prod's featured list shows it at once. The
     decision is
     `jadwigo-marketing/decisions/2026-11-01-the-owner-approves-each-featured-lesson-jadwigo-pl-s-language-sw`.
4. **The site's snapshot.** jadwigo.pl reads the featured lessons from the API when it builds.
   `apps/site/src/content/featured.json` is the snapshot it falls back to, so refresh it in a PR
   after a prod import (`dl-w0b4.85`). The site shows a lesson only on pages in its language: Polish
   lessons on `/lekcje` and English ones on `/en/lessons`. The change is live after the next site
   release.

## After

`curl -s https://app.jadwigo.pl/api/v1/featured-lessons | jq '.lessons[] | [.language, .title]'`
lists the lesson in its language, and its `/play/` path plays on app.jadwigo.pl.

## Undo

One-way for now. No target withdraws an imported lesson from the featured list (`dl-9t2o.12`).
Importing a fixed file publishes a new version of the same lesson; it does not remove the old one.
