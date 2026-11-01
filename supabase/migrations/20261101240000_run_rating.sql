-- A parent's rating of a turn (issue dl-z5ja.110, wave 4 lead decision 37): Good or Bad, with an
-- optional note on Bad. It lives in its own pod-scoped table: never in an analytics event, since a
-- note may hold learner data, and never in run_event, which is the runner's log. One rating per run
-- and account: a re-rate replaces its verdict and note. Each row goes with its run and its pod.
create type run_rating_verdict as enum ('good', 'bad');

create table run_rating (
  id uuid primary key default gen_random_uuid(),
  pod_id uuid not null references pod (id) on delete cascade,
  run_id uuid not null,
  account_id uuid not null references account (id),
  verdict run_rating_verdict not null,
  note text check (note is null or (verdict = 'bad' and note <> '')),
  created_at timestamptz not null default now(),
  foreign key (pod_id, run_id) references run (pod_id, id) on delete cascade,
  unique (pod_id, run_id, account_id)
);

-- A re-rate changes the verdict and the note, nothing else.
create trigger run_rating_change
  before update on run_rating
  for each row execute function app.allow_only('verdict', 'note');

alter table run_rating enable row level security;
alter table run_rating force row level security;
create policy pod_scope on run_rating
  using (pod_id = app.current_pod_id()) with check (pod_id = app.current_pod_id());

-- The API writes a parent's rating; the step consumer never reads or writes one. Nobody deletes.
grant select, insert on run_rating to jadwigo_api;
grant update (verdict, note) on run_rating to jadwigo_api;
