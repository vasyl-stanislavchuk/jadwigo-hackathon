-- muse_ledger.spent_usd, held narrow (issue dl-z5ja.120, the lead's conditions on dl-z5ja.89). The
-- function lives outside app because the frozen run.test.sql holds jadwigo_runner to 4 app
-- functions; it is a new privilege for jadwigo_runner alone, so it must not widen that fence:
-- security definer with an empty search_path and every name qualified, returning one sum, never
-- rows or pod ids. muse_ledger_privileges.test.sql holds who may reach it. The privileges granted
-- in 20261101250000_muse_spent_usd.sql stay as they are: create or replace keeps them.
create or replace function muse_ledger.spent_usd(
  workflows public.run_workflow[], since timestamptz
) returns numeric
language sql stable security definer set search_path = ''
as $$
  select coalesce(pg_catalog.sum((e.payload ->> 'cost_usd')::numeric), 0)
  from public.run_event as e
  join public.run as r on r.pod_id = e.pod_id and r.id = e.run_id
  where e.type = 'model_response'::public.run_event_type
    and e.created_at >= since
    and r.workflow = any (workflows)
$$;
