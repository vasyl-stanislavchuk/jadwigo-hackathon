-- A Muse ledger that outlives the process (issue dl-z5ja.89): the lane's cap holds across cold
-- starts, read from what every run already logs. Each model_response event carries its call's
-- cost_usd; muse_ledger.spent_usd sums them across pods for the runs of the given workflows since a
-- time. The lane a call belongs to is its workflow's (packages/jadwigo-ai's PostgresMuseLedger maps
-- a lane to its workflows). It reads past row-level security on purpose, as app.runs_due does, and
-- returns a sum only: no pod, run or text.
--
-- Its own schema, as realtime_join is: jadwigo_runner gets USAGE on this one function and EXECUTE
-- on no more app functions than run.test.sql names. It is a new privilege for jadwigo_runner, held
-- narrow: security definer with an empty search_path and every name qualified, and it returns one
-- sum, never rows or pod ids. muse_ledger_privileges.test.sql holds who may call it. `if not exists` and `or replace`: `make
-- migrate` resets only public, app, auth, realtime and realtime_join, so locally this schema
-- outlives a reset.
create schema if not exists muse_ledger;
revoke all on schema muse_ledger from public;
grant usage on schema muse_ledger to jadwigo_runner;

create or replace function muse_ledger.spent_usd(
  workflows public.run_workflow[], since timestamptz
) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum((e.payload ->> 'cost_usd')::numeric), 0)
  from public.run_event as e
  join public.run as r on r.pod_id = e.pod_id and r.id = e.run_id
  where e.type = 'model_response'::public.run_event_type
    and e.created_at >= since
    and r.workflow = any (workflows)
$$;

-- Only the step consumer, whose GuardedMuse checks the lane before each call, may call it.
revoke execute on function muse_ledger.spent_usd(public.run_workflow[], timestamptz) from public;
grant execute on function muse_ledger.spent_usd(public.run_workflow[], timestamptz) to jadwigo_runner;

-- The read is by time over one event type.
create index run_event_model_response on run_event (created_at) where type = 'model_response';
