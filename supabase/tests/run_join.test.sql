-- Who may join a run's private Realtime topic (migration 20261101180000_run_join_policy.sql, issue
-- dl-z5ja.61): a signed-in user whose token's pod owns the run selects its topic's message, as
-- Realtime's join check does with realtime.topic() set; another pod's user, a user with no pod and
-- a made-up topic are refused. Realtime is the shim's stub here. Made-up rows only.
begin;
select plan(12);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into run (id, pod_id, created_by, workflow, idle_deadline_at, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05),
  ('00000000-0000-4000-8000-0000000d00b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000a0b1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05);
insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, gen_random_uuid(),
   '00000000-0000-4000-8000-00000000000a', 'status', '{"status": "in_progress"}'),
  ('00000000-0000-4000-8000-0000000d00b1', 1, gen_random_uuid(),
   '00000000-0000-4000-8000-00000000000b', 'status', '{"status": "in_progress"}');

-- The wire id's inverse.
select is(
  app.wire_uuid('run_', 'run_0000000000800800000000t051'),
  '00000000-0000-4000-8000-0000000d00a1'::uuid,
  'app.wire_uuid reads back what app.wire_id wrote'
);
select is(
  app.wire_uuid('run_', app.wire_id('run_', 'ffffffff-ffff-4fff-bfff-ffffffffffff')),
  'ffffffff-ffff-4fff-bfff-ffffffffffff'::uuid,
  'at the top of the range too'
);
select ok(
  app.wire_uuid('run_', 'pod_0000000000800800000000t051') is null
    and app.wire_uuid('run_', 'run_0000000000800800000000t05') is null
    and app.wire_uuid('run_', 'run_8000000000800800000000t051') is null
    and app.wire_uuid('run_', 'run_00000000008008000000000i51') is null,
  'a wrong prefix, length, first character or letter is null, never an error'
);

-- Who may call what.
select ok(
  has_schema_privilege('authenticated', 'realtime_join', 'usage')
    and has_function_privilege('authenticated', 'realtime_join.can_join_run(text)', 'execute')
    and not has_function_privilege('anon', 'realtime_join.can_join_run(text)', 'execute')
    and not has_function_privilege('jadwigo_api', 'app.wire_uuid(text, text)', 'execute'),
  'authenticated may call the join check, anon may not, and app.wire_uuid is the definer''s'
);
select ok(
  not has_schema_privilege('authenticated', 'app', 'usage'),
  'and authenticated still has no USAGE on app'
);

-- Realtime's join check, as the user: realtime.topic() names the topic, then a select.
set local role authenticated;
set local "request.jwt.claims" = '{"role": "authenticated", "pod_id": "00000000-0000-4000-8000-00000000000a"}';
set local realtime.topic = 'run:run_0000000000800800000000t051';
select is(
  (select count(*) from realtime.messages where topic = 'run:run_0000000000800800000000t051')::int,
  1,
  'the run''s pod joins its run''s topic'
);
select is(
  (select payload ->> 'seq' from realtime.messages where topic = 'run:run_0000000000800800000000t051'),
  '1',
  'and reads its message'
);

set local "request.jwt.claims" = '{"role": "authenticated", "pod_id": "00000000-0000-4000-8000-00000000000b"}';
select is(
  (select count(*) from realtime.messages)::int, 0, 'another pod is refused'
);

-- Pod B's run, whose wire id is run_0000000000800800000000t05h: its own pod joins, so the topic
-- names a real run and the refusal below is the pod check's.
set local realtime.topic = 'run:run_0000000000800800000000t05h';
select is(
  (select count(*) from realtime.messages where topic = 'run:run_0000000000800800000000t05h')::int,
  1,
  'pod B joins its own run''s topic'
);
set local "request.jwt.claims" = '{"role": "authenticated", "pod_id": "00000000-0000-4000-8000-00000000000a"}';
select is(
  (select count(*) from realtime.messages)::int, 0, 'and pod A is refused pod B''s run'
);

set local realtime.topic = 'run:run_0000000000800800000000t051';
set local "request.jwt.claims" = '{"role": "authenticated"}';
select is(
  (select count(*) from realtime.messages)::int, 0, 'a token with no pod is refused'
);

set local "request.jwt.claims" = '{"role": "authenticated", "pod_id": "00000000-0000-4000-8000-00000000000a"}';
set local realtime.topic = 'run:not-a-run';
select is(
  (select count(*) from realtime.messages)::int, 0, 'a made-up topic is refused, not an error'
);
reset role;

select * from finish();
rollback;
