-- The 3 app functions the step consumer may now call (migration
-- 20261101280000_runner_executes_read_functions.sql, issue dl-z5ja.125, wave 4 lead decision 45):
-- none is volatile, and as jadwigo_runner each answers only for the caller's pod. Made-up rows only.
begin;
select plan(10);
\ir _fixture.sql

-- The fixture's pod B attempt asked its seq 1 too, so another pod's row exists to be refused.
-- The shared catalogue, and a skill of pod B the shared_read policy must not show pod A.
insert into pod (id, name, language) values
  ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'Jadwigo', 'pl') on conflict do nothing;
insert into skill (pod_id, code, status, source) values
  ('ced09f15-d79b-590a-ae25-5a63ff918fea', 'math.mul.facts-2', 'reviewed', 'curriculum'),
  ('00000000-0000-4000-8000-00000000000b', 'math.mul.facts-3', 'draft', 'parent');

select ok(
  (select bool_and(p.provolatile in ('s', 'i')) from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname in ('shared_pod_id', 'asked_skills', 'asked_question')),
  'none of the 3 is volatile'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and p.proname in ('shared_pod_id', 'asked_skills', 'asked_question')
     and has_function_privilege('jadwigo_runner', p.oid, 'execute')),
  3, 'jadwigo_runner may execute all 3'
);

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);

-- app.shared_pod_id: a constant, through which pod A reads the shared catalogue and never pod B's.
select is(app.shared_pod_id(), 'ced09f15-d79b-590a-ae25-5a63ff918fea'::uuid,
  'shared_pod_id is the shared pod');
select ok(
  exists (select from skill where code = 'math.mul.facts-2'),
  'pod A reads the shared catalogue through it'
);
select is_empty(
  $$select from skill where pod_id = '00000000-0000-4000-8000-00000000000b'$$,
  'and none of pod B''s skills'
);

-- app.asked_skills: pod A's own attempt answers its skills; pod B's answers nothing.
select is(
  app.asked_skills('00000000-0000-4000-8000-0000000006a1', 1),
  array['math.mul.equal-groups'],
  'asked_skills answers the caller''s pod''s question'
);
select is(
  app.asked_skills('00000000-0000-4000-8000-0000000006b1', 1), null,
  'and nothing for another pod''s'
);

-- app.asked_question: the same.
select is(
  (select say from app.asked_question('00000000-0000-4000-8000-0000000006a1', 1)),
  'How many apples?',
  'asked_question answers the caller''s pod''s question'
);
select is_empty(
  $$select * from app.asked_question('00000000-0000-4000-8000-0000000006b1', 1)$$,
  'and nothing for another pod''s'
);
select is_empty(
  $$select from attempt_result where pod_id = '00000000-0000-4000-8000-00000000000b'$$,
  'so attempt_result shows pod A none of pod B''s rows'
);
reset role;

select * from finish();
rollback;
