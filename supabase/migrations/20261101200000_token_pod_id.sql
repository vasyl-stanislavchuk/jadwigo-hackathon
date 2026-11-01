-- The token carries the user's pod (issue dl-z5ja.92). app.current_pod_id() reads a top-level
-- pod_id claim first (20261029120000_parent_login.sql), and the run_join policy on
-- realtime.messages has nothing else to go on (20261101180000_run_join_policy.sql), but the custom
-- access token hook (20261030120000_trim_profile.sql) only trimmed user_metadata, so no token had
-- one and every browser join on run:<id> was refused. Now the hook also sets claims.pod_id: the pod
-- app.member_pod() finds for the user, the one authorize() scopes the API to. A user with no
-- account yet (before the first sign-in's API call made one) gets no pod_id, and reads nothing.
--
-- create or replace keeps the hook's grants: supabase_auth_admin runs it, nobody else.

create or replace function app.custom_access_token(event jsonb) returns jsonb
language sql stable
set search_path = ''
as $$
  with trimmed as (
    select case
      when event -> 'claims' ? 'user_metadata' then
        jsonb_set(event, '{claims,user_metadata}',
          app.profile_trimmed(event -> 'claims' -> 'user_metadata'))
      else event
    end as event
  ),
  found as (
    -- Supabase Auth sends user_id as a uuid; anything else finds no pod rather than failing the
    -- sign-in.
    select case
      when event ->> 'user_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then app.member_pod((event ->> 'user_id')::uuid)
    end as pod
  )
  select case
    when found.pod is not null and trimmed.event ? 'claims' then
      jsonb_set(trimmed.event, '{claims,pod_id}', to_jsonb(found.pod::text))
    else trimmed.event
  end
  from trimmed, found
$$;

-- The hook runs as supabase_auth_admin, which reads no table: the pod lookup is app.member_pod's,
-- past row-level security, and returns the pod's id only.
grant execute on function app.member_pod(uuid) to supabase_auth_admin;
