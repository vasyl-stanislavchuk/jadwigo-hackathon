-- The language type is Polish and English, with no `uk` (migration 20261101130000_language_pl_en.sql,
-- issue dl-9t2o.1), and every column that holds a language uses it.
begin;
select plan(8);

select enum_has_labels('public', 'language', array['pl', 'en'], 'language is pl and en, in that order');
select hasnt_type('public', 'language_with_uk', 'the old type is gone');

select col_type_is('public', 'pod', 'language', 'language', 'pod.language is a language');
select col_type_is('public', 'lesson', 'language', 'language', 'lesson.language is a language');
select col_type_is('public', 'lesson_question_example', 'language', 'language',
  'lesson_question_example.language is a language');
select col_type_is('public', 'curriculum', 'language', 'language', 'curriculum.language is a language');
select col_type_is('public', 'learner', 'school_language', 'language',
  'learner.school_language is a language');
select col_default_is('public', 'goal', 'lesson_language', 'pl'::language,
  'a goal''s lessons are in Polish unless it says otherwise');

select * from finish();
rollback;
