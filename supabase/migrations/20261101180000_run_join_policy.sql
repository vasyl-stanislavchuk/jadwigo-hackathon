-- Who may join a run's Realtime channel (issue dl-z5ja.61, lead decision 30). The run_event
-- broadcast (20261101130000_run_queue.sql) goes out on the private topic run:<wire run id>, and
-- Realtime lets a signed-in user join a private topic only when a select policy on
-- realtime.messages passes for them, checked once at join with realtime.topic() set to the topic.
-- There was none, so nobody could join. Now a user whose pod owns the run may, and nobody else:
-- the shape the dl-z5ja.6 probe proved on jadwigo-dev (supabase/probes/realtime/setup.sql).
--
-- The caller's pod is app.current_pod_id(), the token's top-level pod_id claim. There is no insert
-- policy: a browser only listens, and the database sends.

-- A record's uuid from its wire id, the inverse of app.wire_id: the prefix, then 26 lowercase
-- Crockford base32 characters, the first of them 0 to 7 (its top 2 bits are 0). Anything else is
-- null, never an error, so a made-up topic is refused rather than failing the join.
create function app.wire_uuid(prefix text, wire text) returns uuid
language sql immutable strict
as $$
  select case
    when left(wire, length(prefix)) = prefix
      and substr(wire, length(prefix) + 1) ~ '^[0-7][0-9a-hjkmnp-tv-z]{25}$'
    then (
      select (
        lpad(to_hex(substring(b from 3 for 64)::bigint), 16, '0')
        || lpad(to_hex(substring(b from 67 for 64)::bigint), 16, '0')
      )::uuid
      from (
        select string_agg(
          (strpos('0123456789abcdefghjkmnpqrstvwxyz', substr(wire, length(prefix) + g, 1)) - 1)::bit(5)::text,
          '' order by g
        )::varbit as b
        from generate_series(1, 26) as g
      ) as s
    )
  end
$$;

-- Its own schema, so authenticated gets USAGE on this one function and none on app
-- (rls.test.sql). Not exposed through the Data API. `if not exists` and `or replace`: `make migrate`
-- resets only public, app, auth and realtime, so locally this schema outlives a reset.
create schema if not exists realtime_join;
revoke all on schema realtime_join from public;
grant usage on schema realtime_join to authenticated;

-- Whether the caller's pod owns the run a topic names. security definer: the policy needs no grant
-- on run, and a run of another pod is never visible to the caller.
create or replace function realtime_join.can_join_run(topic text) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select from run
    where left(topic, 4) = 'run:'
      and id = app.wire_uuid('run_', substr(topic, 5))
      and pod_id = app.current_pod_id()
  )
$$;

revoke execute on function realtime_join.can_join_run(text) from public;
grant execute on function realtime_join.can_join_run(text) to authenticated;
revoke execute on function app.wire_uuid(text, text) from public, jadwigo_api;

-- Joining a private topic is a select on realtime.messages, checked at join and cached until the
-- token refreshes. Like the probe's, it names no event: Realtime checks the join for the topic,
-- before any run_event message exists, so a condition on event could refuse every join.
create policy run_join on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and realtime_join.can_join_run((select realtime.topic()))
  );
