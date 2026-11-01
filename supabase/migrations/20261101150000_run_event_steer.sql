-- A parent's steer is logged as a run event (epic dl-z5ja, issue dl-z5ja.51; wave 2 Lead decision
-- 21 and lead decision 28, jadwigo-hackathon/notes/2026-11-01-engine-waves-2-and-3-run-in-parallel-on-re-cut-lanes).
-- @jadwigo/contracts/run's RunEvent gained `steer` {text, source: chat | lesson_edit, question_ids?};
-- run_event_type lists the same types, checked by naming.test.ts.
--
-- Only the alter: Postgres refuses a use of a value added in the same transaction, and `make
-- migrate` runs each file as one. The steer's inbox row already has its kind (run_inbox_kind) and
-- keeps its payload as jsonb, so the inbox needs no change.
alter type run_event_type add value 'steer' after 'approval_resolved';
