-- The lane's Muse spend across pods (migration 20261101250000_muse_spent_usd.sql, issue
-- dl-z5ja.89): model_response costs summed for the runs of a workflow since a time, whatever the
-- pod; only the step consumer may ask. Made-up rows only.
begin;
select plan(6);
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
insert into run_event (run_id, seq, event_id, pod_id, type, payload, created_at) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
   'model_response', '{"cost_usd": 0.0125}', now() - interval '2 days'),
  ('00000000-0000-4000-8000-0000000d00a1', 2, gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
   'model_response', '{"cost_usd": 0.02}', now()),
  ('00000000-0000-4000-8000-0000000d00a1', 3, gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
   'usage', '{"spent_usd": 5, "cap_usd": 9}', now()),
  ('00000000-0000-4000-8000-0000000d00b1', 1, gen_random_uuid(), '00000000-0000-4000-8000-00000000000b',
   'model_response', '{"cost_usd": 0.03}', now());

set local role jadwigo_runner;
select is(
  muse_ledger.spent_usd(array['jadwigo-lesson-compose']::run_workflow[], now() - interval '1 day'),
  0.05::numeric,
  'sums model_response costs across both pods since the time, and nothing else'
);
select is(
  muse_ledger.spent_usd(array['jadwigo-lesson-compose']::run_workflow[], now() - interval '3 days'),
  0.0625::numeric,
  'an earlier time takes in the older call'
);
select is(
  muse_ledger.spent_usd(array[]::run_workflow[], now() - interval '3 days'),
  0::numeric,
  'no workflow, no spend'
);
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(
  muse_ledger.spent_usd(array['jadwigo-lesson-compose']::run_workflow[], now() - interval '1 day'),
  0.05::numeric,
  'the sum is the lane''s, whatever pod the caller is scoped to'
);
reset role;

set local role jadwigo_api;
select throws_ok(
  $$select muse_ledger.spent_usd(array['jadwigo-lesson-compose']::run_workflow[], now())$$,
  '42501', null,
  'the API may not ask'
);
reset role;
set local role authenticated;
select throws_ok(
  $$select muse_ledger.spent_usd(array['jadwigo-lesson-compose']::run_workflow[], now())$$,
  '42501', null,
  'nor may a signed-in user'
);
reset role;

select * from finish();
rollback;
