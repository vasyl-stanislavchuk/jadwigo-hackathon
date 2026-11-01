-- A pod's AI consent (migration 20261101220000_pod_ai_consent.sql, issue dl-z5ja.112): null until
-- a parent gives it, set and cleared by the API on its own pod only. Made-up rows only.
begin;
select plan(7);
\ir _fixture.sql

select col_is_null('pod', 'ai_consent_at', 'ai_consent_at may be null');
select col_type_is('pod', 'ai_consent_at', 'timestamp with time zone', 'ai_consent_at is a timestamptz');
select is(
  (select ai_consent_at from pod where id = '00000000-0000-4000-8000-00000000000a'),
  null, 'a pod starts with no consent'
);

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select results_eq(
  $$update pod set ai_consent_at = now() where id = '00000000-0000-4000-8000-00000000000a'
    returning id$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'the API gives its own pod consent'
);
select is_empty(
  $$update pod set ai_consent_at = now() where id = '00000000-0000-4000-8000-00000000000b'
    returning id$$,
  'and cannot give it for another pod'
);
select throws_ok(
  $$update pod set name = 'Renamed' where id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null,
  'and changes no other column of its pod'
);
reset role;

select results_eq(
  $$select id, ai_consent_at is not null from pod order by id$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid, true),
           ('00000000-0000-4000-8000-00000000000b'::uuid, false)$$,
  'so only the API''s own pod holds consent'
);

select * from finish();
rollback;
