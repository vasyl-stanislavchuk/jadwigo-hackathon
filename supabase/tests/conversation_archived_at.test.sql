-- A conversation's archive (migration 20261101230000_conversation_archived_at.sql, issue
-- dl-z5ja.104, decision dl-84wo): null while live, set by the API on its own pod's conversations
-- only, never by the step consumer, and the row stays until its pod goes. Made-up rows only.
begin;
select plan(10);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into conversation (id, pod_id, created_by, title) values
  ('00000000-0000-4000-8000-0000000c00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'Adding to 10'),
  ('00000000-0000-4000-8000-0000000c00b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000a0b1', 'Equal groups');

select col_is_null('conversation', 'archived_at', 'archived_at may be null');
select is(
  (select count(*)::int from conversation where archived_at is not null), 0,
  'a conversation starts live'
);
select has_index('conversation', 'conversation_live', 'the list reads a partial index of live rows');

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select results_eq(
  $$update conversation set archived_at = now()
    where id = '00000000-0000-4000-8000-0000000c00a1' returning id$$,
  $$values ('00000000-0000-4000-8000-0000000c00a1'::uuid)$$,
  'the API archives its own pod''s conversation'
);
select is_empty(
  $$update conversation set archived_at = now()
    where id = '00000000-0000-4000-8000-0000000c00b1' returning id$$,
  'and not another pod''s'
);
select throws_ok(
  $$update conversation set title = 'Renamed' where id = '00000000-0000-4000-8000-0000000c00a1'$$,
  '42501', null,
  'and changes no other column'
);
select throws_ok(
  $$update conversation set archived_at = now() + interval '1 day'
    where id = '00000000-0000-4000-8000-0000000c00a1'$$,
  '23001', null,
  'an archive is kept: its time never moves'
);
select throws_ok(
  $$update conversation set archived_at = null where id = '00000000-0000-4000-8000-0000000c00a1'$$,
  '23001', null,
  'and it is never undone'
);
reset role;

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$update conversation set archived_at = null where id = '00000000-0000-4000-8000-0000000c00a1'$$,
  '42501', null,
  'the step consumer never archives or restores'
);
reset role;

select results_eq(
  $$select id, archived_at is not null from conversation order by id$$,
  $$values ('00000000-0000-4000-8000-0000000c00a1'::uuid, true),
           ('00000000-0000-4000-8000-0000000c00b1'::uuid, false)$$,
  'so the archived row is kept, and only the API''s own pod''s is archived'
);

select * from finish();
rollback;
