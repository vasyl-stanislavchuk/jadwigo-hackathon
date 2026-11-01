-- A parent's delete archives a conversation (issue dl-z5ja.104, decision dl-84wo): it is hidden
-- from the list, kept for the pod, and deleted only with the pod (the on delete cascade from pod).
-- archived_at is when it was archived, null while it is live; archiving again keeps the first time.
alter table conversation
  add column archived_at timestamptz;

-- A conversation was written once (conversation_write_once). Now archived_at alone may change,
-- and only from null: an archive is kept, never moved or undone (no restore is built).
drop trigger conversation_write_once on conversation;
create trigger conversation_change
  before update on conversation
  for each row execute function app.allow_only('archived_at');

create function app.archive_once() returns trigger
language plpgsql
as $$
begin
  if old.archived_at is not null and new.archived_at is distinct from old.archived_at then
    raise exception 'an archived conversation stays archived'
      using errcode = 'restrict_violation';
  end if;
  return new;
end
$$;
revoke all on function app.archive_once() from public;

create trigger conversation_archive_once
  before update of archived_at on conversation
  for each row execute function app.archive_once();

-- The API archives, on its own pod only (the pod_scope policy), and changes nothing else of a
-- conversation. The step consumer never archives.
grant update (archived_at) on conversation to jadwigo_api;

-- The list: a pod's live conversations, newest first.
create index conversation_live on conversation (pod_id, created_at desc, id desc)
  where archived_at is null;
