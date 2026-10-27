-- Row-level security keeps pods apart (RULES.md rule 12, decision
-- 2026-10-27-before-supabase-auth-row-level-security-reads-the-caller-s-pod-f).
begin;
select plan(11);
\ir _fixture.sql

-- How many of pod A's rows the caller can read, across every table and the view.
create function pg_temp.pod_a_rows_seen() returns bigint language sql as $$
  select (select count(*) from pod where id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from learner where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from lesson where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from lesson_version where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from lesson_question where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from lesson_version_question where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from assignment where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from attempt where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from attempt_question where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from attempt_answer where pod_id = '00000000-0000-4000-8000-00000000000a')
    + (select count(*) from attempt_result where pod_id = '00000000-0000-4000-8000-00000000000a')
$$;
grant execute on function pg_temp.pod_a_rows_seen() to jadwigo_api;

select ok(
  (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r'),
  'every table enables and forces row-level security'
);
select ok(
  not (select rolbypassrls or rolsuper from pg_roles where rolname = 'jadwigo_api'),
  'jadwigo_api neither bypasses row-level security nor is a superuser'
);

set local role jadwigo_api;
select is(pg_temp.pod_a_rows_seen(), 0::bigint, 'with no pod set, the API sees nothing');

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is(pg_temp.pod_a_rows_seen(), 0::bigint, 'pod B reads none of pod A''s rows');
select is((select count(*) from attempt_question), 1::bigint, 'pod B reads its own attempt question');
select is((select count(*) from attempt_result), 1::bigint, 'attempt_result runs as the caller');
select throws_ok(
  $$insert into learner (pod_id, handle, first_name)
    values ('00000000-0000-4000-8000-00000000000a', 'cat', 'Cat')$$,
  '42501', null, 'pod B cannot write a row into pod A'
);
update attempt set status = 'paused' where id = '00000000-0000-4000-8000-0000000006a1';

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select is(pg_temp.pod_a_rows_seen(), 22::bigint, 'pod A reads all its own rows');
select is(
  (select status from attempt where id = '00000000-0000-4000-8000-0000000006a1'),
  'in_progress'::attempt_status, 'pod B''s update of pod A''s attempt changed nothing'
);

-- The same check with row-level security off sees pod A's rows from pod B, so the isolation
-- above comes from the policies and nothing else.
reset role;
do $$
declare t text;
begin
  for t in select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' loop
    execute format('alter table %I disable row level security', t);
  end loop;
end $$;
set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select cmp_ok(pg_temp.pod_a_rows_seen(), '>', 0::bigint, 'with row-level security off, pod B sees pod A');
reset role;

select is(
  app.assignment_pod('00000000-0000-4000-8000-0000000005a1'),
  '00000000-0000-4000-8000-00000000000a'::uuid,
  'authorize() can find the pod behind an assignment id'
);

select * from finish();
rollback;
