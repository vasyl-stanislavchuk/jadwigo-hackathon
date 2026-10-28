-- An answer is written only while its attempt question is open (issue dl-e8ov.2.32.19, from the
-- steward's review of PR #52). Both stores refuse it first, with QuestionNotOpen, under a row lock
-- on the attempt question; this closes it in the database too, so no path writes a try after a
-- question ended correct, skipped or missed.
--
-- The refusal names its own constraint, attempt_answer_question_open, so packages/store can map it
-- to QuestionNotOpen rather than the BadRequest every other restrict_violation becomes.

create function app.attempt_answer_question_open() returns trigger
language plpgsql
as $$
begin
  if exists (
    select from attempt_question as q
    where q.pod_id = new.pod_id and q.attempt_id = new.attempt_id and q.seq = new.seq
      and q.ended is not null
  ) then
    raise exception 'attempt question % of attempt % has ended', new.seq, new.attempt_id
      using errcode = 'restrict_violation', constraint = 'attempt_answer_question_open';
  end if;
  return null;
end
$$;

-- After the insert, so the row's own checks (a unique try, answered after asked) refuse first and
-- keep their own errors.
create trigger attempt_answer_question_open
  after insert on attempt_answer
  for each row execute function app.attempt_answer_question_open();
