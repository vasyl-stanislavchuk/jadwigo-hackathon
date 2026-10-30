# learner-knowledge

**Goal.** Jadwigo keeps a knowledge base that understands each child. Every lesson is prepared from it, and parents see their child grow from it.

- **md context project:** `jadwigo-learner-knowledge`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-learner-knowledge`).
- **Scope epics:** `dl-e8ov.5`, `dl-liwi`, `dl-r77f`, `dl-e5c4`, label `project:jadwigo-learner-knowledge`, on the shared david-learns tracker.
- **Builds in:** this repo (`packages/core`).

## Directories it owns

- `packages/core/` (judges, help, mastery, the brief, the curriculum seed data)

The labeler (`.github/labeler.yml`) puts the `ws:learner-knowledge` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./packages/core`.

## Done at the next milestone

Milestone 2, goals loop, then 3, parent login (the order is in `docs/README.md`). Lessons come from the bank and the child's own mistakes, and mastery in `packages/core` moves with each attempt. At parent login, a parent's account keeps the child's answers and knowledge base. Wave 1 of the knowledge base (`docs/worklog/dl-e8ov.5/2026-10-30-wave-1.md`) builds the skill catalogue, mastery per skill, the brief, the report ("the dream") and the parent's learner page.

## Meets

- **question-bank:** the questions a lesson is composed from.
- **platform:** the records in `packages/store`.
- **learner-experience:** the parent screens in `apps/web`.

## Decisions that shape it

- `jadwigo-learner-knowledge/decisions/2026-10-26-learner-knowledge-is-the-knowledge-base-that-understands-each-ch`: learner knowledge is the knowledge base that understands each child
- `jadwigo-learner-knowledge/decisions/2026-10-27-a-returning-learner-continues-the-unfinished-lesson-first-a-newe`: a returning learner continues the unfinished lesson first
- `jadwigo-learner-knowledge/decisions/2026-10-30-mastery-is-folded-on-read-from-the-evidence-view-and-also-kept-i`: mastery is folded on read and kept in a cache table rebuilt after every finished or claimed attempt
- `jadwigo-hackathon/decisions/2026-10-30-the-dream-runs-on-demand-now-a-make-target-and-a-post-route-work`: the dream runs on demand; code computes the digest, an AI workflow writes only the narrative
- `jadwigo-hackathon/decisions/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro`: the shared curriculum and the skill catalogue live in Postgres, seeded from the repo
- `jadwigo-learner-knowledge/decisions/2026-10-30-parents-first-read-the-learner-report-on-the-learner-page-in-the`: parents first read the report on the learner page
- `david-learns/decisions/2026-10-26-only-the-playground-matters-the-django-and-python-lesson-backend`: only the playground matters: the Python lesson path is thrown away, so ports start from the playground's TypeScript
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-learner-knowledge/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-e8ov.2.30, dl-e8ov.5.19, dl-e8ov.5.31, dl-r772.17` (deferred until their build starts): interest notes in S3, homework text in search queries, the name of the record that sends a lesson, when a spelling skill is Proficient
- `dl-e8ov.5.53, .54, .55, .56, .57` (from `docs/research/curriculum-and-skills.md`): curriculum versioning for the 2026 podstawa, who reviews a proposed skill, whether an edited copy is offered back, topics across curricula, the seed status of the 18 known bank ids
- `dl-e8ov.5.50`: may the report-write workflow run on a real family's digest, and where
