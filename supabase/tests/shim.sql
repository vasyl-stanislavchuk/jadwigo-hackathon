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
