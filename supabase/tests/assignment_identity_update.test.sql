-- An assignment's identity may change (migration 20261104120000_assignment_identity_update.sql,
-- issue dl-5ssh.156): the API updates it on its own pod's assignments only, and no other column.
-- Made-up rows only.
begin;
select plan(4);
\ir _fixture.sql

set local role jadwigo_api;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select results_eq(
  $$update assignment set identity = 'type'
    where id = '00000000-0000-4000-8000-0000000005a1' returning identity::text$$,
  $$values ('type')$$,
  'the API changes its own pod''s assignment''s identity'
);
select is_empty(
  $$update assignment set identity = 'type'
    where id = '00000000-0000-4000-8000-0000000005b1' returning id$$,
  'and not another pod''s'
);
select throws_ok(
  $$update assignment set audience = 'learners' where id = '00000000-0000-4000-8000-0000000005a1'$$,
  '42501', null,
  'and changes no other column'
);
reset role;

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$update assignment set identity = 'none' where id = '00000000-0000-4000-8000-0000000005a1'$$,
  '42501', null,
  'the step consumer never changes an assignment'
);
reset role;

select * from finish();
rollback;
