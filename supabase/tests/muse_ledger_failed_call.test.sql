-- A failed Muse call's cost counts toward its lane (migration 20261101290000_muse_ledger_failed_call.sql,
-- issue dl-z5ja.123, wave 4 lead decision 47). Only jadwigo_runner records one, through
-- muse_ledger.record_failed_call, which takes the pod from the run; nobody reads failed_call
-- directly; spent_usd adds it. Made-up rows only.
begin;
select plan(16);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into run (id, pod_id, created_by, workflow, idle_deadline_at, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05),
  ('00000000-0000-4000-8000-0000000d00b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000a0b1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05);
insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
   'model_response', '{"cost_usd": 0.02}');

-- The function: security definer, an empty search_path, volatile because it writes.
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger' and p.proname = 'record_failed_call'),
  'record_failed_call is security definer'
);
select is(
  (select p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger' and p.proname = 'record_failed_call'),
  array['search_path=""'], 'with an empty search_path'
);
-- The table holds ids and a cost, never text.
select is_empty(
  $$select from information_schema.columns
    where table_schema = 'muse_ledger' and table_name = 'failed_call'
      and data_type in ('text', 'character varying', 'jsonb', 'json')$$,
  'failed_call has no text column'
);

-- Who may reach it.
select ok(has_function_privilege('jadwigo_runner',
  'muse_ledger.record_failed_call(uuid, integer, numeric)', 'execute'),
  'jadwigo_runner may record a failed call');
select ok(not has_function_privilege('jadwigo_api',
  'muse_ledger.record_failed_call(uuid, integer, numeric)', 'execute'),
  'jadwigo_api may not');
select ok(not has_function_privilege('authenticated',
  'muse_ledger.record_failed_call(uuid, integer, numeric)', 'execute'),
  'authenticated may not');
select ok(not has_function_privilege('anon',
  'muse_ledger.record_failed_call(uuid, integer, numeric)', 'execute'),
  'anon may not');
select ok(
  not (select bool_or(has_table_privilege(r, 'muse_ledger.failed_call', p))
       from unnest(array['jadwigo_runner', 'jadwigo_api', 'authenticated', 'anon']) as r,
            unnest(array['select', 'insert', 'update', 'delete']) as p),
  'nobody reads or writes failed_call directly'
);

-- As the runner, scoped to pod A, recording pod B's run: the pod comes from the run.
set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select lives_ok(
  $$select muse_ledger.record_failed_call('00000000-0000-4000-8000-0000000d00a1', 2, 0.03)$$,
  'the runner records a failed call of its run'
);
select lives_ok(
  $$select muse_ledger.record_failed_call('00000000-0000-4000-8000-0000000d00b1', 1, 0.5)$$,
  'and one of another pod''s run, as the sweep of a lane does'
);
select lives_ok(
  $$select muse_ledger.record_failed_call(gen_random_uuid(), 1, 9)$$,
  'an unknown run records nothing'
);
select throws_ok(
  $$select muse_ledger.record_failed_call('00000000-0000-4000-8000-0000000d00a1', 3, 0)$$,
  '23514', null,
  'a call that spent nothing is not a row'
);
select is(
  muse_ledger.spent_usd(array['jadwigo-lesson-compose']::public.run_workflow[], now() - interval '1 day'),
  0.55::numeric,
  'spent_usd adds the failed calls to the model_response costs, across pods'
);
select is(
  muse_ledger.spent_usd(array['jadwigo-lesson-compose']::public.run_workflow[], now() + interval '1 day'),
  0::numeric,
  'and only since the time'
);
reset role;

select results_eq(
  $$select pod_id, run_id, call_no, cost_usd from muse_ledger.failed_call order by cost_usd$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid, '00000000-0000-4000-8000-0000000d00a1'::uuid, 2, 0.03::numeric),
           ('00000000-0000-4000-8000-00000000000b'::uuid, '00000000-0000-4000-8000-0000000d00b1'::uuid, 1, 0.5::numeric)$$,
  'each row carries its run''s pod, not the caller''s'
);
select is(
  (select count(*)::int from muse_ledger.failed_call), 2, 'and the unknown run wrote none'
);

select * from finish();
rollback;
