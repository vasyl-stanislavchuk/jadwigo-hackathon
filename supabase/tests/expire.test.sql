-- An unclaimed attempt goes 3 months after it started, with its questions and answers; a claimed
-- or younger one stays (migration 20261029090000_expire_unclaimed_attempts.sql, decision
-- david-learns/decisions/2026-10-22-unregistered-anonymous-answers-are-kept-for-3-months).
begin;
select plan(10);
\ir _fixture.sql

-- 3 more attempts on pod B's assignment, each with one question and a wrong try: unclaimed and
-- older than 3 months, claimed and as old, and unclaimed and a day short of 3 months.
create function pg_temp.played(attempt uuid, learner uuid, started timestamptz) returns void
language sql as $$
  insert into attempt (id, pod_id, assignment_id, lesson_version_id, learner_id, started_at)
  values (attempt, '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000005b1',
          '00000000-0000-4000-8000-0000000004b1', learner, started);
  insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added)
  values (attempt, 1, '00000000-0000-4000-8000-00000000000b',
          '00000000-0000-4000-8000-0000000003b1', 'planned');
  insert into attempt_answer
    (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
     correct, judged_by, body_hash)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000b', attempt, 1, 1, 'try',
          '{"entered": "5"}', 1000, started, started, false, 'enter@1', 'e');
$$;

select pg_temp.played('00000000-0000-4000-8000-0000000006c1', null, now() - interval '3 months 1 day');
select pg_temp.played('00000000-0000-4000-8000-0000000006c2', '00000000-0000-4000-8000-0000000001b1',
                      now() - interval '3 months 1 day');
select pg_temp.played('00000000-0000-4000-8000-0000000006c3', null, now() - interval '3 months' + interval '1 day');

-- Outside the sweep, evidence is still never deleted.
select throws_ok(
  $$delete from attempt where id = '00000000-0000-4000-8000-0000000006c3'$$,
  '23001', null, 'a younger unclaimed attempt refuses delete'
);
select throws_ok(
  $$delete from attempt_answer where attempt_id = '00000000-0000-4000-8000-0000000006c2'$$,
  '23001', null, 'a claimed attempt''s answers refuse delete'
);

select is(app.expire_unclaimed_attempts(), 1, 'the sweep deletes one attempt');

select is_empty(
  $$select from attempt where id = '00000000-0000-4000-8000-0000000006c1'$$,
  'an unclaimed attempt older than 3 months is gone'
);
select is_empty(
  $$select from attempt_question where attempt_id = '00000000-0000-4000-8000-0000000006c1'$$,
  'its questions are gone'
);
select is_empty(
  $$select from attempt_answer where attempt_id = '00000000-0000-4000-8000-0000000006c1'$$,
  'its answers are gone'
);
select results_eq(
  $$select a.id, count(q.*)::int, count(n.*)::int
    from attempt as a
    join attempt_question as q on q.attempt_id = a.id
    join attempt_answer as n on n.attempt_id = a.id and n.seq = q.seq
    where a.id in ('00000000-0000-4000-8000-0000000006c2', '00000000-0000-4000-8000-0000000006c3')
    group by a.id order by a.id$$,
  $$values ('00000000-0000-4000-8000-0000000006c2'::uuid, 1, 1),
           ('00000000-0000-4000-8000-0000000006c3'::uuid, 1, 1)$$,
  'a claimed attempt and a younger one stay, with their questions and answers'
);
select is((select count(*)::int from attempt), 4, 'the fixture''s attempts stay');

select ok(
  not has_function_privilege('jadwigo_api', 'app.expire_unclaimed_attempts()', 'execute'),
  'jadwigo_api cannot run the sweep'
);

-- Where pg_cron exists (Supabase), the job is scheduled daily; plain Postgres has no pg_cron.
create function pg_temp.cron_command() returns text language plpgsql as $$
declare
  command text;
begin
  execute $q$select command from cron.job where jobname = 'expire-unclaimed-attempts'$q$ into command;
  return command;
end
$$;
select case
  when exists (select from pg_extension where extname = 'pg_cron') then
    is(pg_temp.cron_command(), 'select app.expire_unclaimed_attempts()', 'pg_cron runs the sweep')
  else skip('pg_cron is not installed here', 1)
end;

select * from finish();
rollback;
