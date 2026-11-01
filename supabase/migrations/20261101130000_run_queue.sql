-- The Supabase-native engine's moving parts (epic dl-z5ja, issue dl-z5ja.52), over the tables of
-- 20261101120000_run.sql: the pgmq queue agent_step and its dead-letter queue, a pg_cron sweep
-- that enqueues every run past a deadline, and a trigger that broadcasts each run event on the
-- run's private Realtime topic. Only for option C of dl-z5ja.8 (docs/research/ai-chat-engine.md).
--
-- Locally and in CI, pgmq is the real extension (`make pgmq`, 1.5.1 as on Supabase), and pg_cron
-- and Realtime are the stubs in supabase/tests/shim.sql (dl-z5ja.4).
--
-- A queue message is @jadwigo/contracts/run's RunStepInput: {run_id, attempt}, the run's wire id
-- and the attempt it was sent for. It carries no learner data, so the queue tables, which pgmq owns
-- in its own schema, hold no pod_id: the step that reads one finds the pod with app.run_pod().

create extension if not exists pgmq;

select pgmq.create('agent_step');
-- A step read more than its limit moves here with app.agent_step_dead_letter(); its run is failed
-- by the engine, fenced on attempt as every run change is.
select pgmq.create('agent_step_dlq');

-- A record's wire id, as packages/contracts/src/ids.ts writes it: the prefix, then the uuid as 26
-- lowercase Crockford base32 characters (RULES.md rule 8). run_queue.test.sql pins it against
-- the TypeScript encoder.
create function app.wire_id(prefix text, id uuid) returns text
language sql immutable strict
as $$
  select prefix || string_agg(
    substr('0123456789abcdefghjkmnpqrstvwxyz', substring(b from g * 5 + 1 for 5)::integer + 1, 1),
    '' order by g
  )
  from (select b'00' || ('x' || replace(id::text, '-', ''))::bit(128) as b) as s,
    generate_series(0, 25) as g
$$;

-- The sweep (wave 1 Lead decision 10; packages/store's listRunsDue): one message per run past a
-- deadline that has none waiting, so a run is never queued twice by the sweep. The step it starts
-- decides what the deadline means for the run. Runs as the job's role, past row-level security.
-- The step it sends carries the run's current attempt, so the consumer (dl-z5ja.20) checks the
-- deadline first and takes the sweep path (claim attempt + 1, close the run), never a model call.
create function app.enqueue_runs_due() returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  sent integer := 0;
  r run;
begin
  for r in select * from app.runs_due(now()) loop
    continue when exists (
      select from pgmq.q_agent_step as q where q.message ->> 'run_id' = app.wire_id('run_', r.id)
    );
    perform pgmq.send(
      'agent_step', jsonb_build_object('run_id', app.wire_id('run_', r.id), 'attempt', r.attempt)
    );
    sent := sent + 1;
  end loop;
  return sent;
end
$$;

-- Moves one step to the dead-letter queue with the count of its reads, and archives it, in one
-- statement: a step is never lost between the 2 queues, nor in both.
create function app.agent_step_dead_letter(msg_id bigint) returns bigint
language sql security definer set search_path = public, pg_temp
as $$
  with moved as (
    select q.msg_id, pgmq.send(
      'agent_step_dlq', q.message || jsonb_build_object('read_ct', q.read_ct, 'msg_id', q.msg_id)
    ) as dlq_msg_id
    from pgmq.q_agent_step as q
    where q.msg_id = agent_step_dead_letter.msg_id
  )
  select dlq_msg_id from moved where pgmq.archive('agent_step', moved.msg_id)
$$;

-- Each run event goes out on the run's private topic, run:<run id>, whole, as the page folds it
-- (seq is the cursor, event_id the dedupe key). The page reads the rest from run_event after
-- seq, so a broadcast that is lost costs nothing; realtime.send turns its own errors into
-- warnings, so the insert never fails for it. security definer: Realtime's table is not the
-- caller's to write.
create function app.run_event_broadcast() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'run_id', app.wire_id('run_', new.run_id),
      'seq', new.seq,
      'event_id', new.event_id,
      'type', new.type,
      'payload', new.payload,
      'created_at', to_jsonb(new.created_at)
    ),
    'run_event',
    'run:' || app.wire_id('run_', new.run_id),
    true
  );
  return null;
end
$$;

create trigger run_event_broadcast
  after insert on run_event
  for each row execute function app.run_event_broadcast();

-- Every 30 seconds (pg_cron 1.6 takes seconds), as the migrating role. Where pg_cron is not
-- installable, the shim's cron.schedule records the job and nothing runs it.
do $$
begin
  if exists (select from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  perform cron.schedule('run-sweep', '30 seconds', 'select app.enqueue_runs_due()');
end
$$;

-- The API enqueues a step with its inbox row, in one transaction; the step consumer reads,
-- hides, archives and dead-letters. pgmq's functions run as their caller and keep PUBLIC's
-- EXECUTE, so what a role may do is USAGE on pgmq and its grants on the 2 queues' tables: the API
-- only sends to agent_step (insert, and the msg_id it answers), and neither role may create or
-- drop a queue.
grant usage on schema pgmq to jadwigo_api, jadwigo_runner;
grant select, insert, update, delete on pgmq.q_agent_step, pgmq.a_agent_step,
  pgmq.q_agent_step_dlq, pgmq.a_agent_step_dlq to jadwigo_runner;
grant insert, select (msg_id) on pgmq.q_agent_step to jadwigo_api;
grant usage on all sequences in schema pgmq to jadwigo_api, jadwigo_runner;
grant execute on function app.agent_step_dead_letter(bigint) to jadwigo_runner;

revoke execute on function app.enqueue_runs_due(), app.run_event_broadcast() from public, jadwigo_api;
revoke execute on function app.agent_step_dead_letter(bigint) from public, jadwigo_api;
-- Only the security definer functions above call it, as their owner.
revoke execute on function app.wire_id(text, uuid) from public, jadwigo_api;
