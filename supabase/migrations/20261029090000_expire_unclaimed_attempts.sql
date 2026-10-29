-- An attempt nobody claimed is deleted 3 months after it started, with its questions and answers
-- (issue dl-5ssh.3.5, decision david-learns/decisions/2026-10-22-unregistered-anonymous-answers-are-kept-for-3-months).
--
-- Evidence is otherwise never deleted: the delete triggers below still refuse every row except
-- those of an attempt with no learner that started more than 3 months ago. jadwigo_api holds no
-- DELETE on these tables either way. The sweep is app.expire_unclaimed_attempts(), run daily by
-- pg_cron as the migrating role (postgres on Supabase, which reads past row-level security, as
-- app.attempt_pod() does). Where pg_cron is not available (plain Postgres locally and in CI) the
-- migration schedules nothing, and the pgTAP test calls the function the job runs.

create function app.attempt_expired(attempt_id uuid) returns boolean
language sql stable
as $$
  select exists (
    select from attempt as t
    where t.id = attempt_id and t.learner_id is null and t.started_at < now() - interval '3 months'
  )
$$;

-- Refuses a delete, unless the row belongs to an expired unclaimed attempt.
create function app.refuse_delete_unless_expired() returns trigger
language plpgsql
as $$
begin
  if app.attempt_expired((to_jsonb(old) ->> case when tg_table_name = 'attempt' then 'id' else 'attempt_id' end)::uuid) then
    return old;
  end if;
  raise exception '% rows are never deleted, except an unclaimed attempt''s after 3 months '
    '(packages/contracts/RULES.md rules 10 and 11)', tg_table_name
    using errcode = 'restrict_violation';
end
$$;

drop trigger attempt_answer_append_only on attempt_answer;
create trigger attempt_answer_append_only
  before update on attempt_answer
  for each row execute function app.refuse_change();
create trigger attempt_answer_no_delete
  before delete on attempt_answer
  for each row execute function app.refuse_delete_unless_expired();

drop trigger attempt_question_no_delete on attempt_question;
create trigger attempt_question_no_delete
  before delete on attempt_question
  for each row execute function app.refuse_delete_unless_expired();

drop trigger attempt_no_delete on attempt;
create trigger attempt_no_delete
  before delete on attempt
  for each row execute function app.refuse_delete_unless_expired();

-- Deletes every expired unclaimed attempt, answers first, and returns how many attempts went.
create function app.expire_unclaimed_attempts() returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  expired uuid[];
begin
  select coalesce(array_agg(id), '{}') into expired
  from attempt
  where learner_id is null and started_at < now() - interval '3 months';
  delete from attempt_answer where attempt_id = any (expired);
  delete from attempt_question where attempt_id = any (expired);
  delete from attempt where id = any (expired);
  return cardinality(expired);
end
$$;

-- New functions are executable by PUBLIC, and app's default privileges grant them to jadwigo_api:
-- the sweep is neither's.
revoke execute on function app.expire_unclaimed_attempts() from public, jadwigo_api;

do $$
begin
  if exists (select from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'expire-unclaimed-attempts', '17 3 * * *', 'select app.expire_unclaimed_attempts()'
    );
  else
    raise notice 'pg_cron is not available here: expire-unclaimed-attempts is not scheduled';
  end if;
end
$$;
