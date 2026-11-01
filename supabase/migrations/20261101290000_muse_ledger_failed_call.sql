-- A Muse call that failed after it spent counts toward its lane (issue dl-z5ja.123, wave 4 lead
-- decision 47). The lane's spend is read from model_response events (dl-z5ja.89), and a failed call
-- writes none, so its cost was missed. GuardedMuse already writes a ledger row for it;
-- PostgresMuseLedger now records that row here, and muse_ledger.spent_usd adds it.
--
-- A new table and a new privilege for jadwigo_runner, both one-way. The table holds ids and a cost
-- only, never text. Nobody reads or writes it directly: jadwigo_runner records a row through
-- muse_ledger.record_failed_call, which takes the pod from the run and never from the caller, and
-- the sum is read through muse_ledger.spent_usd. Each row goes with its run and its pod.
create table muse_ledger.failed_call (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references public.pod (id) on delete cascade,
  run_id uuid not null,
  call_no integer not null check (call_no >= 1),
  cost_usd numeric not null check (cost_usd > 0),
  created_at timestamptz not null default now(),
  foreign key (pod_id, run_id) references public.run (pod_id, id) on delete cascade
);
create index failed_call_created_at on muse_ledger.failed_call (created_at);

alter table muse_ledger.failed_call enable row level security;
alter table muse_ledger.failed_call force row level security;
create policy pod_scope on muse_ledger.failed_call
  using (pod_id = app.current_pod_id()) with check (pod_id = app.current_pod_id());
revoke all on muse_ledger.failed_call from public;

-- The one way in. An unknown run records nothing.
create function muse_ledger.record_failed_call(run_id uuid, call_no integer, cost_usd numeric)
returns void
language sql volatile security definer set search_path = ''
as $$
  insert into muse_ledger.failed_call (pod_id, run_id, call_no, cost_usd)
  select r.pod_id, r.id, record_failed_call.call_no, record_failed_call.cost_usd
  from public.run as r
  where r.id = record_failed_call.run_id
$$;
revoke execute on function muse_ledger.record_failed_call(uuid, integer, numeric) from public;
grant execute on function muse_ledger.record_failed_call(uuid, integer, numeric) to jadwigo_runner;

-- The lane's spend: its runs' model_response costs, and now their failed calls' costs too.
create or replace function muse_ledger.spent_usd(
  workflows public.run_workflow[], since timestamptz
) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(pg_catalog.sum(spent.cost_usd), 0)
  from (
    select (e.payload ->> 'cost_usd')::numeric as cost_usd
    from public.run_event as e
    join public.run as r on r.pod_id = e.pod_id and r.id = e.run_id
    where e.type = 'model_response'::public.run_event_type
      and e.created_at >= since
      and r.workflow = any (workflows)
    union all
    select f.cost_usd
    from muse_ledger.failed_call as f
    join public.run as r on r.pod_id = f.pod_id and r.id = f.run_id
    where f.created_at >= since
      and r.workflow = any (workflows)
  ) as spent
$$;
