-- A pod's row names a topic or a curriculum of its own pod or the shared pod, never another pod's
-- (issue dl-e8ov.5.43, the review of 20261031120000_learner_knowledge.sql).
--
-- skill.topic_id, goal_topic.topic_id and learner.curriculum_id are plain foreign keys on id, so
-- they may name the shared pod's rows, as a copied skill must. A foreign key checks past row-level
-- security, though, so without these a pod could also link another pod's topic or curriculum, and
-- learn from the insert whether an id exists there. Each restrictive policy below asks that the
-- row named be one the caller reads: its own pod's, or the shared pod's (shared_read). A null
-- passes. Reads are untouched (using true).

create policy readable_topic on skill as restrictive
  using (true)
  with check (topic_id is null or topic_id in (select id from topic));

create policy readable_topic on goal_topic as restrictive
  using (true)
  with check (topic_id in (select id from topic));

create policy readable_curriculum on learner as restrictive
  using (true)
  with check (curriculum_id is null or curriculum_id in (select id from curriculum));

-- The brief and the goal views read a goal's lessons, and a topic's skills and goals.
create index lesson_goal_goal_id on lesson_goal (goal_id);
create index skill_topic_id on skill (topic_id) where topic_id is not null;
create index goal_topic_topic_id on goal_topic (topic_id);

-- A report's columns other than narrative and decisions are written once, at the insert, for every
-- role, the owner included: column grants keep jadwigo_api to those 2, and this keeps everyone else,
-- as attempt guards its columns by trigger. The narrative and decisions rules stay as they were.
create or replace function app.learner_report_once() returns trigger
language plpgsql
as $$
begin
  if (to_jsonb(new) - array['narrative', 'decisions']) is distinct from
     (to_jsonb(old) - array['narrative', 'decisions']) then
    raise exception 'on report %, only narrative and decisions may change', old.id
      using errcode = 'restrict_violation';
  end if;
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
