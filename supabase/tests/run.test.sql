-- The engine's records (migration 20261101120000_run.sql, issue dl-z5ja.7): a pod reads only its
-- own conversations, runs, run events and inbox; a run event is never updated or deleted; seq is
-- gapless; and deleting a pod clears its runs. Made-up rows only.
begin;
select plan(29);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());

-- One conversation in each pod, one run in it, 2 events and an inbox row.
create function pg_temp.turn(pod uuid, acc uuid, tag text) returns void
language sql as $$
  insert into conversation (id, pod_id, created_by, title)
  values (('00000000-0000-4000-8000-0000000c00' || tag)::uuid, pod, acc, null);
  insert into run (id, pod_id, created_by, conversation_id, workflow, max_deadline_at, cap_usd)
  values (('00000000-0000-4000-8000-0000000d00' || tag)::uuid, pod, acc,
          ('00000000-0000-4000-8000-0000000c00' || tag)::uuid, 'jadwigo-lesson-compose',
          now() + interval '30 minutes', 0.05);
  insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    (('00000000-0000-4000-8000-0000000d00' || tag)::uuid, 1, ('00000000-0000-4000-8000-0000000e01' || tag)::uuid,
     pod, 'message', '{"from": "parent", "text": "Make a lesson on adding to 20"}'),
    (('00000000-0000-4000-8000-0000000d00' || tag)::uuid, 2, ('00000000-0000-4000-8000-0000000e02' || tag)::uuid,
     pod, 'status', '{"status": "in_progress"}');
  insert into run_inbox (event_id, run_id, pod_id, kind, payload)
  values (('00000000-0000-4000-8000-0000000f00' || tag)::uuid, ('00000000-0000-4000-8000-0000000d00' || tag)::uuid,
          pod, 'steer', '{"text": "Shorter, please"}');
$$;
select pg_temp.turn('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000a0a1', 'a1');
select pg_temp.turn('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000a0b1', 'b1');

-- The roles.
select ok(
  (select not rolbypassrls and not rolsuper from pg_roles where rolname = 'jadwigo_runner'),
  'jadwigo_runner never bypasses row-level security'
);
select is_empty(
  $$select from pg_class where relowner = 'jadwigo_runner'::regrole$$,
  'jadwigo_runner owns no table'
);
select results_eq(
  $$select relname::text collate "default", relrowsecurity and relforcerowsecurity from pg_class
    where relname in ('conversation', 'run', 'run_event', 'run_inbox') order by relname$$,
  $$values ('conversation', true), ('run', true), ('run_event', true), ('run_inbox', true)$$,
  'every engine table forces row-level security'
);

select ok(
  not has_function_privilege('jadwigo_runner', 'app.claim_attempt(uuid, uuid, uuid)', 'execute'),
  'jadwigo_runner cannot call a parent-facing app function'
);
select is(
  (select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'app' and has_function_privilege('jadwigo_runner', p.oid, 'execute')),
  3,
  'jadwigo_runner executes only app.current_pod_id, app.run_pod and app.runs_due'
);

-- Pod A's runner sees pod A only.
set local role jadwigo_runner;
set local app.pod_id = '00000000-0000-4000-8000-00000000000a';
select results_eq(
  $$select (select count(*) from conversation)::int, (select count(*) from run)::int,
           (select count(*) from run_event)::int, (select count(*) from run_inbox)::int$$,
  $$values (1, 1, 2, 1)$$,
  'a pod reads its own conversation, run, events and inbox'
);
select is_empty(
  $$select from run_event where run_id = '00000000-0000-4000-8000-0000000d00b1'$$,
  'another pod''s run events are not read'
);
select is_empty(
  $$select from run where id = '00000000-0000-4000-8000-0000000d00b1'$$,
  'another pod''s run is not read'
);
select throws_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00b1', 3, gen_random_uuid(),
     '00000000-0000-4000-8000-00000000000b', 'turn_complete', '{}')$$,
  '42501', null,
  'a pod never writes into another pod''s run'
);
select is(
  app.run_pod('00000000-0000-4000-8000-0000000d00b1'),
  '00000000-0000-4000-8000-00000000000b'::uuid,
  'app.run_pod finds any run''s pod, for authorizeRun'
);

-- Append-only, gapless, fenced.
select lives_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00a1', 3, '00000000-0000-4000-8000-0000000e03a1',
     '00000000-0000-4000-8000-00000000000a', 'usage', '{"spent_usd": 0.01, "cap_usd": 0.05}'),
    ('00000000-0000-4000-8000-0000000d00a1', 4, '00000000-0000-4000-8000-0000000e04a1',
     '00000000-0000-4000-8000-00000000000a', 'turn_complete', '{}')$$,
  'one insert appends several events at max + 1 in order'
);
select throws_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00a1', 6, gen_random_uuid(),
     '00000000-0000-4000-8000-00000000000a', 'status', '{"status": "completed"}')$$,
  '23514', null,
  'a seq that leaves a gap is refused'
);
select throws_ok(
  $$insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
    ('00000000-0000-4000-8000-0000000d00a1', 5, '00000000-0000-4000-8000-0000000e01a1',
     '00000000-0000-4000-8000-00000000000a', 'status', '{"status": "completed"}')$$,
  '23505', null,
  'an event_id is stored once'
);
select throws_ok(
  $$update run_event set payload = '{}' where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '42501', null,
  'the runner holds no update on run events'
);
select throws_ok(
  $$delete from run_event where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '42501', null,
  'nor delete'
);
select throws_ok(
  $$update run set max_deadline_at = now() + interval '1 day'
    where id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '42501', null,
  'max_deadline_at is not the runner''s to move'
);
select lives_ok(
  $$update run set attempt = 2, status = 'in_progress', spent_usd = 0.01
    where id = '00000000-0000-4000-8000-0000000d00a1' and attempt = 1$$,
  'the runner moves a run on, fenced on attempt'
);
select lives_ok(
  $$update run_inbox set status = 'delivered' where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  'and takes its inbox'
);
select throws_ok(
  $$update run_inbox set payload = '{"text": "x"}' where run_id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '42501', null,
  'an inbox row''s payload never changes'
);
reset role;

-- Even the migrating role, which holds every grant, cannot rewrite the log.
select throws_ok(
  $$update run_event set payload = '{}' where run_id = '00000000-0000-4000-8000-0000000d00a1' and seq = 1$$,
  '23001', null,
  'a run event is never updated'
);
select throws_ok(
  $$delete from run_event where run_id = '00000000-0000-4000-8000-0000000d00a1' and seq = 1$$,
  '23001', null,
  'a run event is never deleted while its run exists'
);
select throws_ok(
  $$update run set created_by = '00000000-0000-4000-8000-00000000a0b1'
    where id = '00000000-0000-4000-8000-0000000d00a1'$$,
  '23001', null,
  'a run''s identity never changes'
);
select throws_ok(
  $$update conversation set title = 'Adding' where id = '00000000-0000-4000-8000-0000000c00a1'$$,
  '23001', null,
  'a conversation is written once'
);
select throws_ok(
  $$insert into run (id, pod_id, created_by, workflow, resumes, max_deadline_at, cap_usd)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
            '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
            '00000000-0000-4000-8000-0000000d00b1', now(), 0.05)$$,
  '23503', null,
  'a run resumes only a run of its own pod'
);

-- The sweep's read: open runs past a deadline, in any pod.
update run set idle_deadline_at = now() - interval '1 minute'
  where id = '00000000-0000-4000-8000-0000000d00b1';
select results_eq(
  $$select id from app.runs_due(now())$$,
  $$values ('00000000-0000-4000-8000-0000000d00b1'::uuid)$$,
  'app.runs_due finds an open run past its idle deadline, in any pod'
);
update run set status = 'completed' where id = '00000000-0000-4000-8000-0000000d00b1';
select is_empty($$select from app.runs_due(now())$$, 'and never one that has ended');

-- Deleting a pod clears its conversations, runs, events and inbox, and leaves the other pods'.
-- Pod C holds only a turn; its creator is pod A's account, a plain key (account is not pod-cascaded).
insert into pod (id, name, language) values ('00000000-0000-4000-8000-00000000000c', 'Pod C', 'pl');
select pg_temp.turn('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-00000000a0a1', 'c1');
insert into run (id, pod_id, created_by, conversation_id, workflow, resumes, max_deadline_at, cap_usd)
values ('00000000-0000-4000-8000-0000000d00c2', '00000000-0000-4000-8000-00000000000c',
        '00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-0000000c00c1',
        'jadwigo-lesson-compose', '00000000-0000-4000-8000-0000000d00c1', now(), 0.05);
select lives_ok(
  $$delete from pod where id = '00000000-0000-4000-8000-00000000000c'$$,
  'a pod is deleted with its runs in it, one resuming another'
);
select results_eq(
  $$select (select count(*) from conversation where pod_id = '00000000-0000-4000-8000-00000000000c')::int,
           (select count(*) from run where pod_id = '00000000-0000-4000-8000-00000000000c')::int,
           (select count(*) from run_event where pod_id = '00000000-0000-4000-8000-00000000000c')::int,
           (select count(*) from run_inbox where pod_id = '00000000-0000-4000-8000-00000000000c')::int$$,
  $$values (0, 0, 0, 0)$$,
  'its conversation, runs, events and inbox went with it'
);
select results_eq(
  $$select (select count(*) from run_event)::int, (select count(*) from run_inbox)::int$$,
  $$values (6, 2)$$,
  'and the other pods'' rows are untouched'
);

select * from finish();
rollback;
