-- The custom access token hook puts the user's pod on the token (migration
-- 20261101200000_token_pod_id.sql, issue dl-z5ja.92): a user with an account gets the top-level
-- pod_id claim app.current_pod_id() reads, a user with none gets no pod_id, user_metadata is still
-- trimmed, and the token then joins its pod's run topic. Made-up rows only.
begin;
select plan(7);
\ir _fixture.sql

insert into account (id, pod_id, sub) values
  ('00000000-0000-4000-8000-00000000a0a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000005a1');
insert into member (pod_id, account_id, role) values
  ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-00000000a0a1', 'parent');
insert into run (id, pod_id, created_by, workflow, idle_deadline_at, max_deadline_at, cap_usd) values
  ('00000000-0000-4000-8000-0000000d00a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-00000000a0a1', 'jadwigo-lesson-compose',
   now() + interval '10 minutes', now() + interval '30 minutes', 0.05);
insert into run_event (run_id, seq, event_id, pod_id, type, payload) values
  ('00000000-0000-4000-8000-0000000d00a1', 1, gen_random_uuid(),
   '00000000-0000-4000-8000-00000000000a', 'status', '{"status": "in_progress"}');

-- As Supabase Auth runs the hook.
set local role supabase_auth_admin;
create temp table token as
select app.custom_access_token(
  '{"user_id": "00000000-0000-4000-8000-0000000005a1", "authentication_method": "oauth",
    "claims": {"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated",
      "user_metadata": {"sub": "1001", "email": "parent@example.com", "name": "Made Up"}}}'
) as event;
create temp table no_account as
select app.custom_access_token(
  '{"user_id": "00000000-0000-4000-8000-0000000005ff", "claims": {"sub": "00000000-0000-4000-8000-0000000005ff"}}'
) as event;
create temp table not_uuid as
select app.custom_access_token('{"user_id": "u", "claims": {"sub": "u"}}') as event;
reset role;

select is(
  (select event -> 'claims' ->> 'pod_id' from token),
  '00000000-0000-4000-8000-00000000000a',
  'a user with an account gets its pod as the top-level pod_id claim'
);
select is(
  (select event -> 'claims' -> 'user_metadata' from token),
  '{"sub": "1001", "email": "parent@example.com"}'::jsonb,
  'and user_metadata is still trimmed'
);
select is(
  (select (event -> 'claims') - 'pod_id' - 'user_metadata' from token),
  '{"sub": "00000000-0000-4000-8000-0000000005a1", "role": "authenticated"}'::jsonb,
  'and every other claim is kept'
);
select ok(
  not (select event -> 'claims' ? 'pod_id' from no_account),
  'a user with no account yet gets no pod_id'
);
select is(
  (select event from not_uuid),
  '{"user_id": "u", "claims": {"sub": "u"}}'::jsonb,
  'a user_id that is not a uuid finds no pod, and the token passes through'
);
select ok(
  not has_table_privilege('supabase_auth_admin', 'account', 'select')
    and not has_table_privilege('supabase_auth_admin', 'member', 'select'),
  'supabase_auth_admin still reads no account or member row'
);

-- The token's claims, as Realtime's join check sees them.
select set_config('request.jwt.claims', (select (event -> 'claims')::text from token), true);
set local role authenticated;
set local realtime.topic = 'run:run_0000000000800800000000t051';
select is(
  (select count(*) from realtime.messages)::int, 1, 'and that token joins its pod''s run topic'
);
reset role;

select * from finish();
rollback;
