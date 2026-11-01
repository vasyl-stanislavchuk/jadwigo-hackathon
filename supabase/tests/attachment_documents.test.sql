-- A HEIC, a PDF and a DOCX attach as they are (migration 20261101500000_attachment_documents.sql,
-- wave 6 step 0 dl-z5ja.11.11): a document has a name and no width or height, a JPEG always has
-- both, and a name is at most 120 characters. Made-up rows only.
begin;
select plan(7);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid());

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);

create function pg_temp.pending(kind text, w integer, h integer, file text) returns void
language sql as $$
  insert into attachment (id, pod_id, account_id, event_id, media_type, bytes, width, height, name, expires_at)
  values (gen_random_uuid(), '00000000-0000-4000-8000-00000000000a',
          '00000000-0000-4000-8000-00000000a0a1', gen_random_uuid(), kind,
          812000, w, h, file, now() + interval '1 day');
$$;

select lives_ok(
  $$select pg_temp.pending('application/pdf', null, null, 'zeszyt.pdf')$$,
  'a PDF attaches with its name and no size'
);
select lives_ok(
  $$select pg_temp.pending('application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, null, 'karta.docx')$$,
  'a DOCX attaches with its name and no size'
);
select lives_ok(
  $$select pg_temp.pending('image/heic', null, null, null)$$,
  'a HEIC the page could not decode attaches with no size'
);
select throws_ok(
  $$select pg_temp.pending('image/jpeg', null, null, null)$$,
  '23514', null,
  'a JPEG without its size is refused'
);
select throws_ok(
  $$select pg_temp.pending('application/pdf', 1500, 2000, 'zeszyt.pdf')$$,
  '23514', null,
  'a document with a size is refused'
);
select throws_ok(
  $$select pg_temp.pending('application/pdf', null, null, repeat('a', 121))$$,
  '23514', null,
  'a name over 120 characters is refused'
);

select throws_ok(
  $$select pg_temp.pending('image/png', 10, 10, null)$$,
  '23514', null,
  'a kind outside the 4 is refused'
);

select * from finish();
rollback;
