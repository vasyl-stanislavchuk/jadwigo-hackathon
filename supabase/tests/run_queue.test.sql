-- The engine's queue, sweep and broadcast (migration 20261101130000_run_queue.sql, issue
-- dl-z5ja.52): an inserted run event reaches realtime.send on its run's private topic with its seq;
-- the sweep is scheduled and enqueues each run past a deadline once; a step moves to the
-- dead-letter queue whole. pg_cron and Realtime are the shim's stubs here. Made-up rows only.
begin;
select plan(20);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid());
insert into conversation (id, pod_id, created_by, title) values
  ('00000000-0000-4000-8000-0000000c00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', null);
insert into run (id, pod_id, created_by, conversation_id, workflow, idle_deadline_at, max_deadline_at, cap_usd)
values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-0000000c00a1',
   'jadwigo-lesson-compose', now() + interval '10 minutes', now() + interval '30 minutes', 0.05),
  ('00000000-0000-4000-8000-0000000d00a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-0000000c00a1',
   'jadwigo-lesson-compose', now() - interval '1 minute', now() + interval '30 minutes', 0.05);

-- Wire ids, as packages/contracts/src/ids.ts writes them.
select is(
  app.wire_id('pod_', 'ced09f15-d79b-590a-ae25-5a63ff918fea'),
  'pod_6et2fhbnwvb45aw9atcfzs33za',
  'app.wire_id matches the TypeScript encoder (FEATURED_POD_ID)'
);
select is(
  app.wire_id('run_', 'ffffffff-ffff-4fff-bfff-ffffffffffff'),
  'run_7zzzzzzzzz9zzvzzzzzzzzzzzz',
  'and at the top of the range'
);

-- The broadcast.
insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, '00000000-0000-4000-8000-0000000e01a1',
   '00000000-0000-4000-8000-00000000000a', 'message', '{"from": "parent", "text": "Adding to 20"}'),
  ('00000000-0000-4000-8000-0000000d00a1', 2, '00000000-0000-4000-8000-0000000e02a1',
   '00000000-0000-4000-8000-00000000000a', 'status', '{"status": "in_progress"}');
select results_eq(
  $$select topic, event, private, (payload ->> 'seq')::int, payload ->> 'type'
    from realtime.messages order by (payload ->> 'seq')::int$$,
  $$values ('run:run_0000000000800800000000t051', 'run_event', true, 1, 'message'),
           ('run:run_0000000000800800000000t051', 'run_event', true, 2, 'status')$$,
  'each inserted run event reaches realtime.send on run:<run id>, private, with its seq'
);
select is(
  (select payload - 'id' - 'created_at' from realtime.messages where payload ->> 'seq' = '1'),
  jsonb_build_object(
    'run_id', 'run_0000000000800800000000t051', 'seq', 1,
    'event_id', '00000000-0000-4000-8000-0000000e01a1', 'type', 'message',
    'payload', '{"from": "parent", "text": "Adding to 20"}'::jsonb
  ),
  'the broadcast carries the event whole, as the page folds it'
);
select ok(
  (select (m.payload ->> 'created_at')::timestamptz = e.created_at
   from realtime.messages as m join run_event as e on e.seq = (m.payload ->> 'seq')::int
   where e.seq = 1),
  'with its created_at'
);

-- A broadcast that fails never fails the event's insert.
alter table realtime.messages add constraint refuse_all check (false) not valid;
set local client_min_messages = error;
select lives_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00a1', 3, gen_random_uuid(),
     '00000000-0000-4000-8000-00000000000a', 'turn_complete', '{}')$$,
  'a lost broadcast never fails the insert'
);
reset client_min_messages;
alter table realtime.messages drop constraint refuse_all;
select is((select max(seq) from run_event), 3, 'and the event is kept');

-- The sweep.
select results_eq(
  $$select schedule, command from cron.job where jobname = 'run-sweep'$$,
  $$values ('30 seconds', 'select app.enqueue_runs_due()')$$,
  'the sweep is scheduled every 30 seconds'
);
select is(app.enqueue_runs_due(), 1, 'the sweep enqueues the one run past its idle deadline');
select results_eq(
  $$select message from pgmq.q_agent_step$$,
  $$values ('{"run_id": "run_0000000000800800000000t052", "attempt": 1}'::jsonb)$$,
  'as a RunStepInput: the run''s wire id and its attempt'
);
select is(app.enqueue_runs_due(), 0, 'and never again while its step waits');

-- Dead letter.
select is(
  (select read_ct from pgmq.read('agent_step', 0, 1)), 1, 'a read counts'
);
select ok(app.agent_step_dead_letter(1) is not null, 'a step moves to the dead-letter queue');
select results_eq(
  $$select (select count(*) from pgmq.q_agent_step)::int, (select count(*) from pgmq.a_agent_step)::int$$,
  $$values (0, 1)$$,
  'it leaves agent_step for its archive'
);
select is(
  (select message from pgmq.q_agent_step_dlq),
  '{"run_id": "run_0000000000800800000000t052", "attempt": 1, "read_ct": 1, "msg_id": 1}'::jsonb,
  'and arrives whole, with its read count'
);

-- Who may touch the queues.
select ok(
  has_table_privilege('jadwigo_api', 'pgmq.q_agent_step', 'insert')
  and not has_column_privilege('jadwigo_api', 'pgmq.q_agent_step', 'message', 'select'),
  'the API only sends steps'
);
select ok(
  not has_function_privilege('jadwigo_runner', 'app.enqueue_runs_due()', 'execute')
  and not has_function_privilege('jadwigo_api', 'app.enqueue_runs_due()', 'execute'),
  'the sweep is the job''s alone'
);

set local role jadwigo_api;
select lives_ok($$select pgmq.send('agent_step', '{"run_id": "run_made_up", "attempt": 1}')$$, 'the API sends a step');
reset role;
set local role jadwigo_runner;
select is((select read_ct from pgmq.read('agent_step', 30, 1)), 1, 'the runner reads it');
select ok(pgmq.archive('agent_step', 2::bigint), 'and archives it');
reset role;

select * from finish();
rollback;
