-- A parent's photo (migration 20261101400000_attachment.sql, issue dl-e8ov.2.22): pending, then
-- attached once to a message of its own pod; another pod neither reads nor writes it, the step
-- consumer never reads the table, and the sweep deletes an expired pending row and keeps the rest.
-- Made-up rows only.
begin;
select plan(17);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into conversation (id, pod_id, created_by) values
  ('00000000-0000-4000-8000-0000000c00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1'),
  ('00000000-0000-4000-8000-0000000c00b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-00000000a0b1');

-- A pending photo in pod A, as POST /api/v1/attachments writes it.
create function pg_temp.pending(id uuid, pod uuid, account uuid, expires timestamptz) returns void
language sql as $$
  insert into attachment (id, pod_id, account_id, event_id, media_type, bytes, width, height, expires_at)
  values (id, pod, account, gen_random_uuid(), 'image/jpeg', 482113, 1500, 2000, expires);
$$;

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select lives_ok(
  $$select pg_temp.pending('00000000-0000-4000-8000-0000000e00a1', '00000000-0000-4000-8000-00000000000a',
                           '00000000-0000-4000-8000-00000000a0a1', now() + interval '1 day')$$,
  'a parent creates a pending photo in its own pod'
);
select is(
  (select state::text from attachment where id = '00000000-0000-4000-8000-0000000e00a1'),
  'pending', 'it starts pending'
);
select throws_ok(
  $$insert into attachment (id, pod_id, account_id, event_id, media_type, bytes, width, height, expires_at)
    select gen_random_uuid(), pod_id, account_id, event_id, media_type, bytes, width, height, expires_at
    from attachment where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '23505', null,
  'one photo per pod and event_id'
);
select throws_ok(
  $$insert into attachment (id, pod_id, account_id, event_id, media_type, bytes, width, height, expires_at)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000a0a1',
            gen_random_uuid(), 'image/png', 10, 10, 10, now() + interval '1 day')$$,
  '23514', null,
  'a PNG is never stored: the kinds are JPEG, HEIC, PDF and DOCX (wave 6, 20261101500000)'
);
select throws_ok(
  $$insert into attachment (id, pod_id, account_id, event_id, media_type, bytes, width, height)
    values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000a0a1',
            gen_random_uuid(), 'image/jpeg', 10, 10, 10)$$,
  '23514', null,
  'a pending photo expires'
);
select throws_ok(
  $$select pg_temp.pending(gen_random_uuid(), '00000000-0000-4000-8000-00000000000b',
                           '00000000-0000-4000-8000-00000000a0b1', now() + interval '1 day')$$,
  '42501', null,
  'a parent cannot create a photo in another pod'
);
select throws_ok(
  $$update attachment set state = 'attached', expires_at = null, attached_at = now(),
      conversation_id = '00000000-0000-4000-8000-0000000c00a1'
    where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '23514', null,
  'an attached photo has its storage path'
);
select throws_ok(
  $$update attachment set state = 'attached', expires_at = null, attached_at = now(),
      conversation_id = '00000000-0000-4000-8000-0000000c00b1',
      storage_path = 'pods/x/attachments/y.jpg'
    where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '23503', null,
  'and is attached only to a conversation of its own pod'
);
select lives_ok(
  $$update attachment set state = 'attached', expires_at = null, attached_at = now(),
      conversation_id = '00000000-0000-4000-8000-0000000c00a1',
      storage_path = 'pods/x/attachments/y.jpg'
    where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  'a message attaches a pending photo of its own pod'
);
select throws_ok(
  $$update attachment set conversation_id = conversation_id, storage_path = 'pods/x/attachments/z.jpg'
    where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '23001', null,
  'an attached photo never changes again'
);
select throws_ok(
  $$update attachment set bytes = 1 where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '42501', null,
  'what was declared never changes'
);
select throws_ok(
  $$delete from attachment where id = '00000000-0000-4000-8000-0000000e00a1'$$,
  '42501', null,
  'the api deletes no row'
);

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select is_empty($$select id from attachment$$, 'another pod reads no photo');
select is_empty(
  $$update attachment set state = 'attached' returning id$$,
  'and changes none'
);
reset role;

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$select id from attachment$$,
  '42501', null,
  'the step consumer never reads the table'
);
reset role;

-- The sweep: an expired pending photo goes; a pending one still in time and an attached one stay.
select pg_temp.pending('00000000-0000-4000-8000-0000000e00a2', '00000000-0000-4000-8000-00000000000a',
                       '00000000-0000-4000-8000-00000000a0a1', now() - interval '1 minute');
select pg_temp.pending('00000000-0000-4000-8000-0000000e00b1', '00000000-0000-4000-8000-00000000000b',
                       '00000000-0000-4000-8000-00000000a0b1', now() + interval '1 hour');
select is(app.expire_pending_attachments(), 1, 'the sweep deletes the one expired pending photo');
select bag_eq(
  $$select id from attachment$$,
  $$values ('00000000-0000-4000-8000-0000000e00a1'::uuid), ('00000000-0000-4000-8000-0000000e00b1'::uuid)$$,
  'and keeps the attached photo and the pending one still in time'
);

select * from finish();
rollback;
