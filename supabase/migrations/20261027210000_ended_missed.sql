-- A question can end `missed`, and only while verdicts are held (issue dl-e8ov.2.32.18, decision
-- jadwigo-platform/decisions/2026-10-27-while-an-assignment-holds-verdicts-every-question-gets-one-try-a).
--
--                    the assignment's hold_verdicts
--                    off (practice)                  on, attempt not finished (a check)
-- right try          correct                         correct
-- wrong try          stays open: retry, help ladder  missed: no retry, no help after it
-- Not sure yet,
-- or help rung 4     skipped (and its twin)          skipped (and its twin)
--
-- With verdicts held, a 2nd try would tell the child the 1st was wrong, so a wrong try ends the
-- question. Deciding that is the API's (it owns the course); this rule only keeps `missed` from
-- meaning anything else: a held attempt, and a question with a wrong try and no right one.

alter type ended add value 'missed';

create function app.attempt_question_missed_only_when_held() returns trigger
language plpgsql
as $$
begin
  if new.ended is distinct from 'missed' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.ended is not distinct from new.ended then
    return new;
  end if;
  if not exists (
    select from attempt as t
    join assignment as s on s.pod_id = t.pod_id and s.id = t.assignment_id
    where t.pod_id = new.pod_id and t.id = new.attempt_id and s.hold_verdicts
  ) then
    raise exception 'a question ends missed only while its assignment holds verdicts'
      using errcode = 'restrict_violation';
  end if;
  if not exists (
    select from attempt_answer as a
    where a.pod_id = new.pod_id and a.attempt_id = new.attempt_id and a.seq = new.seq
      and a.kind = 'try' and a.correct = false
  ) or exists (
    select from attempt_answer as a
    where a.pod_id = new.pod_id and a.attempt_id = new.attempt_id and a.seq = new.seq
      and a.kind = 'try' and a.correct
  ) then
    raise exception 'a question ends missed only after a wrong try and no right one'
      using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;

create trigger attempt_question_missed
  before insert or update of ended on attempt_question
  for each row execute function app.attempt_question_missed_only_when_held();
