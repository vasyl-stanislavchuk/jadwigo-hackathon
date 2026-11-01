-- The step consumer reads a step's records (migration 20261101270000_runner_reads_learner_records.sql,
-- issue dl-z5ja.125): SELECT only, its own pod's rows only, never a write. Made-up rows only.
begin;
select plan(9);
\ir _fixture.sql

-- SELECT only, on every table the migration names.
select ok(
  (select bool_and(has_table_privilege('jadwigo_runner', t, 'select'))
   from unnest(array['lesson', 'lesson_version', 'assignment', 'attempt', 'attempt_question',
     'attempt_answer', 'goal_skill', 'learner_report', 'learner_skill_mastery', 'skill',
     'attempt_result', 'learner_skill_evidence']) as t),
  'jadwigo_runner may read the step''s records'
);
select ok(
  not (select bool_or(has_table_privilege('jadwigo_runner', t, p))
       from unnest(array['lesson', 'lesson_version', 'assignment', 'attempt', 'attempt_question',
         'attempt_answer', 'goal_skill', 'learner_report', 'learner_skill_mastery', 'skill']) as t,
            unnest(array['insert', 'update', 'delete', 'truncate']) as p),
  'and may write none of them'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and has_function_privilege('jadwigo_runner', p.oid, 'execute')),
  7, 'and executes the 7 app functions run.test.sql names, no more'
);

-- Pod A's runner reads pod A's rows and none of pod B's.
set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select results_eq(
  $$select pod_id from lesson order by pod_id$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'a pod''s lesson, not another pod''s'
);
select results_eq(
  $$select distinct pod_id from lesson_version$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'its versions'
);
select results_eq(
  $$select distinct pod_id from attempt$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'its attempts'
);
select is_empty(
  $$select from attempt_answer where pod_id = '00000000-0000-4000-8000-00000000000b'$$,
  'none of another pod''s answers'
);
select is_empty(
  $$select from assignment where pod_id = '00000000-0000-4000-8000-00000000000b'$$,
  'nor its assignments'
);
select throws_ok(
  $$update lesson set title = 'x' where pod_id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null,
  'and writes nothing'
);
reset role;

select * from finish();
rollback;
