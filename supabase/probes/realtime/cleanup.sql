-- Removes everything setup.sql made and the probe's test users (dl-z5ja.6). Safe to run twice, and
-- safe on a project where setup.sql never ran.

begin;

-- The probe's messages, while the run ids are still there to name their topics.
do $$
begin
  if to_regclass('realtime_probe.run') is not null then
    delete from realtime.messages m
    using realtime_probe.run r
    where m.topic = 'run:' || r.id;
  end if;
end
$$;

drop policy if exists realtime_probe_run_join on realtime.messages;

drop function if exists public.realtime_probe_start(uuid, uuid);
drop function if exists public.realtime_probe_emit(uuid, text, jsonb);
drop function if exists public.realtime_probe_events(uuid, int);

drop schema if exists realtime_probe cascade;

-- The script's made-up users (apps/web/dev/realtime-probe.ts PROBE_EMAIL); their identities and
-- sessions go with them.
delete from auth.users where email like 'realtime-probe-%@example.com';

commit;

notify pgrst, 'reload schema';

select 'realtime probe removed' as status,
  (select count(*) from pg_namespace where nspname = 'realtime_probe') as schema_left,
  (select count(*) from pg_policies where schemaname = 'realtime' and policyname = 'realtime_probe_run_join') as policy_left,
  (select count(*) from auth.users where email like 'realtime-probe-%@example.com') as users_left;
