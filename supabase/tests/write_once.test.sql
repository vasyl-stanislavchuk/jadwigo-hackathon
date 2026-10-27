-- Content is write-once and evidence append-only (RULES.md rules 10 and 11).
begin;
select plan(14);
\ir _fixture.sql

select throws_ok(
  $$update attempt_answer set correct = true where event_id = '00000000-0000-4000-8000-0000000007a1'$$,
  '23001', null, 'an attempt answer refuses update'
);
select throws_ok(
  $$delete from attempt_answer where event_id = '00000000-0000-4000-8000-0000000007a1'$$,
  '23001', null, 'an attempt answer refuses delete'
);
select throws_ok($$truncate attempt_answer cascade$$, '23001', null, 'attempt_answer refuses truncate');

select throws_ok(
  $$update lesson_question set say = 'Edited' where id = '00000000-0000-4000-8000-0000000003a1'$$,
  '23001', null, 'a lesson question refuses update: an edit makes a new row'
);

select throws_ok(
  $$update lesson_version set published_at = now() where id = '00000000-0000-4000-8000-0000000004a1'$$,
  '23001', null, 'a published version refuses change'
);
select throws_ok(
  $$delete from lesson_version where id = '00000000-0000-4000-8000-0000000004a1'$$,
  '23001', null, 'a published version refuses delete'
);
select throws_ok(
  $$insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role)
    values ('00000000-0000-4000-8000-0000000004a1', 4, '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000003a2', 'spare')$$,
  '23001', null, 'a published version''s list refuses a new question'
);
select throws_ok(
  $$delete from lesson_version_question where lesson_version_id = '00000000-0000-4000-8000-0000000004a1'$$,
  '23001', null, 'a published version''s list refuses delete'
);

-- A draft version can still be listed and then published, once.
insert into lesson_version (id, pod_id, lesson_id, version, revises) values
  ('00000000-0000-4000-8000-0000000004a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002a1', 2, '00000000-0000-4000-8000-0000000004a1');
select lives_ok(
  $$insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role)
    values ('00000000-0000-4000-8000-0000000004a2', 1, '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-0000000003a2', 'planned');
    update lesson_version set published_at = now() where id = '00000000-0000-4000-8000-0000000004a2'$$,
  'a draft version is listed, then published'
);

select throws_ok(
  $$update attempt_question set lesson_question_id = '00000000-0000-4000-8000-0000000003a2'
    where attempt_id = '00000000-0000-4000-8000-0000000006b1' and seq = 1$$,
  '23001', null, 'on an attempt question only help_released and ended change'
);
select throws_ok(
  $$update attempt_question set ended = 'correct'
    where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 1$$,
  '23001', null, 'an attempt question ends once'
);
select throws_ok(
  $$update attempt_question set help_released = 0
    where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 1$$,
  '23001', null, 'help_released only counts up'
);
select throws_ok(
  $$update attempt set player_name = 'Someone' where id = '00000000-0000-4000-8000-0000000006a1'$$,
  '23001', null, 'on an attempt only status, resume_at and finished_at change'
);
select lives_ok(
  $$update attempt set status = 'paused', resume_at = 3 where id = '00000000-0000-4000-8000-0000000006a1'$$,
  'an attempt pauses with the seq to come back to'
);

select * from finish();
rollback;
