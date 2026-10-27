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
