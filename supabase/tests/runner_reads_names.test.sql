-- What the step consumer reads of a pod (migration 20261101190000_runner_reads_names.sql, issue
-- dl-z5ja.81): as jadwigo_runner with app.pod_id set, the pod's pod, account, member, learner and
-- goal rows read, another pod's are invisible, and none of them can be written. Made-up rows only.
begin;
select plan(9);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a', gen_random_uuid()),
  ('00000000-0000-4000-8000-00000000a0b1', '00000000-0000-4000-8000-00000000000b', gen_random_uuid());
insert into member (pod_id, account_id, role) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000a0a1', 'parent'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-00000000a0b1', 'parent');
insert into goal (id, pod_id, learner_id, name) values
  ('00000000-0000-4000-8000-0000000008a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000001a1', 'Tables of 2'),
  ('00000000-0000-4000-8000-0000000008b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000001b1', 'Tables of 3');

set local role jadwigo_runner;
select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);

select results_eq(
  $$select id from pod$$,
  $$values ('00000000-0000-4000-8000-00000000000a'::uuid)$$,
  'the runner reads its pod, and only its pod'
);
select results_eq(
  $$select id from account$$,
  $$values ('00000000-0000-4000-8000-00000000a0a1'::uuid)$$,
  'and that pod''s accounts'
);
select results_eq(
  $$select account_id from member$$,
  $$values ('00000000-0000-4000-8000-00000000a0a1'::uuid)$$,
  'and its members'
);
select results_eq(
  $$select handle from learner$$,
  $$values ('fox')$$,
  'and its learners, the names the prompt guard needs'
);
select results_eq(
  $$select id from goal$$,
  $$values ('00000000-0000-4000-8000-0000000008a1'::uuid)$$,
  'and its learners'' goals, none of another pod'
);

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000b', true);
select results_eq(
  $$select handle from learner$$,
  $$values ('owl')$$,
  'a unit for pod B reads pod B''s learner and not pod A''s'
);

select set_config('app.pod_id', '', true);
select is(
  (select count(*) from pod)::int + (select count(*) from learner)::int,
  0,
  'with no pod set, it reads nothing'
);

select set_config('app.pod_id', '00000000-0000-4000-8000-00000000000a', true);
select throws_ok(
  $$update learner set first_name = 'Changed' where pod_id = '00000000-0000-4000-8000-00000000000a'$$,
  '42501', null,
  'it cannot update a learner of its own pod'
);
select ok(
  not has_table_privilege('jadwigo_runner', 'pod', 'insert')
    and not has_table_privilege('jadwigo_runner', 'account', 'insert')
    and not has_table_privilege('jadwigo_runner', 'member', 'insert')
    and not has_table_privilege('jadwigo_runner', 'learner', 'insert, update, delete')
    and not has_table_privilege('jadwigo_runner', 'goal', 'insert, update, delete')
    and not has_table_privilege('jadwigo_runner', 'pod', 'update, delete'),
  'nor insert, update or delete any of the 5 tables'
);
reset role;

select * from finish();
rollback;
