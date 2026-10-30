# marketing

**Goal.** Families find Jadwigo and want to try it: a marketing vision and go-to-market path, landing pages at jadwigo.pl and jadwigo.kids, social accounts, an illustration style and copy.

- **md context project:** `jadwigo-marketing`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-marketing`).
- **Scope epics:** `dl-w0b4`, label `project:jadwigo-marketing`, on the shared david-learns tracker.
- **Builds in:** this repo (`apps/site`), for jadwigo.pl first.

## Directories it owns

- `apps/site/`

The labeler (`.github/labeler.yml`) puts the `ws:marketing` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/site`.

## Done at the next milestone

Milestone 1, free tier (the order is in `docs/README.md`). jadwigo.pl is live in Polish and leads a family to the featured lesson. jadwigo.kids, in English, waits (OPEN: its audience, `dl-w0b4.7`).

## Meets

- **platform:** hosts in `packages/config` and the site's distribution.
- **learner-experience:** `packages/ui` and `packages/copy`.

## Decisions that shape it

- `jadwigo-marketing/decisions/2026-10-27-jadwigo-launches-on-jadwigo-pl-only-for-now-jadwigo-kids-waits`: Jadwigo launches on jadwigo.pl only for now; jadwigo.kids waits
- `david-learns/decisions/2026-10-24-the-marketing-site-is-built-with-astro-polish-and-english-only-p`: the site is Astro, Polish and English only
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-marketing/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-w0b4.7, dl-w0b4.9` (deferred while jadwigo.kids waits): who jadwigo.kids serves, and what a visitor sees of the other domain
- `dl-w0b4.8, .11, .12, .17` (deferred until the jadwigo.pl site skeleton (`dl-w0b4.1`)): featured-lesson approval, PostHog and consent, social accounts
- `dl-w0b4.29`: who Jadwigo is for first, until the pilot verdict (`docs/research/jadwigo-go-to-market.md`)
- `dl-w0b4.30`: which message leads on jadwigo.pl. The look, the name story and the cast are decided (2026-10-30, `dl-w0b4.35`, `.37`, `.38`), and don't wait on it
- `dl-w0b4.69`, then `dl-w0b4.18`: the owner runs the mascot style batch, then shortlists 3 styles from the comparison drop (`docs/research/jadwigo-mascot-style.md`)
- `dl-w0b4.31`: how the pilot invitation reaches the class's parents
- `dl-w0b4.32`: whether jadwigo.pl collects parents' emails before launch
