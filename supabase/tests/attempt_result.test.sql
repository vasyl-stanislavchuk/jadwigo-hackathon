-- The after-lesson list: one row per attempt question, in seq order.
begin;
select plan(2);
\ir _fixture.sql

select results_eq(
  $$select seq, added::text, placed::text, added_for, tries, first_try_correct, correct,
           mistake_classes, help_used, skip_reason::text, time_ms, ended::text
    from attempt_result where attempt_id = '00000000-0000-4000-8000-0000000006a1' order by seq$$,
  $$values (1, 'planned', null::text, null::integer, 1, false, false, '{value_off}'::text[], 1, 'dont_know', 6000, 'skipped'),
           (2, 'twin', 'now', 1, 1, true, true, '{}'::text[], 0, null, 3000, 'correct'),
           (3, 'planned', null, null, 1, true, true, '{}'::text[], 0, null, 1500, 'correct')$$,
  'a miss then Not sure yet, its twin asked now, then a first-try correct'
);
select is(
  (select reloptions from pg_class where relname = 'attempt_result'),
  '{security_invoker=true}'::text[],
  'attempt_result runs with the caller''s row-level security'
);

select * from finish();
rollback;
