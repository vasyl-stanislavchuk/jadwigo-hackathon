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

## What moved, what was a gap, what to change

- **Moved:** every route of the loop works on Postgres end to end: goals, the fold on read, the
  brief, the report and its reuse, the pod fence, a claim, the dream and the narrative save.
- **Gap, filed:** `dl-e8ov.5.65`, `make dream` and `make dream-save` overwrite `DATABASE_URL`, so a
  lane cannot dream on its own database.
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
