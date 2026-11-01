-- A pod's consent to the AI (issue dl-z5ja.112, wave 4 lead decision 39). A parent gives it once
-- for the pod, and may withdraw it: ai_consent_at is when it was given, null before or after a
-- withdrawal. The conversation routes refuse while it is null, so no client can skip it. What the
-- consent screen states is decision dl-uafq.
alter table pod
  add column ai_consent_at timestamptz;

-- The API sets and clears it, on its own pod only (the pod_scope policy), and changes nothing else
-- of a pod.
grant update (ai_consent_at) on pod to jadwigo_api;
