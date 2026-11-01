-- The Realtime probe's setup (dl-z5ja.6), for the dev project only and never a migration. The owner
-- applies it with psql (supabase/probes/realtime/README.md); cleanup.sql removes all of it.
--
-- What it stands up, after docs/research/ai-chat-engine.md ("Turn control", "Supabase limits"):
--   - realtime_probe.run and realtime_probe.run_event, a small run_event: (run_id, seq) is the key,
--     seq is max + 1 per run, rows are insert only;
--   - a select policy on realtime.messages, so a token whose pod owns run <id> may join the private
--     topic run:<id> and no other token may;
--   - an after-insert trigger that sends each event to its run's topic with realtime.send, which is
--     what makes Realtime's own replay possible (it replays database-sent messages only);
--   - 3 functions in public, the only way the probe script reaches the schema, so no Data API
--     setting changes: realtime_probe_start and realtime_probe_emit for the service role,
--     realtime_probe_events for a signed-in user under row-level security.
--
-- The caller's pod is the token's top-level pod_id claim, which app.current_pod_id() reads and a
-- custom access token hook adds later, else app_metadata.pod_id, where the probe's admin-made test
-- users carry it. Nothing here changes the project's auth settings.

begin;

create schema realtime_probe;
grant usage on schema realtime_probe to authenticated, service_role;

create table realtime_probe.run (
  id uuid primary key,
  pod_id uuid not null,
  created_at timestamptz not null default now()
);

create table realtime_probe.run_event (
  run_id uuid not null references realtime_probe.run (id) on delete cascade,
  seq int not null check (seq >= 1),
  event_id uuid not null unique default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  primary key (run_id, seq)
);

alter table realtime_probe.run enable row level security;
alter table realtime_probe.run force row level security;
alter table realtime_probe.run_event enable row level security;
alter table realtime_probe.run_event force row level security;

-- The pod on the caller's token, or null.
create function realtime_probe.token_pod_id() returns uuid
language sql stable
set search_path = ''
as $$
  select nullif(coalesce(auth.jwt() ->> 'pod_id', auth.jwt() -> 'app_metadata' ->> 'pod_id'), '')::uuid
$$;

-- The run a topic names: run:<uuid>, else null. The case keeps a cast off any other topic.
create function realtime_probe.run_of_topic(topic text) returns uuid
language sql immutable
set search_path = ''
as $$
  select case
    when topic ~ '^run:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then substr(topic, 5)::uuid
  end
$$;

-- Whether the caller's pod owns the run the topic names. Security definer, so the realtime.messages
-- policy needs no grant on the probe's tables.
create function realtime_probe.can_join(topic text) returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from realtime_probe.run r
    where r.id = realtime_probe.run_of_topic(topic)
      and r.pod_id = realtime_probe.token_pod_id()
  )
$$;

revoke all on function realtime_probe.can_join(text) from public;
grant execute on function realtime_probe.token_pod_id(), realtime_probe.run_of_topic(text),
  realtime_probe.can_join(text) to authenticated;

grant select on realtime_probe.run, realtime_probe.run_event to authenticated;

create policy run_select on realtime_probe.run for select to authenticated
  using (pod_id = realtime_probe.token_pod_id());

create policy run_event_select on realtime_probe.run_event for select to authenticated
  using (exists (
    select 1 from realtime_probe.run r
    where r.id = run_event.run_id and r.pod_id = realtime_probe.token_pod_id()
  ));

-- Joining a private topic is a select on realtime.messages, checked once at join. There is no
-- insert policy: a browser only listens, and the server sends.
create policy realtime_probe_run_join on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime_probe.can_join((select realtime.topic()))
  );

-- Every event goes to run:<id> as a run_event broadcast, private.
create function realtime_probe.broadcast_event() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'run_id', new.run_id,
      'seq', new.seq,
      'event_id', new.event_id,
      'type', new.type,
      'payload', new.payload,
      'created_at', new.created_at
    ),
    'run_event',
    'run:' || new.run_id,
    true
  );
  return null;
end
$$;

create trigger run_event_broadcast after insert on realtime_probe.run_event
  for each row execute function realtime_probe.broadcast_event();

-- The service role starts a run for a pod.
create function public.realtime_probe_start(p_run_id uuid, p_pod_id uuid) returns void
language sql
security definer
set search_path = ''
as $$
  insert into realtime_probe.run (id, pod_id) values (p_run_id, p_pod_id)
$$;

-- The service role appends one event at max + 1. The advisory lock orders concurrent emits on one
-- run, as the engine's run lock will.
create function public.realtime_probe_emit(p_run_id uuid, p_type text, p_payload jsonb)
returns realtime_probe.run_event
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev realtime_probe.run_event;
begin
  perform pg_advisory_xact_lock(hashtext(p_run_id::text));
  insert into realtime_probe.run_event (run_id, seq, type, payload)
  select p_run_id, coalesce(max(e.seq), 0) + 1, p_type, p_payload
  from realtime_probe.run_event e where e.run_id = p_run_id
  returning * into ev;
  return ev;
end
$$;

-- A signed-in user reads a run's events after a cursor, under row-level security: another pod's
-- user gets none.
create function public.realtime_probe_events(p_run_id uuid, p_after int)
returns setof realtime_probe.run_event
language sql stable
security invoker
set search_path = ''
as $$
  select * from realtime_probe.run_event
  where run_id = p_run_id and seq > p_after
  order by seq
$$;

revoke all on function public.realtime_probe_start(uuid, uuid) from public, anon, authenticated;
revoke all on function public.realtime_probe_emit(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.realtime_probe_events(uuid, int) from public, anon;
grant execute on function public.realtime_probe_start(uuid, uuid),
  public.realtime_probe_emit(uuid, text, jsonb) to service_role;
grant execute on function public.realtime_probe_events(uuid, int) to authenticated;

commit;

-- Tell PostgREST about the 3 new functions.
notify pgrst, 'reload schema';

select 'realtime probe ready' as status,
  (select count(*) from pg_policies where schemaname = 'realtime' and policyname = 'realtime_probe_run_join') as join_policy,
  (select count(*) from pg_trigger where tgname = 'run_event_broadcast') as trigger;
