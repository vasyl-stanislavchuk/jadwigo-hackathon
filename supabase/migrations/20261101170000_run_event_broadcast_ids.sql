-- The run_event broadcast sends ids only (issue dl-z5ja.59, from #421's review). realtime.send keeps
-- every message as a row in realtime.messages for days, outside run_event's row-level security, so
-- 20261101130000_run_queue.sql's broadcast, which carried the event whole, left a parent's words
-- about their child there. Now a broadcast is a poke: {run_id, seq, event_id}, the run's wire id,
-- the event's place and its dedupe key. The page fetches run events after its cursor through the
-- API, under row-level security (dl-z5ja.65), so a broadcast that is lost still costs nothing.
--
-- create or replace keeps the function's owner, its revoked EXECUTE and the trigger on run_event.

-- Each run event pokes the run's private topic, run:<run id>: the run, the event's seq and its id,
-- never its type or payload. realtime.send turns its own errors into warnings, so the insert never
-- fails for it. security definer: Realtime's table is not the caller's to write.
create or replace function app.run_event_broadcast() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'run_id', app.wire_id('run_', new.run_id),
      'seq', new.seq,
      'event_id', new.event_id
    ),
    'run_event',
    'run:' || app.wire_id('run_', new.run_id),
    true
  );
  return null;
end
$$;
