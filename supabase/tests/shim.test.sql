-- The shim's Realtime and pg_cron stubs behave as the real ones do for what a migration calls
-- (dl-z5ja.4): realtime.send writes the message a broadcast would carry and never fails its
-- caller, and cron.schedule records a job by name. The engine's trigger and sweep (dl-z5ja.52)
-- are tested against these.
begin;
select plan(12);

select has_function('realtime', 'send', array['jsonb', 'text', 'text', 'boolean'], 'realtime.send has Realtime''s signature');
select has_function('realtime', 'topic', 'realtime.topic() exists for policies on realtime.messages');

select realtime.send('{"seq": 1}', 'run_event', 'run:probe');
select results_eq(
  $$select topic, event, private, extension, payload ->> 'seq' from realtime.messages$$,
  $$values ('run:probe', 'run_event', true, 'broadcast', '1')$$,
  'realtime.send writes one private broadcast on its topic'
);
select ok(
  (select payload ->> 'id' = id::text from realtime.messages),
  'the message''s payload carries its id, as Realtime adds it'
);
select is(realtime.topic(), 'run:probe', 'realtime.send sets realtime.topic for the transaction');

select realtime.send('{"seq": 2, "id": "kept"}', 'run_event', 'run:probe', false);
select is(
  (select payload ->> 'id' from realtime.messages where payload ->> 'seq' = '2'),
  'kept',
  'a payload''s own id is kept'
);

-- A broadcast that cannot be written warns and returns: the insert that sent it still commits.
set local client_min_messages = error;
select lives_ok($$select realtime.send(null, 'run_event', null)$$, 'a failed broadcast never fails its caller');
reset client_min_messages;
select is((select count(*)::int from realtime.messages), 2, 'and writes nothing');

-- pg_cron: the stub here, the real one where the server has it. Rolled back either way.
create temp table job_ids as select cron.schedule('probe-sweep', '30 seconds', 'select 1') as jobid;
select is(
  (select command from cron.job where jobid = (select jobid from job_ids)),
  'select 1',
  'cron.schedule records a job'
);
insert into job_ids select cron.schedule('probe-sweep', '1 minute', 'select 2');
select results_eq(
  $$select count(distinct jobid)::int, max(command) from cron.job where jobname = 'probe-sweep'$$,
  $$values (1, 'select 2')$$,
  'scheduling a name again replaces its job'
);
select ok(cron.unschedule('probe-sweep'), 'cron.unschedule removes it');
select is_empty($$select from cron.job where jobname = 'probe-sweep'$$, 'and the job is gone');

select * from finish();
rollback;
