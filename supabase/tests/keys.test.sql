-- The keys that make writes from the page idempotent (RULES.md rules 7 and 19).
begin;
select plan(7);
\ir _fixture.sql

select col_is_pk('attempt_answer', 'event_id', 'event_id is attempt_answer''s key');
select throws_ok(
  $$insert into attempt_answer
      (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at, body_hash)
    values ('00000000-0000-4000-8000-0000000007a1', '00000000-0000-4000-8000-00000000000b',
            '00000000-0000-4000-8000-0000000006b1', 1, 1, 'try', '{"entered": "4"}', 1000,
            now(), now(), 'x')$$,
  '23505', null, 'an event_id is stored once'
);
select throws_ok(
  $$insert into attempt_answer
      (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at, body_hash)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000006a1', 1, 1, 'try', '{"entered": "6"}', 1000,
            now(), now(), 'y')$$,
  '23505', null, 'a 2nd event_id for one try is refused: (attempt_id, seq, try_no) is unique'
);
select throws_ok(
  $$insert into attempt_answer
      (event_id, pod_id, attempt_id, seq, try_no, kind, skip_reason, latency_ms, asked_at, answered_at, body_hash)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000006a1', 1, 2, 'skip', 'dont_know', 1000,
            now(), now(), 'z')$$,
  '23505', null, 'a skip takes a try_no too, so it cannot share one'
);
select throws_ok(
  $$insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added)
    values ('00000000-0000-4000-8000-0000000006a1', 3, '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000003a1', 'planned')$$,
  '23505', null, 'a seq is asked once per attempt'
);
select throws_ok(
  $$insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added)
    values ('00000000-0000-4000-8000-0000000006b1', 2, '00000000-0000-4000-8000-00000000000b',
            '00000000-0000-4000-8000-0000000003a1', 'planned')$$,
  '23503', null, 'an attempt question cannot point at another pod''s lesson question'
);

insert into lesson_version (id, pod_id, lesson_id, version) values
  ('00000000-0000-4000-8000-0000000004a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002a1', 2);
insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role)
  values ('00000000-0000-4000-8000-0000000004a2', 1, '00000000-0000-4000-8000-00000000000a',
          '00000000-0000-4000-8000-0000000003a1', 'planned');
select throws_ok(
  $$insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role)
    values ('00000000-0000-4000-8000-0000000004a2', 2, '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000003a1', 'spare')$$,
  '23505', null, 'a version lists a lesson question once'
);

select * from finish();
rollback;
