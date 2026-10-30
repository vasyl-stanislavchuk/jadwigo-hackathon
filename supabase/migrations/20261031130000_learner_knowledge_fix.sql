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
