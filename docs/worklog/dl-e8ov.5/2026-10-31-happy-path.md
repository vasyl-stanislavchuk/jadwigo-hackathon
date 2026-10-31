# dl-e8ov.5 happy path: the run note of `dl-e8ov.5.46`

The acceptance run of wave 1 on a throwaway learner, made-up throughout. It ran on
`lane/lk-happy` after merging `lane/lk-store-api` (5d04473), `lane/lk-core-3` (c5882e8),
`lane/lk-db` (4fd889a) and `lane/lk-cli` (b37aca2), on the lane database
`jadwigo_lane_lk_happy` (Postgres.app 17, port 5433), on 2026-10-30.

## What ran

```text
DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make migrate
  ... supabase/migrations/20261031120000_learner_knowledge.sql
  ... supabase/migrations/20261031130000_learner_knowledge_fix.sql

DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy bunx turbo run test:int --filter=./apps/api
  @jadwigo/api:test:int:  Test Files  4 passed (4)
  @jadwigo/api:test:int:       Tests  69 passed (69)
```

`apps/api/src/journey.int.test.ts` is one of the 4 files. On 2 Warsaw days (09:00 UTC two days
ago and yesterday) it shows:

- day 1 makes row-7 familiar and the maths goal on its way;
- day 2 makes row-7 proficient, row-8 attempted with needs attention, and the brief reteaches row-8;
- the report counts 2 attempts and 2 days, moves row-7 and row-8, and proposes at most 3;
- a 2nd report with no new evidence is `reused: true` with the same digest;
- pod Q gets 404 on the 7 learner routes, and its catalogue lists none of pod P's draft;
- a featured attempt played anonymously and claimed for the learner counts in its evidence.

## The dream

A fresh throwaway learner on the lane database: the same 2 goals and 2 days, made through the
Store with `finishedAttempt`, no report yet. `make dream` first:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make dream LEARNER=lrn_0hs5jzn90m8t78y8e4ryrerstc
dream: function app.learner_pod(unknown) does not exist
make: *** [dream] Error 1
```

The target sets `DATABASE_URL` to the shared local `jadwigo` database itself, which lacks this
wave's migration (`dl-e8ov.5.65`). So the same script it runs, on the lane database:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy bun apps/api/src/dream.ts lrn_0hs5jzn90m8t78y8e4ryrerstc
{
  "id": "rpt_2z9qdkce4e8skr0kswkjcq0092",
  "period_starts_at": "2026-10-28T09:00:00.000Z",
  "period_ends_at": "2026-10-30T21:47:39.679Z",
  "reused": false,
  "digest": {
    "counts": { "attempts": 2, "questions": 4, "days_played": 2 },
    "skills_moved": [
      { "skill_code": "maths.multiplication.row-7", "from": "not_started", "to": "proficient", "attempt_id": "att_6v5x7w9v5w86vtwjex31zf8hpg" },
      { "skill_code": "maths.multiplication.row-8", "from": "not_started", "to": "attempted", "attempt_id": "att_6v5x7w9v5w86vtwjex31zf8hpg" }
    ],
    "needs_attention": [ { "skill_code": "maths.multiplication.row-8", "mistake_classes": [], ... } ],
    "mistakes": [],
    "brief": { "entries": [
      { "skill_code": "maths.multiplication.row-8", "list": "reteach", "why": "needs_attention", ... },
      { "skill_code": "polish.spelling.dream-1e64077b", "list": "new", "why": "prerequisites_met", ... }
    ], "school": "nothing_recorded" },
    "goals": [ { "status": "needs_attention", ... }, { "status": "not_started", ... } ],
    "standing": [ { "question": "skills_standing", "verdict": "watch", ... },
                  { "question": "next_focus", "verdict": "on_track", ... } ],
    "proposals": [ { "id": "p1", "list": "reteach", "skill_codes": ["maths.multiplication.row-8"], ... },
                   { "id": "p2", "list": "new", "skill_codes": ["polish.spelling.dream-1e64077b"], ... } ],
    "asks": []
  },
  "narrative": null
}
```

(Shortened at `...`: ids and citations only.)

## The narrative

`/jadwigo-report-write` was followed on that digest, in this session, and saved the way
`make dream-save` saves it (the same script's `--narrative`, on the lane database):

```text
$ DATABASE_URL=... bun apps/api/src/dream.ts lrn_0hs5jzn90m8t78y8e4ryrerstc --narrative report.narrative.json
exit 0
headline: Mnożenie przez 7 idzie do przodu, a mnożenie przez 8 wymaga teraz uwagi.
direction_now: Dziecko ćwiczyło przez 2 dni: 2 lekcje i 4 pytania. Mnożenie przez 7 idzie do
  przodu. Mnożenie przez 8 wymaga uwagi, więc następna lekcja wróci do niego spokojnie, krok po kroku.
p1: Następna lekcja jeszcze raz przećwiczy mnożenie przez 8.
p2: Następna lekcja zacznie pisownię z celu o pisowni.
```

The save's checks, probed on the same report:

```text
a headline "Dziecko opanowało mnożenie przez 7."   dream: the narrative does not hold: the text names a level: opanowane
a direction "ćwiczyło przez 3 dni"                 dream: the narrative does not hold: the number 3 is not in the digest
a 2nd, different narrative                         dream: this report already has its narrative
the saved narrative again                          exit 0
```

## The rerun on main

Main gained the 4 lanes as squash merges (#342, #343, #348) and the dream target's fix (#350,
`dl-e8ov.5.65`). `lane/lk-happy` merged it at 68772d5, taking main's side on every conflict; it
differs from main only in this lane's 7 files. Then, on the lane database:

```text
$ bun install --frozen-lockfile
Checked 1070 installs across 1278 packages (no changes)
$ make check
 Tasks:    48 successful, 48 total                      (exit 0)
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make migrate
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy bunx turbo run test:int --filter=./apps/api
  ❯ src/journey.int.test.ts:204:31   expect(again.body.reused).toBe(true)   received false
  Tests  1 failed | 68 passed (69)
```

`make migrate` reset the database, so a new throwaway learner was seeded the same way, and
`make dream` ran 3 times with no evidence between, now on the lane database:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make dream LEARNER=lrn_50fd7qvbme89fsrp9a55ytmjnz
dream: on the local database jadwigo_lane_lk_happy
run 1  rpt_439hvqkrec9pyt07ad58dtcq0m  reused false  hash 3a60a0ac…  counts 2 attempts, 4 questions, 2 days
       skills_moved row-7 not_started->proficient, row-8 not_started->attempted; proposals p1 reteach, p2 new
run 2  rpt_2ttrqssggw9yg850bbag7ak7de  reused false  hash b5c953e7…  counts 0, 0, 0; skills_moved []
run 3  rpt_2ca88d7fw197qv08yzv2xb5p9m  reused true   hash b5c953e7…  counts 0, 0, 0
dream: next, in Claude Code, run /jadwigo-report-write on <DREAM_DIR>/lrn_50fd7qvbme89fsrp9a55ytmjnz-20261030T225734Z.json
```

Run 1's digest is the one above, the same numbers. Run 2 is the defect `dl-liwi.35`: #348's
`inputs_hash` covers only the evidence inside the period, and a report's period starts where the
last one ended. So the first report after one with evidence always has an empty period, a new hash
and a zero-count digest; only the one after it is reused. The route says a report with no new
evidence is a copy of the last one, `reused: true`. Before #348 (lane tip c5882e8) the journey
passed. The narrative above was saved on the first learner, which the reset removed; it was not
written again.

## The full pass, with the fix for `dl-liwi.35`

`lane/lk-happy` merged `origin/lane/lk-core-4` (fdc1dfe, PR #351): `inputs_hash` now reads the
after-mastery rows, the goals, the catalogue codes and `DIGEST_RULES_VERSION` 2, not the period.
On the lane database, reset again:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make migrate
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy bunx turbo run test:int --filter=./apps/api --force
  ✓ src/journey.int.test.ts (1 test)
  Test Files  4 passed (4)
       Tests  69 passed (69)
```

A fresh throwaway learner, the same 2 goals and 2 days, then `make dream` twice:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make dream LEARNER=lrn_7k4t8wg7599gfs5wqvv4gnb9gr
dream: on the local database jadwigo_lane_lk_happy
run 1  rpt_7wyx0h7hxm9svs1svsgy0mwa00  reused false  hash 04f6034a…  counts 2 attempts, 4 questions, 2 days
       skills_moved row-7 not_started->proficient, row-8 not_started->attempted
       brief row-8 reteach, the spelling draft new; proposals p1 reteach, p2 new; goals needs_attention, not_started
run 2  rpt_0xfx99chx093htffmr86z0ta0t  reused true   hash 04f6034a…  the same digest
dream: next, in Claude Code, run /jadwigo-report-write on <DREAM_DIR>/lrn_7k4t8wg7599gfs5wqvv4gnb9gr-20261030T230234Z.json
```

`/jadwigo-report-write` was followed again on run 2's report, the same narrative with the new
draft code cited, and saved by the target itself:

```text
$ DATABASE_URL=postgresql://localhost:5433/jadwigo_lane_lk_happy make dream-save LEARNER=lrn_7k4t8wg7599gfs5wqvv4gnb9gr FILE=<DREAM_DIR>/lrn_7k4t8wg7599gfs5wqvv4gnb9gr-20261030T230234Z.narrative.json
exit 0
rpt_0xfx99chx093htffmr86z0ta0t  reused true
headline: Mnożenie przez 7 idzie do przodu, a mnożenie przez 8 wymaga teraz uwagi.
made_by: jadwigo-report-write/claude-opus-5-5
```

## What moved, what was a gap, what to change

- **Moved:** every route of the loop works on Postgres end to end: goals, the fold on read, the
  brief, the report, the pod fence, a claim, the dream and the narrative save. Reuse broke on main
  (`dl-liwi.35`) and works again with #351.
- **Gap, fixed:** `dl-e8ov.5.65`, `make dream` and `make dream-save` overwrote `DATABASE_URL`, so a
  lane could not dream on its own database. #350 fixed it; the rerun above dreams on the lane's.
- **Gap, fixed:** `dl-liwi.35`, a report with no new evidence since the last one was not reused on
  main, and the journey failed at `journey.int.test.ts:204`. #351 fixed it, and the full pass above runs with it.
- **The issue's wording, not a defect:** the issue expected row-7 on review or recheck after day 2.
  Core puts a proficient skill on review only once its FSRS date is due, so it is on no list until
  then. The test now checks that it is on no list today and on review at its `due_at`.
- **The issue's wording, not a defect:** the issue expected the report to move row-7 from familiar
  to proficient. A move is counted against the last report's levels. This is the first report, so
  over both days row-7 moved from not started to proficient. Familiar to proficient needs a report
  between the 2 days, and that report would count 1 day played.
- **To decide:** the brief puts the goal's draft spelling code on `new` and proposes it (`p2`),
  though a draft has no reviewed can-do line and maybe no bank questions. Whether a draft may be
  proposed is the lead's or owner's call.
