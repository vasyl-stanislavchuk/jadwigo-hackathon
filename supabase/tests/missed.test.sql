-- A question ends `missed` only while verdicts are held, after a wrong try and no right one
-- (migration 20261027210000_ended_missed.sql, decision
-- 2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a).
begin;
select plan(7);
\ir _fixture.sql

-- A wrong try, as the API writes it before it ends the question.
create function pg_temp.wrong_try(attempt uuid, seq integer) returns void language sql as $$
  insert into attempt_answer
    (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
     correct, judged_by, body_hash)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000b', attempt, seq, 1, 'try',
          '{"entered": "4"}', 1000, now(), now(), false, 'enter@1', 'w')
$$;

-- Pod B gets a 2nd assignment of the same lesson, holding verdicts, and an attempt on it.
insert into assignment (id, pod_id, lesson_id, audience, identity, after_not_sure, hold_verdicts) values
  ('00000000-0000-4000-8000-0000000005b2', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b1', 'anyone', 'none', 'next', true);
insert into attempt (id, pod_id, assignment_id, lesson_version_id) values
  ('00000000-0000-4000-8000-0000000006b2', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000005b2', '00000000-0000-4000-8000-0000000004b1');
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006b2', 1, '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b1', 'planned');

-- Practice (the fixture's attempt, verdicts not held): a wrong try keeps the question open.
select pg_temp.wrong_try('00000000-0000-4000-8000-0000000006b1', 1);
select throws_ok(
  $$update attempt_question set ended = 'missed'
    where attempt_id = '00000000-0000-4000-8000-0000000006b1' and seq = 1$$,
  '23001', 'a question ends missed only while its assignment holds verdicts',
  'practice: a wrong try never ends a question missed'
);

-- Held: missed needs a wrong try first.
select throws_ok(
  $$update attempt_question set ended = 'missed'
    where attempt_id = '00000000-0000-4000-8000-0000000006b2' and seq = 1$$,
  '23001', 'a question ends missed only after a wrong try and no right one',
  'held: a question with no try does not end missed'
);
select throws_ok(
  $$insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added, ended)
    values ('00000000-0000-4000-8000-0000000006b2', 2, '00000000-0000-4000-8000-00000000000b',
            '00000000-0000-4000-8000-0000000003b1', 'planned', 'missed')$$,
  '23001', 'a question ends missed only after a wrong try and no right one',
  'held: a question is not written already missed'
);

select pg_temp.wrong_try('00000000-0000-4000-8000-0000000006b2', 1);
select lives_ok(
  $$update attempt_question set ended = 'missed'
    where attempt_id = '00000000-0000-4000-8000-0000000006b2' and seq = 1$$,
  'held: one wrong try ends the question missed'
);
select results_eq(
  $$select ended::text, correct, tries from attempt_result
    where attempt_id = '00000000-0000-4000-8000-0000000006b2' and seq = 1$$,
  $$values ('missed', false, 1)$$,
  'attempt_result shows it missed, not correct, after 1 try'
);
select throws_ok(
  $$update attempt_question set ended = 'correct'
    where attempt_id = '00000000-0000-4000-8000-0000000006b2' and seq = 1$$,
  '23001', 'an attempt question ends once', 'a missed question ends once'
);

-- Held, but the try was right: that is correct, never missed.
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006b2', 2, '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b1', 'planned');
insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000b',
        '00000000-0000-4000-8000-0000000006b2', 2, 1, 'try', '{"entered": "5"}', 1000, now(), now(),
        true, 'enter@1', 'r');
select throws_ok(
  $$update attempt_question set ended = 'missed'
    where attempt_id = '00000000-0000-4000-8000-0000000006b2' and seq = 2$$,
  '23001', 'a question ends missed only after a wrong try and no right one',
  'held: a right try never ends missed'
);

select * from finish();
rollback;
