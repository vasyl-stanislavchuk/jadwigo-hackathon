-- A steer is logged as a run event (migration 20261101150000_run_event_steer.sql, issue
-- dl-z5ja.51): run_event takes the type and reads the row back whole, and the inbox's steer row
-- keeps its source and question ids. Made-up rows only.
begin;
select plan(3);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid());
insert into conversation (id, pod_id, created_by, title) values
  ('00000000-0000-4000-8000-0000000c00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', null);
insert into run (id, pod_id, created_by, conversation_id, workflow, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-0000000c00a1',
   'jadwigo-lesson-compose', now() + interval '30 minutes', 0.05);

select ok(
  'steer' = any(enum_range(null::run_event_type)::text[]),
  'run_event_type lists steer'
);

insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, '00000000-0000-4000-8000-0000000e01a1',
   '00000000-0000-4000-8000-00000000000a', 'steer',
   '{"text": "I changed question 2.", "source": "lesson_edit", "question_ids": ["s02"]}');
select results_eq(
  $$select type::text, payload from run_event where event_id = '00000000-0000-4000-8000-0000000e01a1'$$,
  $$values ('steer', '{"text": "I changed question 2.", "source": "lesson_edit", "question_ids": ["s02"]}'::jsonb)$$,
  'a steer run event is written and read back whole'
);

insert into run_inbox (event_id, run_id, pod_id, kind, payload) values
  ('00000000-0000-4000-8000-0000000f00a1', '00000000-0000-4000-8000-0000000d00a1',
   '00000000-0000-4000-8000-00000000000a', 'steer',
   '{"text": "Shorter, please.", "source": "chat"}');
select is(
  (select payload ->> 'source' from run_inbox where event_id = '00000000-0000-4000-8000-0000000f00a1'),
  'chat',
  'an inbox steer keeps its source'
);

select * from finish();
rollback;
