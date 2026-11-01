# The Realtime probe (`dl-z5ja.6`)

This probe checks on jadwigo-dev what `docs/research/ai-chat-engine.md` assumes about browser
delivery: a private topic `run:<id>` that only the run's pod may join, events sent from the
database with `realtime.send`, a reload that replays from `run_event` by `seq`, and deltas at about
4 a second within Realtime's message limits. It is not a migration. The owner applies it to the dev
project only, and `cleanup.sql` removes it again.

| File | What it does |
| --- | --- |
| `setup.sql` | creates the schema `realtime_probe` (`run`, `run_event`, row-level security), the select policy `realtime_probe_run_join` on `realtime.messages`, the insert trigger that calls `realtime.send`, and 3 `public.realtime_probe_*` functions the script calls |
| `cleanup.sql` | drops all of that, deletes the probe's messages and its `realtime-probe-*@example.com` users; safe to run twice |
| `apply.sh` | `apply.sh setup` or `apply.sh cleanup`: runs the file with psql on `JW_DEV_DATABASE_URL`, and refuses a URL without jadwigo-dev's ref |
| `apps/web/dev/realtime-probe.ts` | the probe itself, run with `bun`: 2 made-up users in 2 made-up pods, then the join, live, reload and delta checks, then a JSON report |

## Run it

```sh
supabase/probes/realtime/apply.sh setup     # prints: realtime probe ready | 1 | 1
bun apps/web/dev/realtime-probe.ts          # 6 PASS lines, ALL PASS, then the JSON report
supabase/probes/realtime/apply.sh cleanup   # prints: realtime probe removed | 0 | 0 | 0
```

The script needs `JW_SUPABASE_URL`, `JW_SUPABASE_KEY` (the publishable key) and
`JW_SUPABASE_SECRET_KEY` (a secret key, used to make and delete the test users, append events
and send the deltas). `JW_PROBE_DELTA_RATE` (default 4) and `JW_PROBE_DELTA_SECONDS` (default
30) shape the delta stream. The step-by-step runbook and the measured results are in the issue's
notes (`bd show dl-z5ja.6`).

## What it assumes

- The pod comes from the token's top-level `pod_id` claim, which `app.current_pod_id()` reads and a
  custom access token hook will add, else from `app_metadata.pod_id`, which is where the probe's
  admin-made users carry it. The probe changes no auth setting.
- The topic is `run:<uuid>`. How the run id is spelled on the wire is up to `dl-z5ja.21`.
