-- The Jadwigo AI engine's records (epic dl-z5ja, issue dl-z5ja.7): a conversation holds runs, one
-- per turn; a run's effects are an append-only log of run events; what arrives while a run is busy
-- waits in its run inbox. The tables every engine option keeps (docs/research/ai-chat-engine.md,
-- "Temporal comes back ... over the same tables"); the queue, the cron sweep and the broadcast
-- trigger are Supabase-native only and come in dl-z5ja.52. Names and enums are
-- @jadwigo/contracts/run's (packages/contracts/src/run.ts), checked by naming.test.ts.
--
-- run_event and run_inbox hold a child's data on purpose: the parent's words about their own child
-- and the model's answers (draft decision dl-2uq1,
-- jadwigo-hackathon/notes/2026-11-01-learner-data-reaches-the-model-by-design-for-the-parent-s-own-re).
-- Every row goes with its pod: each table cascades from pod. Deleting one conversation waits on
-- dl-z5ja.34, so nothing else cascades from conversation.

create type run_workflow as enum ('jadwigo-lesson-compose');
create type run_status as enum (
  'queued', 'in_progress', 'awaiting_input', 'completed', 'failed', 'cancelled'
);
create type run_event_type as enum (
  'message', 'model_response', 'tool_call', 'tool_result', 'lesson_revision', 'approval_request',
  'approval_resolved', 'plan', 'status', 'usage', 'budget_steer', 'turn_complete', 'error'
);
create type run_inbox_kind as enum ('message', 'steer', 'approval', 'cancel');
create type run_inbox_status as enum ('pending', 'delivered');

-- Written once.
create table conversation (
  id uuid primary key,
  pod_id uuid not null references pod (id) on delete cascade,
  created_by uuid not null references account (id),
  title text,
  created_at timestamptz not null default now(),
  unique (pod_id, id)
);

-- One turn. attempt is the fence: the store compares and sets on it, so a step holding a stale
-- attempt writes nothing. The 2 deadlines are never one: activity pushes idle_deadline_at and never
-- moves max_deadline_at. A run resumes an earlier run of its own pod.
create table run (
  id uuid primary key,
  pod_id uuid not null references pod (id) on delete cascade,
  created_by uuid not null references account (id),
  conversation_id uuid,
  workflow run_workflow not null,
  resumes uuid,
  status run_status not null default 'queued',
  attempt integer not null default 1 check (attempt >= 1),
  cancel_requested_at timestamptz,
  idle_deadline_at timestamptz,
  max_deadline_at timestamptz not null,
  cap_usd double precision not null check (cap_usd >= 0),
  spent_usd double precision not null default 0 check (spent_usd >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (pod_id, id),
  foreign key (pod_id, conversation_id) references conversation (pod_id, id),
  foreign key (pod_id, resumes) references run (pod_id, id)
);

create index run_conversation_id on run (conversation_id, created_at) where conversation_id is not null;
-- The sweep's read (app.runs_due): the runs that have not ended.
create index run_open on run (idle_deadline_at, max_deadline_at)
  where status in ('queued', 'in_progress', 'awaiting_input');

-- Append-only. seq is per run, gapless, max + 1: the cursor. event_id is the dedupe key, unique
-- across runs because it is minted deterministically from the run (Lead decision 5). The event's
-- own fields are in payload, shaped by type as @jadwigo/contracts/run's RunEvent.
create table run_event (
  run_id uuid not null,
  seq integer not null check (seq >= 1),
  event_id uuid not null unique,
  pod_id uuid not null references pod (id) on delete cascade,
  type run_event_type not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  primary key (run_id, seq),
  foreign key (pod_id, run_id) references run (pod_id, id) on delete cascade
);

-- What arrives while a run is busy, written once by the event_id the page mints. Taken in
-- created_at order, then event_id; taking a row changes its status and nothing else.
create table run_inbox (
  event_id uuid primary key,
  run_id uuid not null,
  pod_id uuid not null references pod (id) on delete cascade,
  kind run_inbox_kind not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  status run_inbox_status not null default 'pending',
  created_at timestamptz not null default now(),
  foreign key (pod_id, run_id) references run (pod_id, id) on delete cascade
);

create index run_inbox_pending on run_inbox (run_id, created_at, event_id) where status = 'pending';

-- Write-once, append-only and gapless.

create trigger conversation_write_once
  before update on conversation
  for each row execute function app.refuse_change();

-- updateRun's RunChange (packages/store/src/run.ts): identity, max_deadline_at and created_at
-- never change.
create trigger run_change
  before update on run
  for each row execute function app.allow_only(
    'status', 'attempt', 'cancel_requested_at', 'idle_deadline_at', 'cap_usd', 'spent_usd',
    'completed_at'
  );

create trigger run_inbox_change
  before update on run_inbox
  for each row execute function app.allow_only('status');

-- A run event is never updated, and never deleted while its run exists: only with its run, as
-- the pod's delete cascades. It reads past row-level security, so a run hidden from the caller is
-- never taken for a deleted one.
create function app.run_event_kept() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and not exists (select from run where id = old.run_id) then
    return old;
  end if;
  raise exception 'run_event rows are never % (packages/contracts/RULES.md rule 11)',
    lower(tg_op) || 'd'
    using errcode = 'restrict_violation';
end
$$;

create trigger run_event_append_only
  before update or delete on run_event
  for each row execute function app.run_event_kept();

-- seq is the run's max + 1. A row inserted earlier in the same statement counts, so one insert of
-- several events numbers them in order.
create function app.run_event_next() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  last integer;
begin
  select max(seq) into last from run_event where run_id = new.run_id;
  if new.seq <> coalesce(last, 0) + 1 then
    raise exception 'run_event seq is %, not % for run % (gapless, max + 1)',
      new.seq, coalesce(last, 0) + 1, new.run_id
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger run_event_gapless
  before insert on run_event
  for each row execute function app.run_event_next();

-- Row-level security: every table compares pod_id with the caller's pod.

do $$
declare
  t text;
begin
  foreach t in array array['conversation', 'run', 'run_event', 'run_inbox'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy pod_scope on %I using (pod_id = app.current_pod_id()) '
      'with check (pod_id = app.current_pod_id())', t
    );
  end loop;
end
$$;

-- The pod behind a run id, for authorizeRun (packages/store's findRunPod). Reads past row-level
-- security on purpose, as app.attempt_pod() does, and returns nothing else.
create function app.run_pod(run_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select pod_id from run where id = run_id
$$;

-- The sweep's read (packages/store's listRunsDue): every run in any pod that has not ended and
-- whose idle or hard deadline is at or before at_time.
create function app.runs_due(at_time timestamptz) returns setof run
language sql stable security definer set search_path = public, pg_temp
as $$
  select * from run
  where status in ('queued', 'in_progress', 'awaiting_input')
    and (idle_deadline_at <= at_time or max_deadline_at <= at_time)
  order by created_at, id
$$;

-- The step consumer's role (wave 1 Lead decision 7): like jadwigo_api, it owns no table, never
-- bypasses row-level security, and sets app.pod_id per unit after authorizeRun. Its login is set
-- per environment, outside migrations. It reads and writes the engine's records only; the lesson
-- verbs' reach is granted with them.
do $$
begin
  if not exists (select from pg_roles where rolname = 'jadwigo_runner') then
    create role jadwigo_runner nologin nobypassrls;
  end if;
end
$$;

grant usage on schema public, app to jadwigo_runner;
alter default privileges in schema app grant execute on functions to jadwigo_runner;
grant execute on all functions in schema app to jadwigo_runner;

-- The API writes the conversation, the run, the inbox and the parent's own events, and sets
-- cancel_requested_at; the step consumer appends events and moves the run and the inbox on. Both go
-- through the store, whose update shape run_change and run_inbox_change hold. Neither deletes.
do $$
declare
  r text;
begin
  foreach r in array array['jadwigo_api', 'jadwigo_runner'] loop
    execute format('grant select, insert on conversation, run, run_event, run_inbox to %I', r);
    execute format(
      'grant update (status, attempt, cancel_requested_at, idle_deadline_at, cap_usd, spent_usd, '
      'completed_at) on run to %I', r
    );
    execute format('grant update (status) on run_inbox to %I', r);
  end loop;
end
$$;

-- New functions are executable by PUBLIC: the 2 trigger functions are only the triggers'.
revoke execute on function app.run_event_kept(), app.run_event_next()
  from public, jadwigo_api, jadwigo_runner;
