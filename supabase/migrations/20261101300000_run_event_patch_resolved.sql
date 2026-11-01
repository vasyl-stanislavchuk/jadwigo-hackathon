-- What became of a parent's patch is logged as its own run event (issue dl-z5ja.135, wave 4 lead
-- decision 49, for dl-z5ja.130): patch_resolved {steer_event_id, applied, revision?, reason?:
-- stale_base | invalid_file | no_lesson}. @jadwigo/contracts/run's RunEvent gained it after steer,
-- and run_event_type lists the same types in the same order (packages/store's types tests).
--
-- Only the alter: Postgres refuses a use of a value added in the same transaction, and `make
-- migrate` runs each file as one. The broadcast trigger and row-level security cover every type.
alter type run_event_type add value 'patch_resolved' after 'steer';
