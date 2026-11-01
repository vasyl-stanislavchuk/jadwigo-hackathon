-- Jadwigo speaks Polish and English only: the `language` type drops `uk` (no Ukrainian,
-- jadwigo-platform decision of 2026-10-26; owner, 2026-11-01, issue dl-9t2o.1), so the type
-- lists what packages/contracts' Language and packages/config's LANGUAGES list. No row uses `uk`;
-- one that did would fail the cast below and stop the migration.
-- Postgres cannot drop a value from an enum, so the type is made again and each column moves over.

alter type language rename to language_with_uk;
create type language as enum ('pl', 'en');

alter table pod alter column language type language using language::text::language;
alter table lesson alter column language type language using language::text::language;
alter table lesson_question_example
  alter column language type language using language::text::language;
alter table curriculum alter column language type language using language::text::language;
alter table learner
  alter column school_language type language using school_language::text::language;
alter table goal alter column lesson_language drop default;
alter table goal
  alter column lesson_language type language using lesson_language::text::language;
alter table goal alter column lesson_language set default 'pl';

drop type language_with_uk;
