-- Core v0: a lesson played from the database (epic dl-e8ov.2.32, issue dl-e8ov.2.32.1).
--
-- 10 tables and the attempt_result view. The model is docs/research/core-data-model.md, the
-- names follow packages/contracts/RULES.md, and the decisions are under
-- jadwigo-platform/decisions/2026-10-27-*. Content is write-once, evidence is append-only, and
-- every row carries pod_id, which row-level security compares with app.current_pod_id().

create extension if not exists pgcrypto;

-- The caller's pod, set by the API in each transaction after authorize():
--   select set_config('app.pod_id', '<uuid>', true)
-- Unset, it is null, and every policy then matches nothing.
create schema app;

create function app.current_pod_id() returns uuid
language sql stable
as $$
  select nullif(current_setting('app.pod_id', true), '')::uuid
$$;

create function app.skill_ids_valid(ids text[]) returns boolean
language sql immutable
as $$
  select coalesce(bool_and(s ~ '^[a-z]+(\.[a-z0-9-]+)+$'), true) from unnest(ids) as s
$$;

create type language as enum ('pl', 'en', 'uk');
create type subject as enum ('math', 'polish', 'english');
create type category as enum ('child', 'adult');
create type family as enum ('choose', 'enter', 'slots', 'sequence', 'group', 'place', 'explain');
create type question_type as enum (
  'true_false', 'recognition', 'lettered_choice', 'multi_select', 'mark_numbers',
  'fraction_compare', 'production', 'short_text', 'expression', 'measure', 'fill_gaps',
  'fill_table', 'label_picture', 'column', 'pyramid', 'clock_read', 'money_count', 'order',
  'bucket', 'match', 'number_line_place', 'hotspot', 'spatial_build', 'draw_graph', 'clock_set',
  'money_pay', 'fraction_shade', 'area_model', 'explain'
);
create type lesson_kind as enum ('practice', 'review', 'check', 'diagnostic');
create type lesson_status as enum ('draft', 'published', 'archived');
create type question_role as enum ('planned', 'spare');
create type audience as enum ('learners', 'anyone');
create type identity as enum ('pick', 'type', 'none');
create type after_not_sure as enum ('next', 'twin_now', 'review_round');
create type attempt_mode as enum ('real', 'preview');
create type attempt_status as enum ('in_progress', 'paused', 'finished');
create type added as enum ('planned', 'twin');
create type placed as enum ('now', 'review_round');
create type ended as enum ('correct', 'skipped');
create type answer_kind as enum ('try', 'skip');
create type skip_reason as enum ('dont_know', 'asked_to_skip', 'help_twin');

-- Content

create table pod (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  language language not null,
  created_at timestamptz not null default now()
);

create table learner (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  handle text not null check (handle <> ''),
  first_name text not null check (first_name <> ''),
  age_group text,
  created_at timestamptz not null default now(),
  unique (pod_id, handle),
  unique (pod_id, id)
);

create table lesson (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  title text not null check (title <> ''),
  language language not null,
  kind lesson_kind not null default 'practice',
  status lesson_status not null default 'draft',
  reasoning text,
  category category not null,
  subject subject not null,
  grade integer check (grade >= 0),
  skill_ids text[] not null default '{}' check (app.skill_ids_valid(skill_ids)),
  created_at timestamptz not null default now(),
  unique (pod_id, id)
);

-- Written while published_at is null; publishing sets it, and from then on nothing changes.
create table lesson_version (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  lesson_id uuid not null,
  version integer not null check (version >= 1),
  revises uuid,
  published_at timestamptz,
  unique (lesson_id, version),
  unique (pod_id, id),
  foreign key (pod_id, lesson_id) references lesson (pod_id, id),
  foreign key (pod_id, revises) references lesson_version (pod_id, id)
);

-- Written once. An edit makes a new row. key never reaches the page.
create table lesson_question (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  family family not null,
  question_type question_type not null,
  say text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  key jsonb not null check (jsonb_typeof(key) = 'object'),
  help jsonb not null default '{}' check (jsonb_typeof(help) = 'object'),
  credit jsonb check (jsonb_typeof(credit) = 'object'),
  subject subject not null,
  grade integer check (grade >= 0),
  skill_ids text[] not null default '{}' check (app.skill_ids_valid(skill_ids)),
  twin_of uuid,
  based_on jsonb check (jsonb_typeof(based_on) = 'object'),
  content_hash text not null check (content_hash <> ''),
  created_at timestamptz not null default now(),
  unique (pod_id, id),
  foreign key (pod_id, twin_of) references lesson_question (pod_id, id)
);

create index lesson_question_skill_ids on lesson_question using gin (skill_ids);
create index lesson_question_twin_of on lesson_question (twin_of) where twin_of is not null;

-- A version's list: planned at positions 1 to n, then the spares growth may draw from n + 1.
create table lesson_version_question (
  lesson_version_id uuid not null,
  position integer not null check (position >= 1),
  pod_id uuid not null references pod (id),
  lesson_question_id uuid not null,
  role question_role not null,
  primary key (lesson_version_id, position),
  foreign key (pod_id, lesson_version_id) references lesson_version (pod_id, id),
  foreign key (pod_id, lesson_question_id) references lesson_question (pod_id, id)
);

-- Who it goes to

create table assignment (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  lesson_id uuid not null,
  lesson_version_id uuid,
  audience audience not null,
  identity identity not null,
  after_not_sure after_not_sure not null default 'next',
  hold_verdicts boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  unique (pod_id, id),
  check (closes_at > opens_at),
  foreign key (pod_id, lesson_id) references lesson (pod_id, id),
  foreign key (pod_id, lesson_version_id) references lesson_version (pod_id, id)
);

-- Evidence

create table attempt (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  assignment_id uuid not null,
  lesson_version_id uuid not null,
  learner_id uuid,
  player_name text,
  mode attempt_mode not null default 'real',
  status attempt_status not null default 'in_progress',
  resume_at integer check (resume_at >= 1),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (pod_id, id),
  check ((status = 'finished') = (finished_at is not null)),
  foreign key (pod_id, assignment_id) references assignment (pod_id, id),
  foreign key (pod_id, lesson_version_id) references lesson_version (pod_id, id),
  foreign key (pod_id, learner_id) references learner (pod_id, id)
);

create index attempt_assignment_id on attempt (assignment_id);

-- Written when the question is asked, never ahead, so seq is the play order.
create table attempt_question (
  attempt_id uuid not null,
  seq integer not null check (seq >= 1),
  pod_id uuid not null references pod (id),
  lesson_question_id uuid not null,
  added added not null,
  placed placed,
  added_for integer,
  help_released integer not null default 0 check (help_released between 0 and 4),
  ended ended,
  asked_at timestamptz not null default now(),
  primary key (attempt_id, seq),
  unique (pod_id, attempt_id, seq),
  check ((added = 'planned') = (placed is null)),
  check ((added = 'planned') = (added_for is null)),
  check (added_for < seq),
  foreign key (pod_id, attempt_id) references attempt (pod_id, id),
  foreign key (pod_id, lesson_question_id) references lesson_question (pod_id, id),
  foreign key (attempt_id, added_for) references attempt_question (attempt_id, seq)
);

-- One try, or a skip. Never updated, never deleted. A replay is matched on event_id and body_hash.
create table attempt_answer (
  event_id uuid primary key,
  pod_id uuid not null references pod (id),
  attempt_id uuid not null,
  seq integer not null,
  try_no integer not null check (try_no >= 1),
  kind answer_kind not null,
  value jsonb,
  skip_reason skip_reason,
  latency_ms integer not null check (latency_ms >= 0),
  help_used integer not null default 0 check (help_used >= 0),
  asked_at timestamptz not null,
  answered_at timestamptz not null,
  correct boolean,
  mistake_class text,
  parts jsonb check (jsonb_typeof(parts) = 'array'),
  judged_by text,
  body_hash text not null check (body_hash <> ''),
  unique (attempt_id, seq, try_no),
  check ((kind = 'skip') = (skip_reason is not null)),
  check ((kind = 'try') = (value is not null)),
  check (kind = 'try' or correct is null),
  foreign key (pod_id, attempt_id, seq) references attempt_question (pod_id, attempt_id, seq)
);

-- Write-once and append-only

create function app.refuse_change() returns trigger
language plpgsql
as $$
begin
  raise exception '% rows are never % (packages/contracts/RULES.md rules 10 and 11)',
    tg_table_name, lower(tg_op) || 'd'
    using errcode = 'restrict_violation';
end
$$;

-- Lets an update change only the columns named in the trigger's arguments.
create function app.allow_only() returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - tg_argv) is distinct from (to_jsonb(old) - tg_argv) then
    raise exception 'on %, only % may change', tg_table_name, array_to_string(tg_argv, ', ')
      using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger attempt_answer_append_only
  before update or delete on attempt_answer
  for each row execute function app.refuse_change();
create trigger attempt_answer_no_truncate
  before truncate on attempt_answer
  for each statement execute function app.refuse_change();

create trigger lesson_question_write_once
  before update or delete on lesson_question
  for each row execute function app.refuse_change();

create function app.lesson_version_guard() returns trigger
language plpgsql
as $$
begin
  if old.published_at is not null then
    raise exception 'lesson_version % is published and never changes', old.id
      using errcode = 'restrict_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  if (to_jsonb(new) - 'published_at') is distinct from (to_jsonb(old) - 'published_at') then
    raise exception 'publishing sets published_at and nothing else'
      using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger lesson_version_published_once
  before update or delete on lesson_version
  for each row execute function app.lesson_version_guard();

create function app.lesson_version_question_guard() returns trigger
language plpgsql
as $$
declare
  version_id uuid := case when tg_op = 'INSERT' then new.lesson_version_id else old.lesson_version_id end;
begin
  if tg_op = 'UPDATE' then
    raise exception 'lesson_version_question rows are never updated'
      using errcode = 'restrict_violation';
  end if;
  if exists (select from lesson_version where id = version_id and published_at is not null) then
    raise exception 'lesson_version % is published and its list never changes', version_id
      using errcode = 'restrict_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger lesson_version_question_while_draft
  before insert or update or delete on lesson_version_question
  for each row execute function app.lesson_version_question_guard();

create trigger attempt_question_help_and_end_only
  before update on attempt_question
  for each row execute function app.allow_only('help_released', 'ended');
create trigger attempt_question_no_delete
  before delete on attempt_question
  for each row execute function app.refuse_change();

create function app.attempt_question_forward_only() returns trigger
language plpgsql
as $$
begin
  if new.help_released < old.help_released then
    raise exception 'help_released only counts up' using errcode = 'restrict_violation';
  end if;
  if old.ended is not null and new.ended is distinct from old.ended then
    raise exception 'an attempt question ends once' using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger attempt_question_forward
  before update on attempt_question
  for each row execute function app.attempt_question_forward_only();

create trigger attempt_status_only
  before update on attempt
  for each row execute function app.allow_only('status', 'resume_at', 'finished_at');
create trigger attempt_no_delete
  before delete on attempt
  for each row execute function app.refuse_change();

create function app.attempt_finished_once() returns trigger
language plpgsql
as $$
begin
  if old.status = 'finished' then
    raise exception 'attempt % is finished', old.id using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger attempt_finished
  before update on attempt
  for each row execute function app.attempt_finished_once();

-- What the after-lesson list reads: one row per attempt question.

create view attempt_result with (security_invoker = true) as
select
  aq.pod_id,
  aq.attempt_id,
  aq.seq,
  aq.lesson_question_id,
  aq.added,
  aq.placed,
  aq.added_for,
  lq.say,
  lq.family,
  lq.question_type,
  coalesce(s.tries, 0) as tries,
  coalesce(s.first_try_correct, false) as first_try_correct,
  coalesce(aq.ended = 'correct', false) as correct,
  coalesce(m.mistake_classes, '{}') as mistake_classes,
  coalesce(s.help_used, 0) as help_used,
  s.skip_reason,
  coalesce(s.time_ms, 0) as time_ms,
  aq.ended
from attempt_question as aq
join lesson_question as lq on lq.pod_id = aq.pod_id and lq.id = aq.lesson_question_id
left join lateral (
  select
    (count(*) filter (where a.kind = 'try'))::integer as tries,
    bool_or(a.try_no = 1 and a.kind = 'try' and a.correct) as first_try_correct,
    max(a.help_used) as help_used,
    (array_agg(a.skip_reason order by a.try_no desc) filter (where a.kind = 'skip'))[1] as skip_reason,
    sum(a.latency_ms)::integer as time_ms
  from attempt_answer as a
  where a.attempt_id = aq.attempt_id and a.seq = aq.seq
) as s on true
left join lateral (
  select array_agg(c.mistake_class order by c.first_try_no) as mistake_classes
  from (
    select a.mistake_class, min(a.try_no) as first_try_no
    from attempt_answer as a
    where a.attempt_id = aq.attempt_id and a.seq = aq.seq and a.mistake_class is not null
    group by a.mistake_class
  ) as c
) as m on true;

-- Row-level security: every table compares pod_id with the caller's pod.

alter table pod enable row level security;
alter table pod force row level security;
create policy pod_scope on pod
  using (id = app.current_pod_id()) with check (id = app.current_pod_id());

do $$
declare
  t text;
begin
  foreach t in array array[
    'learner', 'lesson', 'lesson_version', 'lesson_question', 'lesson_version_question',
    'assignment', 'attempt', 'attempt_question', 'attempt_answer'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy pod_scope on %I using (pod_id = app.current_pod_id()) '
      'with check (pod_id = app.current_pod_id())', t
    );
  end loop;
end
$$;

-- The pod behind an id the caller holds before it knows its pod: an open assignment for anyone
-- (a featured lesson), or an attempt (an anonymous player's only key, a v4 uuid). authorize()
-- calls these, then sets app.pod_id. They read past row-level security on purpose and return
-- nothing else.
create function app.assignment_pod(assignment_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select pod_id from assignment where id = assignment_id
$$;

create function app.attempt_pod(attempt_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select pod_id from attempt where id = attempt_id
$$;

-- The API's role: never the owner, never bypassrls. Its login and password are set per
-- environment outside migrations.
do $$
begin
  if not exists (select from pg_roles where rolname = 'jadwigo_api') then
    create role jadwigo_api nologin nobypassrls;
  end if;
end
$$;

grant usage on schema public, app to jadwigo_api;
grant execute on all functions in schema app to jadwigo_api;
grant select on pod, learner, lesson, lesson_version, lesson_question, lesson_version_question,
  assignment, attempt, attempt_question, attempt_answer, attempt_result to jadwigo_api;
grant insert on pod, learner, lesson, lesson_version, lesson_question, lesson_version_question,
  assignment, attempt, attempt_question, attempt_answer to jadwigo_api;
grant update (published_at) on lesson_version to jadwigo_api;
grant update (status) on lesson to jadwigo_api;
grant update (status, resume_at, finished_at) on attempt to jadwigo_api;
grant update (help_released, ended) on attempt_question to jadwigo_api;
grant delete on lesson_version_question to jadwigo_api;

-- Supabase grants the public schema to its Data API roles. jadwigo reaches Postgres only through
-- apps/api, so they get nothing here.
do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all functions in schema app from %I', r);
    end if;
  end loop;
end
$$;
revoke all on all functions in schema app from public;
grant execute on all functions in schema app to jadwigo_api;
