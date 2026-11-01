-- What a Supabase project has before any migration runs, made on plain Postgres (dl-5ssh.34.34).
-- Applied before the migrations by `make migrate`, locally (Postgres.app 17) and in CI, never on a
-- real project. Idempotent. The check that it still matches prod is dl-5ssh.34.54.

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select from pg_roles where rolname = r) then
      execute format('create role %I nologin noinherit', r);
    end if;
  end loop;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator noinherit nologin;
  end if;
  -- Supabase Auth's own role: it owns the auth tables and runs the custom access token hook.
  if not exists (select from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin noinherit nologin;
  end if;
end
$$;

alter role service_role bypassrls;
grant anon, authenticated, service_role to authenticator;

-- Supabase's default: the Data API roles may use the public schema and everything in it.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

-- PostgREST puts the caller's token claims in request.jwt.claims; these read them as Supabase's do.
create or replace function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'role', '')
$$;

create or replace function auth.email() returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'email', '')
$$;

-- The 2 auth tables a migration hangs a trigger on (dl-e8ov.2.66), with the columns Supabase Auth
-- writes on a sign-in and the ones our tests read: a subset of Supabase's, same names and types.
-- identities.email is generated from identity_data as in Supabase Auth's migration
-- 20221215195800_add_identities_email_column, and identity linking looks users up by it.
create table if not exists auth.users (
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);

create table if not exists auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text generated always as (lower(identity_data ->> 'email')) stored,
  unique (provider_id, provider)
);

grant usage on schema auth to supabase_auth_admin;
grant all on auth.users, auth.identities to supabase_auth_admin;

-- Supabase Realtime's database surface (dl-z5ja.4), for the run_event broadcast trigger and the
-- policies on realtime.messages (dl-z5ja.52, dl-z5ja.6). The same names, columns and signatures as
-- Realtime's tenant schema (supabase/realtime priv/repo/tenant_db_dump_17.sql); the stub keeps
-- every message as a row, which Realtime would broadcast and partition by day. Realtime itself is
-- tested on the dev project (dl-z5ja.6), never here.
create schema if not exists realtime;
grant usage on schema realtime to anon, authenticated, service_role;

create table if not exists realtime.messages (
  topic text not null,
  extension text not null,
  payload jsonb,
  event text,
  private boolean default false,
  updated_at timestamp not null default timezone('utc', clock_timestamp()),
  inserted_at timestamp not null default timezone('utc', clock_timestamp()),
  id uuid not null default gen_random_uuid(),
  primary key (id, inserted_at)
);
alter table realtime.messages enable row level security;
grant select, insert, update, delete on realtime.messages to anon, authenticated, service_role;

-- The channel a policy on realtime.messages is checked for: Realtime sets realtime.topic on join.
create or replace function realtime.topic() returns text
language sql stable
as $$
  select nullif(current_setting('realtime.topic', true), '')::text
$$;

-- As Realtime's own: adds the payload's id, sets realtime.topic, and turns any error into a warning,
-- so a failed broadcast never fails the insert that sent it.
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void
language plpgsql
as $$
declare
  generated_id uuid;
  final_payload jsonb;
begin
  begin
    generated_id := gen_random_uuid();
    if payload ? 'id' then
      final_payload := payload;
    else
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    end if;
    execute format('set local realtime.topic to %L', topic);
    insert into realtime.messages (id, payload, event, topic, private, extension)
    values (generated_id, final_payload, event, topic, private, 'broadcast');
  exception
    when others then
      raise warning 'WarnSendingBroadcastMessage: %', sqlerrm;
  end;
end
$$;

-- pg_cron's surface a migration calls (dl-z5ja.4): cron.job, cron.schedule and cron.unschedule,
-- with pg_cron 1.6's signatures, Supabase's version. The stub records a job and never runs it; a
-- pgTAP test calls the function the job names. Made only where pg_cron is not available, so a
-- server that has it keeps the real one. A migration that schedules a job checks
-- pg_available_extensions first, as 20261029090000_expire_unclaimed_attempts.sql does, so it
-- schedules nothing here; one that calls cron.schedule on plain Postgres gets this stub.
do $$
begin
  if exists (select from pg_available_extensions where name = 'pg_cron') then
    return;
  end if;
  drop schema if exists cron cascade;
  create schema cron;
  create table cron.job (
    jobid bigserial primary key,
    schedule text not null,
    command text not null,
    nodename text not null default 'localhost',
    nodeport integer not null default 5432,
    database text not null default current_database(),
    username text not null default current_user,
    active boolean not null default true,
    jobname text unique
  );
  create function cron.schedule(job_name text, schedule text, command text) returns bigint
  language sql
  as $f$
    insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command
    returning jobid
  $f$;
  create function cron.unschedule(job_name text) returns boolean
  language plpgsql
  as $f$
  begin
    delete from cron.job where jobname = job_name;
    if not found then
      raise exception 'could not find valid entry for job ''%''', job_name;
    end if;
    return true;
  end
  $f$;
  create function cron.unschedule(job_id bigint) returns boolean
  language plpgsql
  as $f$
  begin
    delete from cron.job where jobid = job_id;
    if not found then
      raise exception 'could not find valid entry for job ''%''', job_id;
    end if;
    return true;
  end
  $f$;
end
$$;
