-- The learner knowledge base: the shared catalogue, goals with their skills, the mastery cache,
-- the parent's report and the evidence view (migrations 20261031120000_learner_knowledge.sql and
-- 20261031130000_learner_knowledge_fix.sql, issue dl-e8ov.5.43). Each case the issue names is
-- numbered in its description, (1) to (11).
--
-- Jadwigo's own pod, the shared one, holds the catalogue and a featured lesson. One anonymous
-- attempt at it is claimed by pod B's learner, another stays anonymous. Pod A has its own
-- catalogue, a goal, mastery and a report. Pod D is a 3rd pod with nothing.
begin;
select plan(58);
\ir _fixture.sql

insert into pod (id, name, language) values
  ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'Jadwigo', 'pl'),
  ('00000000-0000-4000-8000-00000000000d', 'Pod D', 'en');

-- The shared catalogue: a curriculum, one of its topics, and 2 skills under it.
insert into curriculum (id, pod_id, code, name, country, version, language) values
  ('00000000-0000-4000-8000-000000000c51', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   'pl-early', 'Early grades', 'PL', '2017', 'pl');
insert into topic (id, pod_id, curriculum_id, code, area, text) values
  ('00000000-0000-4000-8000-000000000d51', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-000000000c51', 'II.3.3', 'math', 'Multiplies within the tables.');
insert into skill (pod_id, code, topic_id, status, source) values
  ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'math.mul.equal-groups',
   '00000000-0000-4000-8000-000000000d51', 'reviewed', 'curriculum'),
  ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'math.mul.facts-2',
   '00000000-0000-4000-8000-000000000d51', 'reviewed', 'curriculum');

-- Pod A's own: a curriculum and topic, a draft skill, a goal with a skill, a topic and a lesson,
-- a mastery row and a report.
insert into curriculum (id, pod_id, code, name, country, version, language) values
  ('00000000-0000-4000-8000-000000000ca1', '00000000-0000-4000-8000-00000000000a',
   'home', 'Home plan', 'PL', '1', 'pl');
insert into topic (id, pod_id, curriculum_id, code, area, text) values
  ('00000000-0000-4000-8000-000000000da1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-000000000ca1', 'H.1', 'math', 'Groups of things.');
insert into skill (pod_id, code, status, source) values
  ('00000000-0000-4000-8000-00000000000a', 'math.mul.equal-groups', 'draft', 'parent');
insert into goal (id, pod_id, learner_id, name, words) values
  ('00000000-0000-4000-8000-0000000008a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000001a1', 'Tables of 2', 'Knows the 2 times table');
insert into goal_skill (pod_id, goal_id, skill_code) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000008a1', 'math.mul.equal-groups');
insert into goal_topic (pod_id, goal_id, topic_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000008a1',
   '00000000-0000-4000-8000-000000000d51');
insert into lesson_goal (pod_id, lesson_id, goal_id) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000002a1',
   '00000000-0000-4000-8000-0000000008a1');
insert into learner_skill_mastery (pod_id, learner_id, skill_code, level, tries) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000001a1',
   'math.mul.equal-groups', 'attempted', 4);
insert into learner_report (id, pod_id, learner_id, period_starts_at, period_ends_at, inputs_hash, digest) values
  ('00000000-0000-4000-8000-0000000008a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000001a1', '2026-10-20T00:00:00Z', '2026-10-27T00:00:00Z',
   'i1', '{"skills": []}');

-- A featured lesson in the shared pod: its 1st question carries 2 skill codes, its 2nd one.
insert into lesson (id, pod_id, title, language, category, subject, grade, skill_ids) values
  ('00000000-0000-4000-8000-0000000002f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   'Twos', 'pl', 'child', 'math', 2, '{math.mul.equal-groups,math.mul.facts-2}');
insert into lesson_question
  (id, pod_id, family, question_type, say, data, key, subject, skill_ids, content_hash)
values
  ('00000000-0000-4000-8000-0000000003f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   'enter', 'production', 'How many shoes?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["6"]}', 'math', '{math.mul.equal-groups,math.mul.facts-2}', 'f1'),
  ('00000000-0000-4000-8000-0000000003f2', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   'enter', 'production', 'How many socks?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["10"]}', 'math', '{math.mul.facts-2}', 'f2');
insert into lesson_version (id, pod_id, lesson_id, version) values
  ('00000000-0000-4000-8000-0000000004f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000002f1', 1);
insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role) values
  ('00000000-0000-4000-8000-0000000004f1', 1, 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000003f1', 'planned'),
  ('00000000-0000-4000-8000-0000000004f1', 2, 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000003f2', 'planned');
update lesson_version set published_at = '2026-10-27T08:00:00Z'
  where id = '00000000-0000-4000-8000-0000000004f1';
insert into assignment (id, pod_id, lesson_id, audience, identity) values
  ('00000000-0000-4000-8000-0000000005f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000002f1', 'anyone', 'none');

-- 2 anonymous attempts at it. The 1st: seq 1 correct, seq 2 skipped, finished, then claimed.
-- The 2nd: seq 1 correct, and never claimed.
insert into attempt (id, pod_id, assignment_id, lesson_version_id) values
  ('00000000-0000-4000-8000-0000000006f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000005f1', '00000000-0000-4000-8000-0000000004f1'),
  ('00000000-0000-4000-8000-0000000006f2', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000005f1', '00000000-0000-4000-8000-0000000004f1');
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006f1', 1, 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000003f1', 'planned'),
  ('00000000-0000-4000-8000-0000000006f2', 1, 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000003f1', 'planned');
insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007f1', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000006f1', 1, 1, 'try', '{"entered": "6"}', 2000,
   '2026-10-27T09:00:00Z', '2026-10-27T09:00:02Z', true, 'enter@1', 'f1'),
  ('00000000-0000-4000-8000-0000000007f3', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000006f2', 1, 1, 'try', '{"entered": "6"}', 2000,
   '2026-10-27T09:00:00Z', '2026-10-27T09:00:02Z', true, 'enter@1', 'f3');
update attempt_question set ended = 'correct' where seq = 1 and attempt_id in
  ('00000000-0000-4000-8000-0000000006f1', '00000000-0000-4000-8000-0000000006f2');
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006f1', 2, 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000003f2', 'planned');
insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, skip_reason, latency_ms, asked_at, answered_at, body_hash)
values
  ('00000000-0000-4000-8000-0000000007f2', 'ced09f15-d79b-590a-ae25-5a63ff918fea',
   '00000000-0000-4000-8000-0000000006f1', 2, 1, 'skip', 'dont_know', 1000,
   '2026-10-27T09:00:03Z', '2026-10-27T09:00:04Z', 'f2');
update attempt_question set ended = 'skipped'
  where attempt_id = '00000000-0000-4000-8000-0000000006f1' and seq = 2;
update attempt set status = 'finished', finished_at = now()
  where id = '00000000-0000-4000-8000-0000000006f1';

-- Pod B's parent claims the 1st for pod B's learner, the way the API does.
insert into account (id, pod_id, sub) values ('00000000-0000-4000-8000-0000000009b1',
  '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000c0b1');
insert into member (pod_id, account_id, role) values ('00000000-0000-4000-8000-00000000000b',
  '00000000-0000-4000-8000-0000000009b1', 'parent');
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select learner_id from app.claim_attempt('00000000-0000-4000-8000-0000000006f1',
  '00000000-0000-4000-8000-0000000001b1', '00000000-0000-4000-8000-0000000009b1');
select set_config('app.pod_id', '', true);

-- A preview attempt in pod A, by pod A's own learner, with a correct answer.
insert into attempt (id, pod_id, assignment_id, lesson_version_id, learner_id, mode) values
  ('00000000-0000-4000-8000-0000000006a9', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000004a1',
   '00000000-0000-4000-8000-0000000001a1', 'preview');
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006a9', 1, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a1', 'planned');
insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007a9', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000006a9', 1, 1, 'try', '{"entered": "6"}', 2000,
   '2026-10-27T09:00:00Z', '2026-10-27T09:00:02Z', true, 'enter@1', 'a9');

-- How many of pod A's learner knowledge rows the caller reads.
create function pg_temp.pod_a_rows_seen() returns bigint language sql as $$
  select (select count(*) from curriculum where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from topic where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from skill where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from goal_skill where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from goal_topic where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from lesson_goal where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from learner_skill_mastery where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from learner_report where pod_id = '00000000-0000-4000-8000-00000000000a')
$$;
grant execute on function pg_temp.pod_a_rows_seen() to jadwigo_api;

-- What the migration made.
select is(app.shared_pod_id(), 'ced09f15-d79b-590a-ae25-5a63ff918fea'::uuid,
  'app.shared_pod_id() is the featured pod (FEATURED_POD_ID, checked in shared-pod.test.ts)');
select enum_has_labels('skill_kind', array['accuracy', 'speed'], 'skill_kind has its labels');
select enum_has_labels('skill_status', array['reviewed', 'proposed', 'draft', 'retired'],
  'skill_status has its labels');
select enum_has_labels('goal_status', array['active', 'paused', 'reached', 'dropped'],
  'goal_status has its labels');
select enum_has_labels('mastery_level',
  array['not_started', 'attempted', 'familiar', 'proficient', 'mastered'], 'mastery_level has its labels');
select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class
   where relnamespace = 'public'::regnamespace and relname in ('curriculum', 'topic', 'skill',
     'goal_skill', 'goal_topic', 'lesson_goal', 'learner_skill_mastery', 'learner_report')),
  'the 8 new tables enable and force row-level security'
);

set local role jadwigo_api;

-- (1) and (2): pods stay apart.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(pg_temp.pod_a_rows_seen(), 8::bigint, '(1) pod A reads its own 8 learner knowledge rows');
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is(pg_temp.pod_a_rows_seen(), 0::bigint,
  '(1) pod B selects 0 of pod A''s curriculum, topic, skill, goal_skill, goal_topic, lesson_goal, mastery and report rows');
select throws_ok($$
  insert into skill (pod_id, code, status, source)
  values ('00000000-0000-4000-8000-00000000000a', 'math.mul.facts-2', 'draft', 'parent')
$$, '42501', null, '(2) pod B''s insert of a skill carrying pod A''s pod_id is refused');
select throws_ok($$
  insert into goal_skill (pod_id, goal_id, skill_code)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000008a1', 'math.mul.equal-groups')
$$, '42501', null, '(2) and of a goal_skill');
select throws_ok($$
  insert into learner_skill_mastery (pod_id, learner_id, skill_code, level)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000001a1',
    'math.mul.facts-2', 'familiar')
$$, '42501', null, '(2) and of a mastery row');
select throws_ok($$
  insert into learner_report (pod_id, learner_id, period_starts_at, period_ends_at, inputs_hash, digest)
  values ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000001a1',
    now(), now(), 'x', '{}')
$$, '42501', null, '(2) and of a report');

-- (3) The shared catalogue: read by every pod, written by none but its own.
select is(
  (select count(*) from skill where pod_id = app.shared_pod_id()), 2::bigint,
  '(3) pod B selects the shared pod''s skills through shared_read');
select is(
  (select count(*) from curriculum where pod_id = app.shared_pod_id())
    + (select count(*) from topic where pod_id = app.shared_pod_id()), 2::bigint,
  '(3) and its curriculum and topic');
select throws_ok($$
  insert into skill (pod_id, code, status, source)
  values ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'math.mul.facts-3', 'draft', 'parent')
$$, '42501', null, '(3) pod B''s insert of a skill with the shared pod''s pod_id is refused');
select throws_ok($$
  insert into curriculum (pod_id, code, name, country, version, language)
  values ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'x', 'X', 'PL', '1', 'pl')
$$, '42501', null, '(3) and of a curriculum');
select throws_ok($$
  insert into topic (pod_id, curriculum_id, code, area, text)
  values ('ced09f15-d79b-590a-ae25-5a63ff918fea', '00000000-0000-4000-8000-000000000c51', 'X.1', 'math', 'X')
$$, '42501', null, '(3) and of a topic');
select throws_ok($$
  update skill set status = 'retired' where pod_id = 'ced09f15-d79b-590a-ae25-5a63ff918fea'
$$, '42501', null, '(3) pod B''s update of a shared skill is refused: jadwigo_api has no update on skill');

-- The policy refuses it too, without the grant's help: with an update grant, shared_read still
-- reads only, so the update finds no row.
reset role;
grant update (status) on skill to jadwigo_api;
set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
update skill set status = 'retired' where pod_id = 'ced09f15-d79b-590a-ae25-5a63ff918fea';
reset role;
revoke update (status) on skill from jadwigo_api;
select is(
  (select array_agg(distinct status::text) from skill where pod_id = app.shared_pod_id()),
  array['reviewed'], '(3) even with an update grant, pod B''s update of the shared skills changes nothing');
set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);

-- A pod's row names a topic or curriculum of its own pod or the shared one, never another pod's
-- (the fix migration's restrictive policies: a foreign key checks past row-level security).
select lives_ok($$
  insert into skill (pod_id, code, topic_id, status, source)
  values ('00000000-0000-4000-8000-00000000000b', 'math.mul.facts-2',
    '00000000-0000-4000-8000-000000000d51', 'reviewed', 'curriculum')
$$, 'pod B copies a shared skill, keeping its shared topic');
select throws_ok($$
  insert into skill (pod_id, code, topic_id, status, source)
  values ('00000000-0000-4000-8000-00000000000b', 'math.mul.equal-groups',
    '00000000-0000-4000-8000-000000000da1', 'draft', 'parent')
$$, '42501', null, 'pod B''s skill cannot name pod A''s topic');
insert into goal (id, pod_id, learner_id, name) values ('00000000-0000-4000-8000-0000000008b1',
  '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000001b1', 'Twos');
select lives_ok($$
  insert into goal_topic (pod_id, goal_id, topic_id) values ('00000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-0000000008b1', '00000000-0000-4000-8000-000000000d51')
$$, 'pod B''s goal covers a shared topic');
select throws_ok($$
  insert into goal_topic (pod_id, goal_id, topic_id) values ('00000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-0000000008b1', '00000000-0000-4000-8000-000000000da1')
$$, '42501', null, 'pod B''s goal cannot cover pod A''s topic');
select lives_ok($$
  insert into learner (pod_id, handle, first_name, curriculum_id) values
    ('00000000-0000-4000-8000-00000000000b', 'elk', 'Elk', '00000000-0000-4000-8000-000000000c51')
$$, 'pod B''s learner follows the shared curriculum');
select throws_ok($$
  insert into learner (pod_id, handle, first_name, curriculum_id) values
    ('00000000-0000-4000-8000-00000000000b', 'emu', 'Emu', '00000000-0000-4000-8000-000000000ca1')
$$, '42501', null, 'pod B''s learner cannot follow pod A''s curriculum');

-- (4) The claimer's pod reads the evidence of the featured attempt its learner claimed: one row
-- per answer and skill code, the codes of the asked question's skill_ids.
select is(
  (select array_agg(row(learner_id, attempt_id, seq, try_no, kind, skill_code, correct)::text
     order by seq, try_no, skill_code) from learner_skill_evidence),
  array[
    row('00000000-0000-4000-8000-0000000001b1'::uuid, '00000000-0000-4000-8000-0000000006f1'::uuid,
      1, 1, 'try'::answer_kind, 'math.mul.equal-groups', true)::text,
    row('00000000-0000-4000-8000-0000000001b1'::uuid, '00000000-0000-4000-8000-0000000006f1'::uuid,
      1, 1, 'try'::answer_kind, 'math.mul.facts-2', true)::text,
    row('00000000-0000-4000-8000-0000000001b1'::uuid, '00000000-0000-4000-8000-0000000006f1'::uuid,
      2, 1, 'skip'::answer_kind, 'math.mul.facts-2', null::boolean)::text
  ],
  '(4) as pod B, the claimed featured attempt gives one evidence row per answer and skill code'
);
select is(
  (select array_agg(distinct row(pod_id, lesson_kind, hold_verdicts, added)::text) from learner_skill_evidence),
  array[row('ced09f15-d79b-590a-ae25-5a63ff918fea'::uuid, 'practice'::lesson_kind, false, 'planned'::added)::text],
  '(4) its pod_id is the pod it was played in, with the lesson''s kind and the assignment''s hold_verdicts'
);

-- (6) A skip is evidence; a preview and an unclaimed anonymous attempt are not.
select is(
  (select count(*) from learner_skill_evidence where kind = 'skip' and correct is null), 1::bigint,
  '(6) a skip gives a skip row');

-- (7) and (8): the claimer reads skill codes, never a lesson question.
select is(app.asked_skills('00000000-0000-4000-8000-0000000006f1', 1),
  array['math.mul.equal-groups', 'math.mul.facts-2'],
  '(7) app.asked_skills() gives the claimer''s pod the codes its claimed attempt asked');
select is((select count(*) from lesson_question where pod_id = app.shared_pod_id()), 0::bigint,
  '(8) the claimer still selects 0 lesson_question rows of the pod the attempt was played in');

-- (9) Mastery hangs off a learner of its own pod.
select throws_ok($$
  insert into learner_skill_mastery (pod_id, learner_id, skill_code, level)
  values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000001a1',
    'math.mul.facts-2', 'familiar')
$$, '23503', null, '(9) a mastery row naming another pod''s learner fails its foreign key');
select lives_ok($$
  insert into learner_skill_mastery (pod_id, learner_id, skill_code, level)
  values ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000001b1',
    'math.mul.facts-2', 'familiar');
  delete from learner_skill_mastery where learner_id = '00000000-0000-4000-8000-0000000001b1'
$$, '(9) and its own learner''s row is written and deleted, as a rebuild does');

-- (5), (6) and (7) as a 3rd pod: nothing of the claimed attempt.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000d', true);
select is((select count(*) from learner_skill_evidence), 0::bigint,
  '(5) as a 3rd pod, the evidence view returns 0 rows');
select is(app.asked_skills('00000000-0000-4000-8000-0000000006f1', 1), null,
  '(7) app.asked_skills(attempt, 1) as a 3rd pod is null');
select is(
  (select count(*) from skill) + (select count(*) from curriculum) + (select count(*) from topic),
  4::bigint, '(3) a 3rd pod reads the shared catalogue too, and nothing of pod A''s or pod B''s');

-- (6) as the shared pod: the unclaimed anonymous attempt gives nothing.
select set_config('app.pod_id', 'ced09f15-d79b-590a-ae25-5a63ff918fea', true);
select is(
  (select count(*) from learner_skill_evidence where attempt_id = '00000000-0000-4000-8000-0000000006f2'),
  0::bigint, '(6) an unclaimed anonymous attempt gives 0 evidence rows');
select is(
  (select count(*) from learner_skill_evidence where attempt_id = '00000000-0000-4000-8000-0000000006f1'),
  3::bigint, 'the pod the claimed attempt was played in still reads its evidence');

-- (6) as pod A: its real attempt's 4 answers, skip included, and nothing of its preview.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(
  (select count(*) from learner_skill_evidence where attempt_id = '00000000-0000-4000-8000-0000000006a9'),
  0::bigint, '(6) a preview attempt gives 0 evidence rows, though its learner is named');
select is(
  (select array_agg(row(seq, try_no, kind)::text order by seq, try_no) from learner_skill_evidence),
  array[row(1, 1, 'try'::answer_kind)::text, row(1, 2, 'skip'::answer_kind)::text,
    row(2, 1, 'try'::answer_kind)::text, row(3, 1, 'try'::answer_kind)::text],
  '(6) a real attempt gives its tries and its skip'
);

-- (10) The report: the API writes the narrative once and appends decisions, nothing else.
select throws_ok($$
  update learner_report set digest = '{"skills": [1]}' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '42501', null, '(10) as jadwigo_api, update learner_report set digest is refused');
select throws_ok($$
  update learner_report set inputs_hash = 'i2' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '42501', null, '(10) and so is any other column but narrative and decisions');
select lives_ok($$
  update learner_report set narrative = '{"text": "A good week."}' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '(10) set narrative works');
select is(
  (select narrative ->> 'text' from learner_report where id = '00000000-0000-4000-8000-0000000008a2'),
  'A good week.', '(10) and the narrative is stored');
select lives_ok($$
  update learner_report set narrative = '{"text": "A good week."}' where id = '00000000-0000-4000-8000-0000000008a2'
$$, 'the same narrative again is a no-op, not a rewrite');
select throws_ok($$
  update learner_report set narrative = '{"text": "Another."}' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '23001', 'report 00000000-0000-4000-8000-0000000008a2 already has its narrative',
  'learner_report_once refuses a 2nd narrative');
select lives_ok($$
  update learner_report set decisions = '[{"take": 1}]' where id = '00000000-0000-4000-8000-0000000008a2';
  update learner_report set decisions = '[{"take": 1}, {"take": 2}]' where id = '00000000-0000-4000-8000-0000000008a2'
$$, 'decisions are appended');
select throws_ok($$
  update learner_report set decisions = '[{"take": 9}, {"take": 2}]' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '23001', 'a report''s decisions are only appended', 'learner_report_once refuses a decisions rewrite');
select throws_ok($$
  update learner_report set decisions = '[{"take": 1}]' where id = '00000000-0000-4000-8000-0000000008a2'
$$, '23001', 'a report''s decisions are only appended', 'and a decision taken away');

-- (11) and the goal's grants.
select lives_ok($$
  insert into goal (id, pod_id, learner_id, name) values ('00000000-0000-4000-8000-0000000008a3',
    '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000001a1', 'Tables of 3')
$$, '(11) a goal is inserted with only the parent-login columns');
select is(
  (select row(status, lesson_language, words)::text from goal where id = '00000000-0000-4000-8000-0000000008a3'),
  row('active'::goal_status, 'pl'::language, null::text)::text,
  '(11) it gets status active and lesson_language pl, and no words');
select lives_ok($$
  update goal set status = 'paused' where id = '00000000-0000-4000-8000-0000000008a1'
$$, 'jadwigo_api changes a goal''s status');
select throws_ok($$
  update goal set learner_id = '00000000-0000-4000-8000-0000000001a1' where id = '00000000-0000-4000-8000-0000000008a1'
$$, '42501', null, 'jadwigo_api cannot update goal.learner_id');
select throws_ok($$
  update goal set name = 'Renamed' where id = '00000000-0000-4000-8000-0000000008a1'
$$, '42501', null, 'nor its name or words: GoalPatch changes the status and the skills only');
select lives_ok($$
  delete from goal_skill where goal_id = '00000000-0000-4000-8000-0000000008a1';
  insert into goal_skill (pod_id, goal_id, skill_code) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000008a1', 'math.mul.equal-groups')
$$, 'jadwigo_api replaces a goal''s skills');
select throws_ok($$
  insert into goal_skill (pod_id, goal_id, skill_code) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000008a1', 'math.mul.facts-2')
$$, '23503', null, 'a goal''s skill is a skill row of its own pod, not the shared template');

-- Pod B's delete of pod A's goal skills and mastery removes nothing.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
delete from goal_skill;
delete from learner_skill_mastery;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(
  (select count(*) from goal_skill) + (select count(*) from learner_skill_mastery), 2::bigint,
  '(1) pod B''s delete of pod A''s goal skills and mastery removed nothing');
reset role;

-- The indexes the evidence view and the fold lean on.
select ok(
  exists (select from pg_indexes where schemaname = 'public' and tablename = 'attempt_answer'
    and indexdef like '%(attempt_id, seq%'),
  'attempt_answer has an index led by (attempt_id, seq)');
select ok(
  exists (select from pg_indexes where schemaname = 'public' and tablename = 'attempt'
    and indexdef like '%(learner_id)%'),
  'attempt has an index on learner_id');

select * from finish();
rollback;
