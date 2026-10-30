-- The learner knowledge base: the shared curriculum, skills, goals with their skills, the mastery
-- cache, the parent's report and the evidence view (wave 1 of epic dl-e8ov.5, issue dl-e8ov.5.1).
--
-- Decisions in force:
-- jadwigo-learner-knowledge/decisions/2026-10-30-mastery-is-folded-on-read-from-the-evidence-view-and-also-kept-i
-- (mastery is folded from learner_skill_evidence, and learner_skill_mastery is a cache rebuilt after
-- each finished or claimed attempt), and
-- jadwigo-hackathon/decisions/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro
-- (curriculum, topic and skill rows live in Jadwigo's own pod, seeded from versioned files in the
-- repo, and every pod reads them).
--
-- The shared pod is Jadwigo's own, the featured pod: FEATURED_POD_ID in packages/contracts, whose
-- uuid lesson import names under its namespace (packages/lesson-import/src/ids.ts). SQL cannot
-- import it, so app.shared_pod_id() below returns the same uuid, and
-- packages/contracts/src/shared-pod.test.ts fails when the two differ.
--
-- A skill is keyed by its pod and its code, with no uuid and no prefix (RULES.md rule 8: keyed by
-- its owner's key): the code is the SkillId string lessons already carry. Jadwigo's pod's rows are
-- the templates; a pod's own row is a copy of one, or a draft, and wins for that pod.
--
-- Erasure (dl-e8ov.2.2) must add learner_skill_mastery and learner_report to the rows it deletes
-- for a learner: both hang off learner (pod_id, id).

create type skill_kind as enum ('accuracy', 'speed');
create type skill_status as enum ('reviewed', 'proposed', 'draft', 'retired');
create type goal_status as enum ('active', 'paused', 'reached', 'dropped');
create type mastery_level as enum ('not_started', 'attempted', 'familiar', 'proficient', 'mastered');

-- Jadwigo's own pod, which holds the shared catalogue. The same uuid as FEATURED_POD_ID.
create function app.shared_pod_id() returns uuid
language sql immutable
as $$
  select 'ced09f15-d79b-590a-ae25-5a63ff918fea'::uuid
$$;

-- A curriculum: the podstawa programowa of one country, in one version and language.
create table curriculum (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  code text not null check (code <> ''),
  name text not null check (name <> ''),
  country text not null check (country ~ '^[A-Z]{2}$'),
  version text not null check (version <> ''),
  language language not null,
  source_url text,
  created_at timestamptz not null default now(),
  unique (pod_id, code, version),
  unique (pod_id, id)
);

-- One outcome of a curriculum, such as II.3.3, in the law's own words.
create table topic (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  curriculum_id uuid not null,
  code text not null check (code <> ''),
  area text not null check (area <> ''),
  text text not null check (text <> ''),
  created_at timestamptz not null default now(),
  unique (curriculum_id, code),
  unique (pod_id, id),
  foreign key (pod_id, curriculum_id) references curriculum (pod_id, id)
);

-- A skill, by its code. topic_id may name a topic in the shared pod: a pod's copy keeps it.
create table skill (
  pod_id uuid not null references pod (id),
  code text not null check (app.skill_ids_valid(array[code])),
  topic_id uuid references topic (id),
  kind skill_kind not null default 'accuracy',
  status skill_status not null,
  can_do jsonb check (jsonb_typeof(can_do) = 'object'),
  aliases text[] not null default '{}' check (app.skill_ids_valid(aliases)),
  prerequisites text[] not null default '{}' check (app.skill_ids_valid(prerequisites)),
  source text not null check (source <> ''),
  created_at timestamptz not null default now(),
  primary key (pod_id, code)
);

-- A goal gains the parent's own words, the language its lessons are in, and where it stands.
alter table goal
  add column words text check (words <> ''),
  add column lesson_language language not null default 'pl',
  add column status goal_status not null default 'active';

-- The skills a goal is made of, each a skill row of the goal's pod (a copy or a draft).
create table goal_skill (
  pod_id uuid not null references pod (id),
  goal_id uuid not null,
  skill_code text not null,
  primary key (goal_id, skill_code),
  foreign key (pod_id, goal_id) references goal (pod_id, id),
  foreign key (pod_id, skill_code) references skill (pod_id, code)
);

-- The curriculum topics a goal covers. The topic is usually the shared pod's.
create table goal_topic (
  pod_id uuid not null references pod (id),
  goal_id uuid not null,
  topic_id uuid not null references topic (id),
  primary key (goal_id, topic_id),
  foreign key (pod_id, goal_id) references goal (pod_id, id)
);

-- The goals a lesson serves.
create table lesson_goal (
  pod_id uuid not null references pod (id),
  lesson_id uuid not null,
  goal_id uuid not null,
  primary key (lesson_id, goal_id),
  foreign key (pod_id, lesson_id) references lesson (pod_id, id),
  foreign key (pod_id, goal_id) references goal (pod_id, id)
);

-- A learner's school, inferred or told: all optional.
alter table learner
  add column country text check (country ~ '^[A-Z]{2}$'),
  add column curriculum_id uuid references curriculum (id),
  add column school_grade integer check (school_grade >= 0),
  add column school_language language;

-- The mastery cache: one row per skill code a learner has evidence on, replaced whole by the fold
-- after each finished or claimed attempt. card is the FSRS card under py-fsrs's names.
create table learner_skill_mastery (
  pod_id uuid not null references pod (id),
  learner_id uuid not null,
  skill_code text not null check (app.skill_ids_valid(array[skill_code])),
  level mastery_level not null,
  needs_attention boolean not null default false,
  tries integer not null default 0 check (tries >= 0),
  last_answered_at timestamptz,
  due_at timestamptz,
  card jsonb check (jsonb_typeof(card) = 'object'),
  computed_at timestamptz not null default now(),
  primary key (learner_id, skill_code),
  foreign key (pod_id, learner_id) references learner (pod_id, id)
);

-- The parent's report: code's digest, the AI's narrative (written once), the parent's decisions
-- (appended). Every other column is written once, at the insert.
create table learner_report (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  learner_id uuid not null,
  period_starts_at timestamptz not null,
  period_ends_at timestamptz not null,
  inputs_hash text not null check (inputs_hash <> ''),
  reused boolean not null default false,
  digest jsonb not null check (jsonb_typeof(digest) = 'object'),
  narrative jsonb check (jsonb_typeof(narrative) = 'object'),
  decisions jsonb not null default '[]' check (jsonb_typeof(decisions) = 'array'),
  created_at timestamptz not null default now(),
  unique (pod_id, id),
  check (period_ends_at >= period_starts_at),
  foreign key (pod_id, learner_id) references learner (pod_id, id)
);

create index learner_report_learner_id on learner_report (learner_id, created_at desc);

-- The narrative is written once, and decisions only grow at the end: the store checks both first,
-- and this refuses what a race or another caller would change.
create function app.learner_report_once() returns trigger
language plpgsql
as $$
begin
  if old.narrative is not null and new.narrative is distinct from old.narrative then
    raise exception 'report % already has its narrative', old.id using errcode = 'restrict_violation';
  end if;
  if jsonb_array_length(new.decisions) < jsonb_array_length(old.decisions)
    or coalesce(
      (select jsonb_agg(d.value order by d.n) from jsonb_array_elements(new.decisions)
        with ordinality as d(value, n) where d.n <= jsonb_array_length(old.decisions)),
      '[]'::jsonb
    ) is distinct from old.decisions then
    raise exception 'a report''s decisions are only appended' using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger learner_report_once
  before update on learner_report
  for each row execute function app.learner_report_once();

-- The skill codes of the question an attempt asked at seq, for a caller that reads the attempt:
-- its own pod's, or one its learner claimed. A copy of app.asked_question()'s check
-- (20261029120000_parent_login.sql): the claimer's pod reads no lesson_question row, since every
-- row carries its key, so this reads past row-level security and returns only skill_ids. Null for a
-- caller that reads neither.
create function app.asked_skills(attempt_id uuid, seq integer)
returns text[]
language sql stable security definer set search_path = public, pg_temp
as $$
  select q.skill_ids
  from attempt_question as aq
  join attempt as a on a.id = aq.attempt_id
  join lesson_question as q on q.pod_id = aq.pod_id and q.id = aq.lesson_question_id
  where aq.attempt_id = asked_skills.attempt_id
    and aq.seq = asked_skills.seq
    and (
      a.pod_id = app.current_pod_id()
      or (select l.pod_id from learner as l where l.id = a.learner_id) = app.current_pod_id()
      or current_setting('is_superuser') = 'on'
    )
$$;

-- The evidence mastery is folded from: one row per answer and skill code of a real attempt with a
-- learner, a skip or a judged try. Row-level security on the tables joined does the pod filter, a
-- claimed attempt included (its claimed_read policies); pod_id is the attempt's pod.
create view learner_skill_evidence with (security_invoker = true) as
select
  x.pod_id,
  t.learner_id,
  x.attempt_id,
  x.seq,
  x.try_no,
  x.kind,
  s.skill_code,
  x.answered_at,
  x.correct,
  x.help_used,
  x.latency_ms,
  x.mistake_class,
  q.added,
  l.kind as lesson_kind,
  g.hold_verdicts
from attempt_answer as x
join attempt as t on t.id = x.attempt_id
join attempt_question as q on q.attempt_id = x.attempt_id and q.seq = x.seq
join assignment as g on g.id = t.assignment_id
join lesson_version as v on v.id = t.lesson_version_id
join lesson as l on l.id = v.lesson_id
cross join lateral unnest(app.asked_skills(x.attempt_id, x.seq)) as s(skill_code)
where t.learner_id is not null
  and t.mode = 'real'
  and (x.kind = 'skip' or x.correct is not null);

-- Row-level security on the new tables, as on every other.
do $$
declare
  t text;
begin
  foreach t in array array[
    'curriculum', 'topic', 'skill', 'goal_skill', 'goal_topic', 'lesson_goal',
    'learner_skill_mastery', 'learner_report'
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

-- Every pod reads the shared catalogue, Jadwigo's pod's rows. Read only: a write still needs the
-- row's pod to be the caller's.
do $$
declare
  t text;
begin
  foreach t in array array['curriculum', 'topic', 'skill'] loop
    execute format(
      'create policy shared_read on %I for select using (pod_id = app.shared_pod_id())', t
    );
  end loop;
end
$$;

-- The API reads and adds the catalogue, goals' links and reports; it replaces a learner's mastery
-- rows whole; it changes a goal's status, a goal's skills, and a report's
-- narrative and decisions, nothing else.
grant select, insert on curriculum, topic, skill, goal_skill, goal_topic, lesson_goal,
  learner_report to jadwigo_api;
grant select, insert, delete on learner_skill_mastery to jadwigo_api;
grant delete on goal_skill to jadwigo_api;
grant update (status) on goal to jadwigo_api;
grant update (narrative, decisions) on learner_report to jadwigo_api;
grant select on learner_skill_evidence to jadwigo_api;
