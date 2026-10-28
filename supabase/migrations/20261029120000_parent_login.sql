-- Parent login: account, member, goal and the claim (wave 3 of epic dl-e8ov.2, issue dl-e8ov.2.37).
--
-- The design is docs/research/parent-login.md. Decisions in force:
-- jadwigo-platform/decisions/2026-10-27-the-v0-people-records-are-pod-and-learner-account-and-member-com
-- (account and member arrive with Supabase Auth, keyed to the pod),
-- jadwigo-platform/decisions/2026-10-27-before-supabase-auth-row-level-security-reads-the-caller-s-pod-f
-- (row-level security reads app.pod_id now, the token's claim later), and docs/research/core-data-model.md,
-- "What is deferred": a claim updates attempt.learner_id with claimed_by, and answers stay untouched.
--
-- A featured lesson's attempt lives in Jadwigo's pod, and the learner who claims it lives in the
-- parent's pod. The attempt stays where it is: its learner may be in another pod, and that pod
-- reads it (never writes it) through the select policies at the end of this file.

-- The caller's pod: the token's pod_id claim when the API has set one, else app.pod_id as before.
-- request.jwt.claims is the setting auth.jwt() reads (supabase/tests/shim.sql, and Supabase's own);
-- reading it here needs no grant on the auth schema. Supabase's tokens carry no pod_id until a
-- custom access token hook adds one, so today the API sets app.pod_id from the member row.
create or replace function app.current_pod_id() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'pod_id', '')::uuid,
    nullif(current_setting('app.pod_id', true), '')::uuid
  )
$$;

create type member_role as enum ('parent', 'self');

-- Someone who signs in. sub is the Supabase Auth user (the token's sub claim); pod_id is the pod
-- the first sign-in made. No email and no name: the token carries them (dl-e8ov.2.16 is open).
create table account (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  sub uuid not null unique,
  created_at timestamptz not null default now(),
  unique (pod_id, id)
);

-- One account in one pod. An account may later join another pod, so account_id is a plain key.
-- Which learners a member covers waits on dl-e8ov.2.28: v0 has no cover list.
create table member (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  account_id uuid not null references account (id),
  role member_role not null,
  created_at timestamptz not null default now(),
  unique (pod_id, account_id),
  unique (pod_id, id)
);

create index member_account_id on member (account_id);

-- A goal stub: a name for one learner. Skills and stages attach later.
create table goal (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  learner_id uuid not null,
  name text not null check (name <> ''),
  created_at timestamptz not null default now(),
  unique (pod_id, id),
  foreign key (pod_id, learner_id) references learner (pod_id, id)
);

create index goal_learner_id on goal (learner_id);

-- The claim and, later, the move (dl-e8ov.5.11). claimed_by and moved_by are accounts.
alter table attempt drop constraint attempt_pod_id_learner_id_fkey;
alter table attempt
  add column claimed_by uuid references account (id),
  add column claimed_at timestamptz,
  add column moved_by uuid references account (id),
  add column moved_at timestamptz,
  add foreign key (learner_id) references learner (id),
  add check ((claimed_by is null) = (claimed_at is null)),
  add check ((moved_by is null) = (moved_at is null)),
  add check (claimed_by is null or learner_id is not null);

create index attempt_learner_id on attempt (learner_id) where learner_id is not null;

-- On attempt, the claim columns join status, resume_at and finished_at as what may change.
drop trigger attempt_status_only on attempt;
create trigger attempt_status_only
  before update on attempt
  for each row execute function app.allow_only(
    'status', 'resume_at', 'finished_at', 'learner_id', 'claimed_by', 'claimed_at', 'moved_by', 'moved_at'
  );

-- A finished attempt still refuses every change, except a claim: a parent saves it after the results.
create or replace function app.attempt_finished_once() returns trigger
language plpgsql
as $$
declare
  claim text[] := array['learner_id', 'claimed_by', 'claimed_at', 'moved_by', 'moved_at'];
begin
  if old.status = 'finished' and (to_jsonb(new) - claim) is distinct from (to_jsonb(old) - claim) then
    raise exception 'attempt % is finished', old.id using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

-- The pod of a learner, past row-level security, for the rule below.
create function app.learner_pod(learner_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select pod_id from learner where id = learner_id
$$;

-- An attempt's learner is in the attempt's pod, unless a claim put it there. A claim sets the
-- learner and claimed_by together, once, on a real attempt with no learner. A move waits for its
-- route (dl-e8ov.5.11), so moved_by stays null for now.
create function app.attempt_learner_guard() returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.claimed_by is not null or new.moved_by is not null then
      raise exception 'an attempt starts unclaimed' using errcode = 'restrict_violation';
    end if;
    if new.learner_id is not null and app.learner_pod(new.learner_id) is distinct from new.pod_id then
      raise exception 'a named attempt''s learner is in the attempt''s pod'
        using errcode = 'restrict_violation';
    end if;
    return new;
  end if;
  if new.moved_by is distinct from old.moved_by or new.moved_at is distinct from old.moved_at then
    raise exception 'moving an attempt between learners comes with dl-e8ov.5.11'
      using errcode = 'restrict_violation';
  end if;
  if new.learner_id is distinct from old.learner_id
    or new.claimed_by is distinct from old.claimed_by
    or new.claimed_at is distinct from old.claimed_at then
    if old.learner_id is not null or old.claimed_by is not null then
      raise exception 'attempt % already has a learner', old.id
        using errcode = 'restrict_violation', detail = 'AttemptClaimed';
    end if;
    if new.learner_id is null or new.claimed_by is null then
      raise exception 'a claim sets the learner and claimed_by together'
        using errcode = 'restrict_violation';
    end if;
    if old.mode = 'preview' then
      raise exception 'a preview attempt is never claimed'
        using errcode = 'restrict_violation', detail = 'AttemptPreview';
    end if;
  end if;
  return new;
end
$$;

create trigger attempt_learner
  before insert or update on attempt
  for each row execute function app.attempt_learner_guard();

-- The pod of the account a token's sub names, past row-level security: authorize() calls it, then
-- sets app.pod_id, as it does with app.attempt_pod(). Null before the first sign-in made one.
create function app.member_pod(sub uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select m.pod_id
  from account as a
  join member as m on m.account_id = a.id
  where a.sub = member_pod.sub
  order by m.created_at, m.id
  limit 1
$$;

-- The claim, in one statement: the tab's attempt gets a learner of the caller's pod.
--
--   learner or account not in the caller's pod   -> no_data_found (the API's NotFound)
--   no such attempt                              -> no_data_found
--   a preview attempt                            -> restrict_violation, detail AttemptPreview
--   the same learner and account again           -> the stored row (a replay)
--   any other attempt with a learner             -> restrict_violation, detail AttemptClaimed
--
-- The attempt is usually in another pod (Jadwigo's), which the caller cannot write, so this reads
-- and writes past row-level security, and checks the caller's pod itself first. The row lock
-- makes 2 racing claims one winner and one AttemptClaimed. Answers are not touched.
create function app.claim_attempt(attempt_id uuid, learner_id uuid, account_id uuid)
returns setof attempt
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  caller uuid := app.current_pod_id();
  claimed attempt;
begin
  if caller is null
    or not exists (select from learner as l where l.id = claim_attempt.learner_id and l.pod_id = caller)
    or not exists (
      select from member as m where m.account_id = claim_attempt.account_id and m.pod_id = caller
    ) then
    raise exception 'no such learner in the caller''s pod' using errcode = 'no_data_found';
  end if;
  select * into claimed from attempt as t where t.id = claim_attempt.attempt_id for update;
  if claimed.id is null then
    raise exception 'no such attempt' using errcode = 'no_data_found';
  end if;
  if claimed.learner_id is not distinct from claim_attempt.learner_id
    and claimed.claimed_by is not distinct from claim_attempt.account_id then
    return next claimed;
    return;
  end if;
  return query
    update attempt as t
    set learner_id = claim_attempt.learner_id, claimed_by = claim_attempt.account_id, claimed_at = now()
    where t.id = claim_attempt.attempt_id
    returning t.*;
end
$$;

-- Row-level security on the new tables, as on every other.
do $$
declare
  t text;
begin
  foreach t in array array['account', 'member', 'goal'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy pod_scope on %I using (pod_id = app.current_pod_id()) '
      'with check (pod_id = app.current_pod_id())', t
    );
  end loop;
end
$$;

-- A pod reads the attempts its learners claimed, with their questions and answers, and the
-- content of the pod they were played in (the lesson, its version and questions, the assignment).
-- Read only: every write still needs pod_id to be the caller's. Each subquery is uncorrelated and
-- starts from the caller's learners, so the login-free path, whose pod has none, pays almost nothing.
create policy claimed_read on attempt for select
  using (learner_id in (select id from learner));

do $$
declare
  t text;
begin
  foreach t in array array['attempt_question', 'attempt_answer'] loop
    execute format(
      'create policy claimed_read on %I for select using (attempt_id in '
      '(select a.id from attempt as a where a.learner_id in (select id from learner)))', t
    );
  end loop;
  foreach t in array array['lesson', 'lesson_version', 'lesson_question', 'assignment'] loop
    execute format(
      'create policy claimed_read on %I for select using (pod_id in '
      '(select a.pod_id from attempt as a where a.learner_id in (select id from learner)))', t
    );
  end loop;
end
$$;

-- The API reads and adds people; it changes and deletes none. A claim goes through
-- app.claim_attempt(), never an update of attempt.
grant select, insert on account, member, goal to jadwigo_api;
