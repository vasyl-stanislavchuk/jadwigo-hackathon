-- An inbox event_id is unique per pod (migration 20261101210000_run_inbox_event_id_per_pod.sql,
-- issue dl-z5ja.86): the same event_id in 2 pods is 2 rows, and within a pod it is still written
-- once. Made-up rows only.
begin;
select plan(4);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into run (id, pod_id, created_by, workflow, idle_deadline_at, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05),
  ('00000000-0000-4000-8000-0000000d00a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05),
  ('00000000-0000-4000-8000-0000000d00b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000a0b1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05);

-- As the API, each pod in its own scope.
set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
insert into run_inbox (event_id, run_id, pod_id, kind, payload) values
  ('00000000-0000-4000-8000-0000000e01a1', '00000000-0000-4000-8000-0000000d00a1',
   '00000000-0000-4000-8000-00000000000a', 'message', '{"text": "Make it 5 questions."}');
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select lives_ok(
  $$insert into run_inbox (event_id, run_id, pod_id, kind, payload) values
    ('00000000-0000-4000-8000-0000000e01a1', '00000000-0000-4000-8000-0000000d00b1',
     '00000000-0000-4000-8000-00000000000b', 'message', '{"text": "Adding within 20."}')$$,
  'another pod writes its own row under the same event_id'
);
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$insert into run_inbox (event_id, run_id, pod_id, kind, payload) values
    ('00000000-0000-4000-8000-0000000e01a1', '00000000-0000-4000-8000-0000000d00a2',
     '00000000-0000-4000-8000-00000000000a', 'message', '{"text": "Again."}')$$,
  '23505', null,
  'within a pod the event_id is still written once, across its runs'
);
reset role;

select results_eq(
  $$select pod_id, payload ->> 'text' from run_inbox
    where event_id = '00000000-0000-4000-8000-0000000e01a1' order by pod_id$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid, 'Make it 5 questions.'),
           ('00000000-0000-4000-8000-00000000000b'::uuid, 'Adding within 20.')$$,
  'so the same event_id is 2 rows, one in each pod'
);
select col_is_pk('run_inbox', array['pod_id', 'event_id'], 'the key is (pod_id, event_id)');

select * from finish();
rollback;
