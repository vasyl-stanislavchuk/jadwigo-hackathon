-- Who may reach muse_ledger (migrations 20261101250000_muse_spent_usd.sql and
-- 20261101260000_muse_ledger_search_path.sql, issues dl-z5ja.89 and dl-z5ja.120). The
-- schema sits outside app, so this file holds the fence run.test.sql holds for app: only
-- jadwigo_runner has USAGE on it and EXECUTE on its one function, which is security definer with
-- an empty search_path and returns a numeric sum.
begin;
select plan(13);

select ok(has_schema_privilege('jadwigo_runner', 'muse_ledger', 'usage'),
  'jadwigo_runner has USAGE on muse_ledger');
select ok(
  has_function_privilege('jadwigo_runner',
    'muse_ledger.spent_usd(public.run_workflow[], timestamptz)', 'execute'),
  'jadwigo_runner may execute muse_ledger.spent_usd'
);
select ok(not has_schema_privilege('jadwigo_api', 'muse_ledger', 'usage'),
  'jadwigo_api has no USAGE on muse_ledger');
select ok(
  not has_function_privilege('jadwigo_api',
    'muse_ledger.spent_usd(public.run_workflow[], timestamptz)', 'execute'),
  'jadwigo_api may not execute it'
);
select ok(not has_schema_privilege('authenticated', 'muse_ledger', 'usage'),
  'authenticated has no USAGE on muse_ledger');
select ok(
  not has_function_privilege('authenticated',
    'muse_ledger.spent_usd(public.run_workflow[], timestamptz)', 'execute'),
  'authenticated may not execute it'
);
select ok(not has_schema_privilege('anon', 'muse_ledger', 'usage'),
  'anon has no USAGE on muse_ledger');
select ok(
  not has_function_privilege('anon',
    'muse_ledger.spent_usd(public.run_workflow[], timestamptz)', 'execute'),
  'anon may not execute it'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger'),
  1, 'muse_ledger holds one function'
);
select ok(
  (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger' and p.proname = 'spent_usd'),
  'it is security definer'
);
select is(
  (select p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger' and p.proname = 'spent_usd'),
  array['search_path=""'], 'with an empty search_path'
);
select is(
  (select format_type(p.prorettype, null) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'muse_ledger' and p.proname = 'spent_usd'),
  'numeric', 'and returns a numeric sum, never rows'
);
select ok(
  not (select p.proretset from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'muse_ledger' and p.proname = 'spent_usd'),
  'one value, not a set'
);

select * from finish();
rollback;
