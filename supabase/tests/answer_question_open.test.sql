-- An answer is written only while its attempt question is open (migration
-- 20261029100000_answer_question_open.sql, issue dl-e8ov.2.32.19).
begin;
select plan(4);
\ir _fixture.sql

create function pg_temp.try_on(seq integer, try_no integer) returns void language sql as $$
  insert into attempt_answer
    (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
     correct, judged_by, body_hash)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
          '00000000-0000-4000-8000-0000000006a1', seq, try_no, 'try', '{"entered": "6"}', 1000,
          now(), now(), true, 'enter@1', 't')
$$;

-- Pod A's attempt: seq 1 ended skipped, seq 2 and 3 ended correct.
select throws_ok($$select pg_temp.try_on(1, 3)$$, '23001',
  'attempt question 1 of attempt 00000000-0000-4000-8000-0000000006a1 has ended',
  'no try after a question ended skipped');
select throws_ok($$select pg_temp.try_on(3, 2)$$, '23001', null,
  'no try after a question ended correct');

-- An open question takes its try.
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006a1', 4, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a1', 'planned');
select lives_ok($$select pg_temp.try_on(4, 1)$$, 'an open question takes a try');

select is(
  (select tgname::text from pg_trigger where tgrelid = 'attempt_answer'::regclass
     and tgname = 'attempt_answer_question_open'),
  'attempt_answer_question_open', 'the refusal names its constraint for the store to map'
);

select * from finish();
rollback;
