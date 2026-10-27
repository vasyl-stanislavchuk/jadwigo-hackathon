-- Row-level security keeps pods apart (RULES.md rule 12, decision
-- 2026-10-27-before-supabase-auth-row-level-security-reads-the-caller-s-pod-f).
begin;
select plan(15);
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
select ok(
  not exists (
    select from pg_default_acl d, aclexplode(d.defaclacl) a
    where d.defaclnamespace = 'public'::regnamespace
      and a.grantee in (select oid from pg_roles
                        where rolname in ('anon', 'authenticated', 'service_role'))
  ),
  'a table, sequence or function made later is not granted to anon, authenticated or service_role'
);
select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')),
  0::bigint,
  'anon, authenticated and service_role hold no grant on any table or view'
);

create function app.made_later() returns int language sql security definer as 'select 1';
select ok(
  not has_schema_privilege('anon', 'app', 'usage')
    and not has_schema_privilege('authenticated', 'app', 'usage')
    and not has_schema_privilege('service_role', 'app', 'usage'),
  'a function made later in app is not callable by anon, authenticated or service_role'
);
select ok(
  has_schema_privilege('jadwigo_api', 'app', 'usage')
    and has_function_privilege('jadwigo_api', 'app.made_later()', 'execute'),
  'a function made later in app is callable by jadwigo_api'
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
