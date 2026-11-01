-- The step consumer reads what a step reads (issue dl-z5ja.125): the page context's lesson
-- (runStep's pageLine, dl-z5ja.107; Store.getLesson, dl-z5ja.119) and the learner verbs' records
-- (dl-z5ja.25). 20261101190000_runner_reads_names.sql granted only pod, account, member, learner
-- and goal, so on Postgres these reads were refused (42501).
--
-- A new privilege for jadwigo_runner: SELECT only, never a write, and only under the policies these
-- tables already force. The runner sets app.pod_id per unit after authorizeRun, so pod_scope reads
-- the run's own pod. The claimed_read policies on lesson, lesson_version, assignment and the
-- attempt tables read attempt and learner under that same scope, so the runner needs both to
-- evaluate them; it then reads a claimed attempt's lesson as the parent would, never more.
--
-- Not here: EXECUTE on app.shared_pod_id(), app.asked_skills() and app.asked_question(), which the
-- skill catalogue's shared_read policy and the evidence and attempt_result views call. The frozen
-- run.test.sql holds jadwigo_runner to 4 app functions, so that is the lead's call (dl-z5ja.125).
-- The 2 views are security_invoker, so they read under the same policies. Their reads still need
-- those functions until the lead decides; granting them now leaves one step, not two.
grant select on
  lesson, lesson_version, assignment, attempt, attempt_question, attempt_answer, goal_skill,
  learner_report, learner_skill_mastery, skill, attempt_result, learner_skill_evidence
to jadwigo_runner;
