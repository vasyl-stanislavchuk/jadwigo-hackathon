-- Two pods with the same shape of content and one played attempt each, for the pgTAP tests.
-- Included with \ir inside each test's transaction, as the migration's owner (a superuser locally
-- and in CI), so it writes past row-level security. Made-up content, no learner data.

insert into pod (id, name, language) values
  ('00000000-0000-4000-8000-00000000000a', 'Pod A', 'pl'),
  ('00000000-0000-4000-8000-00000000000b', 'Pod B', 'en');

insert into learner (id, pod_id, handle, first_name) values
  ('00000000-0000-4000-8000-0000000001a1', '00000000-0000-4000-8000-00000000000a', 'fox', 'Fox'),
  ('00000000-0000-4000-8000-0000000001b1', '00000000-0000-4000-8000-00000000000b', 'owl', 'Owl');

insert into lesson (id, pod_id, title, language, category, subject, grade, skill_ids) values
  ('00000000-0000-4000-8000-0000000002a1', '00000000-0000-4000-8000-00000000000a',
   'Equal groups', 'pl', 'child', 'math', 2, '{math.mul.equal-groups}'),
  ('00000000-0000-4000-8000-0000000002b1', '00000000-0000-4000-8000-00000000000b',
   'Equal groups', 'en', 'child', 'math', 2, '{math.mul.equal-groups}');

-- Pod A: 2 planned questions and the twin of the first as a spare.
insert into lesson_question
  (id, pod_id, family, question_type, say, data, key, help, subject, skill_ids, twin_of, content_hash)
values
  ('00000000-0000-4000-8000-0000000003a1', '00000000-0000-4000-8000-00000000000a',
   'enter', 'production', 'How many apples?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["6"]}', '{"look": {"text": "Count the groups."}}', 'math',
   '{math.mul.equal-groups}', null, 'h1'),
  ('00000000-0000-4000-8000-0000000003a2', '00000000-0000-4000-8000-00000000000a',
   'choose', 'recognition', 'Which picture shows 3 groups of 2?',
   '{"options": [{"id": "a", "content": {"kind": "text", "text": "3 x 2"}}], "select": "one", "layout": "list"}',
   '{"correct": ["a"]}', '{}', 'math', '{math.mul.equal-groups}', null, 'h2'),
  ('00000000-0000-4000-8000-0000000003a3', '00000000-0000-4000-8000-00000000000a',
   'enter', 'production', 'How many pears?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["8"]}', '{}', 'math', '{math.mul.equal-groups}',
   '00000000-0000-4000-8000-0000000003a1', 'h3'),
  ('00000000-0000-4000-8000-0000000003b1', '00000000-0000-4000-8000-00000000000b',
   'enter', 'production', 'How many plums?', '{"input": "number", "entry": "keypad"}',
   '{"accept": ["4"]}', '{}', 'math', '{math.mul.equal-groups}', null, 'h4');

-- One playground example in each pod, on its first question (pod A's with the twin).
insert into lesson_question_example
  (id, pod_id, lesson_question_id, twin, language, slug, position, label, showcase, scenarios)
values
  ('00000000-0000-4000-8000-000000000ea1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a1', '00000000-0000-4000-8000-0000000003a3', 'en', 'apples', 1, 'Apples in groups', true,
   '[{"try": "types 6", "value": {"entered": "6"}, "outcome": "correct", "mistake_class": null, "marks": []}]'),
  ('00000000-0000-4000-8000-000000000eb1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b1', null, 'en', 'plums', 1, 'Plums in groups', true,
   '[{"try": "types 4", "value": {"entered": "4"}, "outcome": "correct", "mistake_class": null, "marks": []}]');

-- Each version is written as a draft, listed, then published.
insert into lesson_version (id, pod_id, lesson_id, version) values
  ('00000000-0000-4000-8000-0000000004a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002a1', 1),
  ('00000000-0000-4000-8000-0000000004b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b1', 1);

insert into lesson_version_question (lesson_version_id, position, pod_id, lesson_question_id, role) values
  ('00000000-0000-4000-8000-0000000004a1', 1, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a1', 'planned'),
  ('00000000-0000-4000-8000-0000000004a1', 2, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a2', 'planned'),
  ('00000000-0000-4000-8000-0000000004a1', 3, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a3', 'spare'),
  ('00000000-0000-4000-8000-0000000004b1', 1, '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b1', 'planned');

update lesson_version set published_at = '2026-10-27T08:00:00Z'
  where id in ('00000000-0000-4000-8000-0000000004a1', '00000000-0000-4000-8000-0000000004b1');

insert into assignment (id, pod_id, lesson_id, audience, identity, after_not_sure) values
  ('00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000002a1', 'anyone', 'none', 'twin_now'),
  ('00000000-0000-4000-8000-0000000005b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000002b1', 'anyone', 'none', 'next');

insert into attempt (id, pod_id, assignment_id, lesson_version_id, learner_id) values
  ('00000000-0000-4000-8000-0000000006a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000005a1', '00000000-0000-4000-8000-0000000004a1',
   '00000000-0000-4000-8000-0000000001a1'),
  ('00000000-0000-4000-8000-0000000006b1', '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000005b1', '00000000-0000-4000-8000-0000000004b1', null);

-- Pod A's attempt: seq 1 missed, then Not sure yet; its twin asked now at seq 2 and answered
-- correctly; then the 2nd planned question at seq 3, correct on the first try.
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added, placed, added_for) values
  ('00000000-0000-4000-8000-0000000006a1', 1, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a1', 'planned', null, null);

insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, skip_reason, latency_ms, help_used,
   asked_at, answered_at, correct, mistake_class, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007a1', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000006a1', 1, 1, 'try', '{"entered": "5"}', null, 4000, 0,
   '2026-10-27T09:00:00Z', '2026-10-27T09:00:04Z', false, 'value_off', 'enter@1', 'b1'),
  ('00000000-0000-4000-8000-0000000007a2', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000006a1', 1, 2, 'skip', null, 'dont_know', 2000, 1,
   '2026-10-27T09:00:04Z', '2026-10-27T09:00:06Z', null, null, null, 'b2');

update attempt_question set help_released = 1
  where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 1;
update attempt_question set ended = 'skipped'
  where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 1;

insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added, placed, added_for) values
  ('00000000-0000-4000-8000-0000000006a1', 2, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a3', 'twin', 'now', 1);

insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007a3', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000006a1', 2, 1, 'try', '{"entered": "8"}', 3000,
   '2026-10-27T09:00:07Z', '2026-10-27T09:00:10Z', true, 'enter@1', 'b3');

update attempt_question set ended = 'correct'
  where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 2;

insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006a1', 3, '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000003a2', 'planned');

insert into attempt_answer
  (event_id, pod_id, attempt_id, seq, try_no, kind, value, latency_ms, asked_at, answered_at,
   correct, judged_by, body_hash)
values
  ('00000000-0000-4000-8000-0000000007a4', '00000000-0000-4000-8000-00000000000a',
   '00000000-0000-4000-8000-0000000006a1', 3, 1, 'try', '{"chosen": ["a"]}', 1500,
   '2026-10-27T09:00:11Z', '2026-10-27T09:00:12Z', true, 'choose@1', 'b4');

update attempt_question set ended = 'correct'
  where attempt_id = '00000000-0000-4000-8000-0000000006a1' and seq = 3;

-- Pod B's attempt: one question, open.
insert into attempt_question (attempt_id, seq, pod_id, lesson_question_id, added) values
  ('00000000-0000-4000-8000-0000000006b1', 1, '00000000-0000-4000-8000-00000000000b',
   '00000000-0000-4000-8000-0000000003b1', 'planned');
