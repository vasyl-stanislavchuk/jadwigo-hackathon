-- A parent patch's resolution is a run event (migration 20261101300000_run_event_patch_resolved.sql,
-- issue dl-z5ja.135): run_event takes the type, reads the row back whole, keeps it in its pod and
-- broadcasts its ids only, as every type. Made-up rows only.
begin;
select plan(5);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid());
insert into run (id, pod_id, created_by, workflow, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose', now() + interval '30 minutes', 0.05);

select ok(
  (enum_range(null::run_event_type)::text[])[
    array_position(enum_range(null::run_event_type)::text[], 'steer') + 1] = 'patch_resolved',
  'run_event_type lists patch_resolved, right after steer'
);

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select lives_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00a1', 1, '00000000-0000-4000-8000-0000000e01a1',
     '00000000-0000-4000-8000-00000000000a', 'patch_resolved',
     '{"steer_event_id": "00000000-0000-4000-8000-0000000e00a1", "applied": false, "reason": "stale_base"}')$$,
  'the runner logs a patch_resolved event'
);
select results_eq(
  $$select type::text, payload ->> 'reason' from run_event
    where event_id = '00000000-0000-4000-8000-0000000e01a1'$$,
  $$values ('patch_resolved', 'stale_base')$$,
  'and reads it back whole'
);
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is_empty(
  $$select from run_event where event_id = '00000000-0000-4000-8000-0000000e01a1'$$,
  'another pod does not read it'
);
reset role;

select is(
  (select count(*)::int from realtime.messages
   where topic like 'run:%' and payload ->> 'event_id' = '00000000-0000-4000-8000-0000000e01a1'
     and not payload ? 'payload'),
  1, 'it is broadcast by its ids, never its payload'
);

select * from finish();
rollback;
