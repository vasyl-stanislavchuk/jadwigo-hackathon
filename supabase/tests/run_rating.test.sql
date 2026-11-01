-- A parent's rating of a turn (migration 20261101240000_run_rating.sql, issue dl-z5ja.110): one
-- per run and account, a re-rate replaces it, and another pod can neither read nor write it.
-- Made-up rows only.
begin;
select plan(10);
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

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select lives_ok(
  $$insert into run_rating (pod_id, run_id, account_id, verdict, note) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000d00a1',
     '00000000-0000-4000-8000-00000000a0a1', 'bad', 'Too many questions.')$$,
  'a parent rates a turn of its own pod'
);
select throws_ok(
  $$insert into run_rating (pod_id, run_id, account_id, verdict) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000d00a1',
     '00000000-0000-4000-8000-00000000a0a1', 'good')$$,
  '23505', null,
  'one rating per run and account'
);
select lives_ok(
  $$update run_rating set verdict = 'good', note = null
    where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  'a re-rate replaces the verdict and the note'
);
select throws_ok(
  $$update run_rating set created_at = now() - interval '1 day'
    where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '42501', null,
  'and changes nothing else'
);
select throws_ok(
  $$insert into run_rating (pod_id, run_id, account_id, verdict, note) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000d00a1',
     '00000000-0000-4000-8000-00000000a0a1', 'good', 'Nice.')$$,
  '23514', null,
  'a note goes only with Bad'
);
select throws_ok(
  $$insert into run_rating (pod_id, run_id, account_id, verdict) values
    ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000d00b1',
     '00000000-0000-4000-8000-00000000a0b1', 'good')$$,
  '42501', null,
  'another pod''s run cannot be rated from this pod'
);
select throws_ok(
  $$insert into run_rating (pod_id, run_id, account_id, verdict) values
    ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000d00b1',
     '00000000-0000-4000-8000-00000000a0a1', 'good')$$,
  '23503', null,
  'nor named under this pod'
);

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is_empty($$select id from run_rating$$, 'another pod reads no rating');
select is_empty(
  $$update run_rating set verdict = 'bad' returning id$$,
  'and changes none'
);
reset role;

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$select id from run_rating$$,
  '42501', null,
  'the step consumer never reads a rating'
);
reset role;

select * from finish();
rollback;
