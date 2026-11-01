-- The step consumer may call the 3 app functions the learner verbs' reads go through (issue
-- dl-z5ja.125, wave 4 lead decision 45): app.shared_pod_id() in the skill, topic and curriculum
-- shared_read policies; app.asked_skills() in the learner_skill_evidence view; app.asked_question()
-- in the attempt_result view. Without them, listSkills, getLearnerEvidence, getAttemptResult and
-- getLearnerAttempts are refused to jadwigo_runner (42501).
--
-- A new privilege for jadwigo_runner, made visible: run.test.sql's fence now names these 3 beside
-- its 4, 7 in all. Each reads, never writes. shared_pod_id is an immutable constant. The other 2
-- are stable and check the caller's pod themselves (app.current_pod_id(), which the runner sets per
-- unit), so another pod's attempt answers nothing (runner_read_functions.test.sql).
grant execute on function
  app.shared_pod_id(), app.asked_skills(uuid, integer), app.asked_question(uuid, integer)
to jadwigo_runner;
