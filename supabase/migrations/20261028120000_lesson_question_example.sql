-- The playground's written examples, read from the database (issue dl-w3.75, owner 2026-10-28:
-- a new table holds an example's scenarios, label and showcase flag).
--
-- One row per example per language. The question is a lesson_question in that language, and
-- `twin` is help rung 4's twin, a lesson_question whose twin_of is that question. It is named here
-- rather than looked up, because a re-seed of an edited twin leaves the old twin row in place. The scenarios are the values a child might
-- commit, each with its outcome, mistake class and the parts the page marks, written by hand
-- until the judges land (decision
-- jadwigo-learner-experience/decisions/2026-10-27-until-the-judges-land-the-playground-s-try-it-plays-each-example).
--
-- Unlike content, an example is not write-once: the seed replaces a pod's examples in one
-- transaction. The questions it points at stay write-once, so an edited example points at new
-- lesson_question rows.

create table lesson_question_example (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id),
  lesson_question_id uuid not null,
  twin uuid,
  language language not null,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer not null check (position >= 1),
  label text not null check (label <> ''),
  showcase boolean not null default false,
  scenarios jsonb not null check (jsonb_typeof(scenarios) = 'array'),
  created_at timestamptz not null default now(),
  unique (pod_id, id),
  unique (pod_id, language, lesson_question_id),
  check (twin <> lesson_question_id),
  foreign key (pod_id, lesson_question_id) references lesson_question (pod_id, id),
  foreign key (pod_id, twin) references lesson_question (pod_id, id)
);

create index lesson_question_example_language on lesson_question_example (pod_id, language);

alter table lesson_question_example enable row level security;
alter table lesson_question_example force row level security;
create policy pod_scope on lesson_question_example
  using (pod_id = app.current_pod_id()) with check (pod_id = app.current_pod_id());

grant select, insert, delete on lesson_question_example to jadwigo_api;
