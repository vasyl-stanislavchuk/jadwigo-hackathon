# learner-experience

**Goal.** A child moves through every lesson in one smooth, joyful screen on a phone or a laptop. Every question type is tuned in the playground and signed off before it reaches the free tier.

- **md context project:** `jadwigo-learner-experience`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-learner-experience`).
- **Scope epics:** `dl-uukj`, `dl-w3`, `dl-7wlo`, label `project:jadwigo-learner-experience`, on the shared david-learns tracker.
- **Builds in:** the david-learns playground (question types, the lesson frame and content), until `dl-5ssh.34.6` ports the player into `apps/web` and `packages/lesson-kit`, `ui` and `copy`. Nothing new lands in those directories before the port.

## Directories it owns

- `apps/web/`
- `packages/lesson-kit/`
- `packages/ui/`
- `packages/copy/`

The labeler (`.github/labeler.yml`) puts the `ws:learner-experience` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/web --filter=./packages/lesson-kit --filter=./packages/ui --filter=./packages/copy`.

## Done at the next milestone

Milestone 1, free tier, and engaging lessons alongside (the order is in `docs/README.md`). Anyone plays a featured lesson in `apps/web` with no login, on a phone or a laptop, and every question type in it was signed off in the playground first.

## Meets

- **platform:** the lesson script in `packages/contracts`, and `packages/api-client`.
- **learner-knowledge:** grading and mastery in `packages/core`.
- **marketing:** shared parts in `packages/ui` and strings in `packages/copy`.

## Decisions that shape it

- `jadwigo-learner-experience/decisions/2026-10-27-the-can-do-card-and-the-look-back-review-at-a-lesson-s-end-are-o`: the can-do card and the look-back review are out of scope for now
- `david-learns/decisions/2026-10-26-only-the-playground-matters-the-django-and-python-lesson-backend`: only the playground matters: the Python lesson path is thrown away, so ports start from the playground's TypeScript
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-learner-experience/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-uukj.7, dl-uukj.8` (open): what 'Not sure yet' counts as, and what follows it on the step
- `dl-7wlo.17` (open): what a parent sees after a lesson
- `dl-uukj.29.68, .29.70, .29.88` (open): phone and grid details parked by the design sessions
- `dl-w3.68.4, dl-w3.68.5` (deferred): the dictation and sentence-builder design picks
