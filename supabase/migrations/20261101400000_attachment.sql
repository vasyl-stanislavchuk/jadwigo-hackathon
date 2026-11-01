-- A photo a parent attaches to a message (homework epic dl-z5ja.11, issue dl-e8ov.2.22; wave 5
-- decision 43, docs/worklog/dl-z5ja/2026-11-01-wave-5.md). Scoped to the pod, not to a learner or
-- a conversation: a photo may be for no learner ("Bez dziecka") and is uploaded before the first
-- message makes the conversation. The bytes are in the uploads bucket, never here. Columns are
-- @jadwigo/contracts/run's Attachment, checked by naming.test.ts.
--
--   POST /api/v1/attachments       a pending row, expires_at a day out; the browser posts to
--                                  pending/<pod>/<id> in S3
--   postMessage's check and copy   pending -> attached: conversation_id, storage_path
--                                  (pods/<pod>/attachments/<id>.jpg) and attached_at set,
--                                  expires_at cleared, in the message's transaction
--   app.expire_pending_attachments the daily pg_cron sweep deletes pending rows past expires_at;
--                                  S3's lifecycle rule deletes their bytes
--
-- A row holds a child's homework by reference: it goes with its pod. Deleting one conversation
-- waits on dl-z5ja.34, as run.sql's records do.
create type attachment_state as enum ('pending', 'attached');
-- JPEG only in wave 5 (decision 49: the page re-encodes every photo). PDF and DOCX add a value.
create type attachment_media_type as enum ('image/jpeg');

create table attachment (
  id uuid primary key,
  pod_id uuid not null references pod (id) on delete cascade,
  account_id uuid not null references account (id),
  event_id uuid not null,
  state attachment_state not null default 'pending',
  media_type attachment_media_type not null,
  bytes integer not null check (bytes >= 1),
  width integer not null check (width >= 1),
  height integer not null check (height >= 1),
  conversation_id uuid,
  storage_path text check (storage_path <> ''),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  attached_at timestamptz,
  unique (pod_id, event_id),
  foreign key (pod_id, conversation_id) references conversation (pod_id, id),
  -- A pending row expires and is no message's yet; an attached one is a message's for good.
  check (
    (state = 'pending' and expires_at is not null and conversation_id is null
      and storage_path is null and attached_at is null)
    or (state = 'attached' and expires_at is null and conversation_id is not null
      and storage_path is not null and attached_at is not null)
  )
);

-- The daily cap's count (LIMITS.attachmentsPerPodPerDay) and the sweep's read.
create index attachment_pod_created on attachment (pod_id, created_at);
create index attachment_pending on attachment (expires_at) where state = 'pending';

-- Attaching is the only change: a pending row becomes attached, once. Its identity, what was
-- declared and created_at never change, and an attached row never changes again.
create function app.attachment_attach_once() returns trigger
language plpgsql
as $$
begin
  if old.state = 'pending' and new.state = 'attached' then
    return new;
  end if;
  raise exception 'an attachment changes only from pending to attached, once'
    using errcode = 'restrict_violation';
end
$$;

create trigger attachment_change
  before update on attachment
  for each row execute function app.allow_only(
    'state', 'conversation_id', 'storage_path', 'expires_at', 'attached_at'
  );

create trigger attachment_attach_once
  before update on attachment
  for each row execute function app.attachment_attach_once();

-- Row-level security, as run.sql's loop sets it on the engine's tables.
do $$
declare
  t text;
begin
  foreach t in array array['attachment'] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy pod_scope on %I using (pod_id = app.current_pod_id()) '
      'with check (pod_id = app.current_pod_id())', t
    );
  end loop;
end
$$;

-- The API creates a pending row and attaches it. The step consumer reads a photo's storage_path
-- from the message event, never this table. Nobody deletes but the sweep and the pod's delete.
grant select, insert on attachment to jadwigo_api;
grant update (state, conversation_id, storage_path, expires_at, attached_at) on attachment
  to jadwigo_api;

-- Deletes every pending attachment past its expires_at, in any pod, and returns how many went.
-- Run daily by pg_cron as the migrating role, which reads past row-level security, as
-- app.expire_unclaimed_attempts() is. An attached row is never the sweep's.
create function app.expire_pending_attachments() returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  gone integer;
begin
  delete from attachment where state = 'pending' and expires_at < now();
  get diagnostics gone = row_count;
  return gone;
end
$$;

-- New functions are executable by PUBLIC, and app's default privileges grant them to jadwigo_api:
-- the trigger function is the trigger's, and the sweep is neither role's.
revoke execute on function app.attachment_attach_once(), app.expire_pending_attachments()
  from public, jadwigo_api;

do $$
begin
  if exists (select from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule(
      'expire-pending-attachments', '41 3 * * *', 'select app.expire_pending_attachments()'
    );
  else
    raise notice 'pg_cron is not available here: expire-pending-attachments is not scheduled';
  end if;
end
$$;
