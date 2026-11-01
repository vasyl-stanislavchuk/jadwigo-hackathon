-- An inbox event_id is unique within its pod, not across pods (issue dl-z5ja.86, from #460's
-- review). With event_id the primary key, a pod reusing an id another pod holds was refused
-- WriteOnce, so it learned that the id exists elsewhere (never its content). Now each pod has its
-- own ids: the same event_id in 2 pods is 2 rows, and within a pod it is still written once.
alter table run_inbox drop constraint run_inbox_pkey;
alter table run_inbox add primary key (pod_id, event_id);
