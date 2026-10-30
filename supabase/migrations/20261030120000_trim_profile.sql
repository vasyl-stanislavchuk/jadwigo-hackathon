-- Google and Facebook profile data is trimmed (issue dl-e8ov.2.66). Decision in force:
-- jadwigo-platform/decisions/2026-10-30-google-and-facebook-profile-data-is-trimmed-no-parent-name-or-av
-- (dl-zt14): no parent name or avatar is kept in Supabase metadata or rides in a token.
--
-- The design is docs/research/profile-trim.md. Supabase Auth merges the provider's claims into
-- auth.users.raw_user_meta_data and overwrites auth.identities.identity_data on every sign-in, so a
-- trigger trims both before they are stored. The token is built from the user Supabase Auth holds
-- in memory, before the trigger's trim, so a custom access token hook trims user_metadata too.
-- What stays is an allow list: the keys identity linking and the identity row read.

-- The profile keys kept, of a user's metadata or an identity's data. Everything else goes: name,
-- full_name, given_name, family_name, nickname, picture, avatar_url, custom_claims and the rest.
create function app.profile_trimmed(data jsonb) returns jsonb
language sql immutable
set search_path = ''
as $$
  select coalesce(
    (select jsonb_object_agg(key, value) from jsonb_each(data)
      where key in ('iss', 'sub', 'provider_id', 'email', 'email_verified', 'phone_verified')),
    '{}'::jsonb
  )
  where data is not null
$$;

-- Fires as Supabase Auth's role, which has no grant on app: security definer runs it as the owner.
create function app.trim_profile() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'users' then
    new.raw_user_meta_data := app.profile_trimmed(new.raw_user_meta_data);
  else
    new.identity_data := app.profile_trimmed(new.identity_data);
  end if;
  return new;
end
$$;

create trigger trim_profile before insert or update of raw_user_meta_data on auth.users
  for each row execute function app.trim_profile();
create trigger trim_profile before insert or update of identity_data on auth.identities
  for each row execute function app.trim_profile();

-- Supabase's custom access token hook: takes {user_id, claims, authentication_method} and returns
-- the event with its claims changed. Today it trims user_metadata; a pod_id claim joins it here later
-- (20261029120000_parent_login.sql). Switching it on is Supabase's auth config, not this migration:
-- hook_custom_access_token_uri = pg-functions://postgres/app/custom_access_token (dl-e8ov.2.67).
create function app.custom_access_token(event jsonb) returns jsonb
language sql stable
set search_path = ''
as $$
  select case
    when event -> 'claims' ? 'user_metadata' then
      jsonb_set(event, '{claims,user_metadata}',
        app.profile_trimmed(event -> 'claims' -> 'user_metadata'))
    else event
  end
$$;

-- New functions are executable by PUBLIC, and app's default privileges grant them to jadwigo_api.
-- Only Supabase Auth calls the hook, and the trim it shares with the hook is nobody else's either:
-- not the API's, and not the Data API roles' (Supabase's hook guide revokes those by name).
revoke execute on function app.profile_trimmed(jsonb), app.trim_profile(),
  app.custom_access_token(jsonb) from public, jadwigo_api, anon, authenticated, service_role;
grant usage on schema app to supabase_auth_admin;
grant execute on function app.profile_trimmed(jsonb), app.custom_access_token(jsonb)
  to supabase_auth_admin;

-- What is already stored loses its profile keys now, through the triggers above.
update auth.users set raw_user_meta_data = raw_user_meta_data
  where raw_user_meta_data is distinct from app.profile_trimmed(raw_user_meta_data);
update auth.identities set identity_data = identity_data
  where identity_data is distinct from app.profile_trimmed(identity_data);
