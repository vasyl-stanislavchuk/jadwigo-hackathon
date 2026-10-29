-- Parent login: the first sign-in, the claim, and what each pod reads afterwards (migration
-- 20261029120000_parent_login.sql, issue dl-e8ov.2.37, docs/research/parent-login.md).
--
-- Pod B's attempt in the fixture stands in for a featured lesson's anonymous attempt: no learner,
-- in a pod the parent is not in. Pod C is the parent's, made here the way the API makes it.
begin;
select plan(40);
\ir _fixture.sql

-- Pod B's anonymous attempt gets an answer, and then finishes, as the child sees the results.
insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000006b1', 1, 1, 'try', '{"entered": "4"}', 2000,
   '2026-10-27T09:00:00Z', '2026-10-27T09:00:02Z', true, 'enter@1', 'b5');
update attempt_question set ended = 'correct'
  where attempt_id = '00000000-0000-4000-8000-0000000006b1' and seq = 1;
update attempt set status = 'finished', finished_at = now()
  where id = '00000000-0000-4000-8000-0000000006b1';

-- A preview attempt in pod B, never claimable.
insert into attempt (id, pod_id, assignment_id, lesson_version_id, mode) values
  ('00000000-0000-4000-8000-0000000006b3', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000005b1', '00000000-0000-4000-8000-0000000004b1', 'preview');

-- More of pod B that the claim must not open: a 2nd published lesson with its question and
-- assignment, a draft lesson with an unpublished version, and a 2nd assignment of the played lesson.
insert into lesson (id, pod_id, title, language, category, subject, status) values
  ('00000000-0000-4000-8000-0000000002b2', '00000000-0000-4000-8000-00000000000b',
   'Sharing', 'en', 'child', 'math', 'published'),
  ('00000000-0000-4000-8000-0000000002b3', '00000000-0000-4000-8000-00000000000b',
   'Halves', 'en', 'child', 'math', 'draft');
insert into lesson_question
  (id, pod_id, family, question_type, say, data, key, subject, content_hash)
values
  ('00000000-0000-4000-8000-0000000003b2', '00000000-0000-4000-8000-00000000000b',
   'enter', 'production', 'How many pears each?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["3"]}', 'math', 'h5');
insert into lesson_version (id, pod_id, lesson_id, version) values
  ('00000000-0000-4000-8000-0000000004b2', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b2', 1),
  ('00000000-0000-4000-8000-0000000004b3', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b3', 1);
insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role) values
  ('00000000-0000-4000-8000-0000000004b2', 1, '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b2', 'planned');
update lesson_version set published_at = now() where id = '00000000-0000-4000-8000-0000000004b2';
insert into assignment (id, pod_id, lesson_id, audience, identity) values
  ('00000000-0000-4000-8000-0000000005b2', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b2', 'anyone', 'none'),
  ('00000000-0000-4000-8000-0000000005b3', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b1', 'learners', 'pick');

-- Pod B's answers, as text, to show a claim leaves them byte for byte.
create function pg_temp.pod_b_answers() returns text language sql as $$
  select string_agg(to_jsonb(a)::text, '|' order by event_id) from attempt_answer as a
  where attempt_id = '00000000-0000-4000-8000-0000000006b1'
$$;
create temp table before_claim as select pg_temp.pod_b_answers() as answers;
grant select on before_claim to jadwigo_api;
grant execute on function pg_temp.pod_b_answers() to jadwigo_api;

-- Where the pod comes from.
select is(app.current_pod_id(), null, 'with nothing set, there is no pod');
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(app.current_pod_id(), '00000000-0000-4000-8000-00000000000a'::uuid, 'app.pod_id names the pod');
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-8000-00000000c0a1", "role": "authenticated"}', true);
select is(app.current_pod_id(), '00000000-0000-4000-8000-00000000000a'::uuid,
  'a token with no pod_id claim falls back to app.pod_id');
select set_config('request.jwt.claims', '{"pod_id": "00000000-0000-4000-8000-00000000000b"}', true);
select is(app.current_pod_id(), '00000000-0000-4000-8000-00000000000b'::uuid,
  'the token''s pod_id claim wins over app.pod_id');
select is(app.current_pod_id(), (auth.jwt() ->> 'pod_id')::uuid, 'it is the claim auth.jwt() reads');
select set_config('request.jwt.claims', '', true);
select set_config('app.pod_id', '', true);

-- The first sign-in, as jadwigo_api: the API picks the pod's id, sets it, and writes pod, account
-- and member under row-level security.
set local role jadwigo_api;
select is(app.member_pod('00000000-0000-4000-8000-00000000c0a1'), null, 'before the first sign-in, no pod');
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000c', true);
select lives_ok($$
  insert into pod (id, name, language) values ('00000000-0000-4000-8000-00000000000c', 'home', 'pl');
  insert into account (id, pod_id, sub) values ('00000000-0000-4000-8000-0000000009c1',
    '00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000c0a1');
  insert into member (pod_id, account_id, role) values ('00000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-0000000009c1', 'parent');
  insert into learner (id, pod_id, handle, first_name, age_group) values
    ('00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-00000000000c', 'kit', 'Kit', '7-8');
  insert into goal (pod_id, learner_id, name) values ('00000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-0000000001c1', 'Tables of 7')
$$, 'the first sign-in makes pod, account and member, then a learner with a goal stub');
select is(app.member_pod('00000000-0000-4000-8000-00000000c0a1'), '00000000-0000-4000-8000-00000000000c'::uuid,
  'authorize() finds the pod from the token''s sub');
select throws_ok($$
  insert into account (pod_id, sub) values ('00000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-00000000c0a1')
$$, '23505', null, 'one account per signed-in user, so a 2nd first sign-in makes nothing');
select throws_ok($$
  insert into goal (pod_id, learner_id, name) values ('00000000-0000-4000-8000-00000000000c',
    '00000000-0000-4000-8000-0000000001a1', 'Not mine')
$$, '23503', null, 'a goal is for a learner in its own pod');
select throws_ok($$
  insert into account (pod_id, sub) values ('00000000-0000-4000-8000-00000000000a', gen_random_uuid())
$$, '42501', null, 'pod C cannot write an account into pod A');
select is((select count(*) from attempt), 0::bigint, 'before the claim, pod C reads no attempt');

-- The claim.
select throws_ok($$
  select app.claim_attempt('00000000-0000-4000-8000-0000000006b1',
    '00000000-0000-4000-8000-0000000001a1', '00000000-0000-4000-8000-0000000009c1')
$$, 'P0002', null, 'another pod''s learner cannot be claimed for');
select throws_ok($$
  select app.claim_attempt('00000000-0000-4000-8000-0000000006b1',
    '00000000-0000-4000-8000-0000000001c1', gen_random_uuid())
$$, 'P0002', null, 'an account that is no member of the caller''s pod cannot claim');
select throws_ok($$
  select app.claim_attempt(gen_random_uuid(),
    '00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-0000000009c1')
$$, 'P0002', null, 'an unknown attempt is not found');
select throws_ok($$
  select app.claim_attempt('00000000-0000-4000-8000-0000000006b3',
    '00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-0000000009c1')
$$, '23001', 'a preview attempt is never claimed', 'a preview attempt is never claimed');

select is(
  (select learner_id from app.claim_attempt('00000000-0000-4000-8000-0000000006b1',
     '00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-0000000009c1')),
  '00000000-0000-4000-8000-0000000001c1'::uuid,
  'a finished anonymous attempt is claimed for the learner'
);
create temp table first_claim as
  select claimed_by, claimed_at from attempt where id = '00000000-0000-4000-8000-0000000006b1';
select is(
  (select row(claimed_by, claimed_at)::text from app.claim_attempt('00000000-0000-4000-8000-0000000006b1',
     '00000000-0000-4000-8000-0000000001c1', '00000000-0000-4000-8000-0000000009c1')),
  (select row(claimed_by, claimed_at)::text from first_claim),
  'a replay returns the stored claim'
);
select is((select claimed_by from first_claim), '00000000-0000-4000-8000-0000000009c1'::uuid,
  'claimed_by is the account');
select is(pg_temp.pod_b_answers(), (select answers from before_claim), 'the claim changed no answer');

-- What pod C reads now: the claimed attempt, its questions, answers and results, and nothing else.
select is((select count(*) from attempt), 1::bigint, 'pod C reads the attempt it claimed');
select is((select count(*) from attempt_answer), 1::bigint, 'and its answer');
select is(
  (select say from attempt_result where attempt_id = '00000000-0000-4000-8000-0000000006b1'),
  'How many plums?', 'and its results, with the question from the pod it was played in'
);
select is(
  (select count(*) from attempt where pod_id = '00000000-0000-4000-8000-00000000000a'),
  0::bigint, 'and none of pod A''s attempts'
);

-- Of pod B's content, only what the claimed attempt points at: no other lesson, no draft, no other
-- assignment, and no lesson question, so no answer key.
select is((select array_agg(id::text order by id) from lesson),
  array['00000000-0000-4000-8000-0000000002b1'],
  'pod C reads the claimed attempt''s lesson, and no other lesson or draft of pod B');
select is((select array_agg(id::text order by id) from lesson_version),
  array['00000000-0000-4000-8000-0000000004b1'],
  'and only the version the attempt played');
select is((select array_agg(id::text order by id) from assignment),
  array['00000000-0000-4000-8000-0000000005b1'],
  'and only the attempt''s assignment, not another of the same lesson');
select is((select count(*) from lesson_question), 0::bigint,
  'and no lesson question, so no key: the results read the question''s face');
select is((select count(*) from lesson_version_question), 0::bigint, 'and no version''s list');
select is(
  (select row(say, family, question_type)::text from app.asked_question('00000000-0000-4000-8000-0000000006b1', 1)),
  row('How many plums?', 'enter'::family, 'production'::question_type)::text,
  'app.asked_question() gives pod C the face of a question its claimed attempt asked'
);
update attempt set resume_at = 1 where id = '00000000-0000-4000-8000-0000000006b1';
select throws_ok($$
  insert into attempt_answer
    (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at, body_hash)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000b',
    '00000000-0000-4000-8000-0000000006b1', 1, 2, 'try', '{"entered": "5"}', 1, now(), now(), 'x')
$$, '42501', null, 'pod C cannot write into the attempt it claimed');

-- A 2nd parent, in pod D, cannot take the claimed attempt.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000d', true);
insert into pod (id, name, language) values ('00000000-0000-4000-8000-00000000000d', 'home', 'en');
insert into account (id, pod_id, sub) values ('00000000-0000-4000-8000-0000000009d1',
  '00000000-0000-4000-8000-00000000000d', gen_random_uuid());
insert into member (pod_id, account_id, role) values ('00000000-0000-4000-8000-00000000000d',
  '00000000-0000-4000-8000-0000000009d1', 'parent');
insert into learner (id, pod_id, handle, first_name) values
  ('00000000-0000-4000-8000-0000000001d1', '00000000-0000-4000-8000-00000000000d', 'ash', 'Ash');
select throws_ok($$
  select app.claim_attempt('00000000-0000-4000-8000-0000000006b1',
    '00000000-0000-4000-8000-0000000001d1', '00000000-0000-4000-8000-0000000009d1')
$$, '23001', 'attempt 00000000-0000-4000-8000-0000000006b1 already has a learner',
  'a claimed attempt is never claimed again');
select is((select count(*) from attempt), 0::bigint, 'pod D reads none of it');
select is(
  (select count(*) from lesson) + (select count(*) from assignment)
    + (select count(*) from app.asked_question('00000000-0000-4000-8000-0000000006b1', 1)),
  0::bigint, 'nor its lesson, its assignment or its questions'' faces'
);

-- Pod B, where it was played, still reads it; the claim kept it there.
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is(
  (select row(pod_id, learner_id, resume_at)::text from attempt where id = '00000000-0000-4000-8000-0000000006b1'),
  row('00000000-0000-4000-8000-00000000000b'::uuid, '00000000-0000-4000-8000-0000000001c1'::uuid, null::integer)::text,
  'the attempt stays in pod B, and pod C''s update above changed nothing'
);
select throws_ok($$
  update attempt set learner_id = '00000000-0000-4000-8000-0000000001b1',
    claimed_by = '00000000-0000-4000-8000-0000000009c1', claimed_at = now()
  where id = '00000000-0000-4000-8000-0000000006b3'
$$, '42501', null, 'the API sets a learner only through app.claim_attempt(), never an update');
select is(
  (select count(*) from attempt_result where attempt_id = '00000000-0000-4000-8000-0000000006b1'),
  1::bigint, 'pod B still reads its results'
);
reset role;

-- The rules on attempt itself, past the API.
select throws_ok($$
  update attempt set learner_id = '00000000-0000-4000-8000-0000000001b1'
  where id = '00000000-0000-4000-8000-0000000006b3'
$$, '23001', null, 'a learner is set only by a claim, with claimed_by');
select throws_ok($$
  update attempt set moved_by = '00000000-0000-4000-8000-0000000009c1', moved_at = now(),
    learner_id = '00000000-0000-4000-8000-0000000001a1'
  where id = '00000000-0000-4000-8000-0000000006a1'
$$, '23001', 'moving an attempt between learners comes with dl-e8ov.5.11', 'a move waits for its route');
select throws_ok($$
  insert into attempt (pod_id, assignment_id, lesson_version_id, learner_id) values
    ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000005b1',
     '00000000-0000-4000-8000-0000000004b1', '00000000-0000-4000-8000-0000000001a1')
$$, '23503', 'a named attempt''s learner is in the attempt''s pod',
  'a named attempt''s learner is in the attempt''s pod, refused as the foreign key it replaces was');

select * from finish();
rollback;
