-- The step consumer reads the pod it runs a step for (issue dl-z5ja.81, lead's option (a)). runStep
-- gives the prompt guard the pod's learner names on every model call (dl-z5ja.35), through the
-- store's getMe, which reads pod, account, member, learner and goal. 20261101120000_run.sql granted
-- jadwigo_runner only the run tables, so every step failed with 42501 and dead-lettered.
--
-- SELECT only, and only under the pod_scope policies those tables already force: the runner sets
-- app.pod_id per unit after authorizeRun, so it reads the run's own pod and no other (wave 1 lead
-- decision 7: it owns no table and reads the pod's data pod-scoped). It never writes them. A read a
-- later step needs (dl-z5ja.25) is granted with it.
grant select on pod, account, member, learner, goal to jadwigo_runner;
