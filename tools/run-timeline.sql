-- `make run-timeline` (dl-hin8.37): one conversation's runs, read-only, for :conv, a uuid. The steps
-- are docs/runbooks/run-timeline.md. It prints metadata and a refusal's reason only: never a
-- message's text, a tool's values, a lesson file or the model's words, so no child's name or answer
-- reaches whoever reads it. tools/src/run-timeline.test.ts holds that line. A refusal's message can
-- quote a lesson line, so it is cut.
\pset pager off
\pset footer off
begin read only;

\echo == runs
select id as run_id, status, attempt, resumes,
       to_char(created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as created_utc,
       to_char(completed_at at time zone 'UTC', 'HH24:MI:SS') as completed,
       round(extract(epoch from completed_at - created_at)) as secs,
       round(spent_usd::numeric, 4) as spent, cap_usd as cap
from run where conversation_id = :'conv'::uuid order by created_at;

\echo == inbox (kinds only)
select left(i.run_id::text, 8) as run, i.kind, i.status,
       to_char(i.created_at at time zone 'UTC', 'HH24:MI:SS') as at
from run_inbox i join run r on r.id = i.run_id
where r.conversation_id = :'conv'::uuid order by i.created_at;

\echo == events per run and type
select left(e.run_id::text, 8) as run, e.type, count(*)
from run_event e join run r on r.id = e.run_id
where r.conversation_id = :'conv'::uuid group by 1, 2 order by 1, 2;

\echo == model calls per run
select left(e.run_id::text, 8) as run, count(*) as calls,
       sum((e.payload->'usage'->>'input_tokens')::int) as input_tok,
       sum((e.payload->'usage'->>'cached_tokens')::int) as cached_tok,
       sum((e.payload->'usage'->>'output_tokens')::int) as output_tok,
       round(sum((e.payload->>'cost_usd')::numeric), 4) as cost,
       string_agg(distinct e.payload->>'model', ',') as models
from run_event e join run r on r.id = e.run_id
where r.conversation_id = :'conv'::uuid and e.type = 'model_response' group by 1 order by 1;

\echo == tool results per verb
select left(e.run_id::text, 8) as run, e.payload->>'verb' as verb,
       count(*) filter (where jsonb_typeof(e.payload->'error') is distinct from 'object') as ok,
       count(*) filter (where jsonb_typeof(e.payload->'error') = 'object') as refused
from run_event e join run r on r.id = e.run_id
where r.conversation_id = :'conv'::uuid and e.type = 'tool_result' group by 1, 2 order by 1, 2;

\echo == refused calls: key paths sent, and the values of family, input and entry
with recursive refused as (
  select res.run_id, res.seq, call.payload->>'verb' as verb,
         res.payload->'error'->>'type' as error, call.payload->'input' as input
  from run_event res
  join run r on r.id = res.run_id
  join run_event call on call.run_id = res.run_id and call.type = 'tool_call'
    and call.payload->>'call_id' = res.payload->>'call_id'
  where r.conversation_id = :'conv'::uuid and res.type = 'tool_result'
    and jsonb_typeof(res.payload->'error') = 'object'
), walked as (
  select f.run_id, f.seq, f.verb, f.error, k.key as path, k.key as name, k.value
  from refused f, jsonb_each(case when jsonb_typeof(f.input) = 'object' then f.input else '{}' end) k
  union all
  select w.run_id, w.seq, w.verb, w.error, w.path || '.' || k.key, k.key, k.value
  from walked w, jsonb_each(case when jsonb_typeof(w.value) = 'object' then w.value else '{}' end) k
)
select left(run_id::text, 8) as run, seq, verb, error,
       string_agg(
         case when name in ('family', 'input', 'entry') and jsonb_typeof(value) = 'string'
           then path || '=' || left(value #>> '{}', 40) else path end,
         ' ' order by path
       ) as sent
from walked
where jsonb_typeof(value) <> 'object'
group by run_id, seq, verb, error
order by run_id, seq;

\echo == timeline (UTC)
\pset format unaligned
\pset fieldsep ' | '
select left(e.run_id::text, 8) as run, e.seq,
       to_char(e.created_at at time zone 'UTC', 'HH24:MI:SS.MS') as at,
       round(extract(epoch from e.created_at - lag(e.created_at) over (partition by e.run_id order by e.seq))::numeric, 2) as gap_s,
       e.type,
       case e.type
         when 'model_response' then
           'call ' || (e.payload->>'call_no') || ' ' || (e.payload->>'model') ||
           ' verbs=' || coalesce((select string_agg(t->>'verb', ',') from jsonb_array_elements(e.payload->'tool_calls') t), '-') ||
           ' in=' || (e.payload->'usage'->>'input_tokens') ||
           ' cached=' || (e.payload->'usage'->>'cached_tokens') ||
           ' out=' || (e.payload->'usage'->>'output_tokens') ||
           ' $' || (e.payload->>'cost_usd')
         when 'message' then e.payload->>'from'
         when 'tool_call' then (e.payload->>'verb') || coalesce(' ' || (e.payload->'input'->>'step_id'), '')
         when 'tool_result' then
           (e.payload->>'verb') || case when jsonb_typeof(e.payload->'error') = 'object'
             then ' REFUSED ' || (e.payload->'error'->>'type') || ': ' || left(e.payload->'error'->>'message', 300)
             else ' ok' end
         when 'lesson_revision' then 'revision ' || (e.payload->>'revision')
         when 'approval_request' then e.payload->>'verb'
         when 'plan' then jsonb_array_length(e.payload->'entries') || ' entries'
         when 'status' then e.payload->>'status'
         when 'usage' then (e.payload->>'spent_usd') || ' of ' || (e.payload->>'cap_usd')
         when 'budget_steer' then (e.payload->>'level') || ' ' || (e.payload->>'spent_usd') || ' of ' || (e.payload->>'cap_usd')
         when 'steer' then e.payload->>'source'
         when 'error' then (e.payload->'error'->>'type') || ' attempt=' || (e.payload->>'attempt') ||
           ' retryable=' || (e.payload->>'retryable') || ': ' || left(e.payload->'error'->>'message', 300)
         else ''
       end as detail
from run_event e join run r on r.id = e.run_id
where r.conversation_id = :'conv'::uuid
order by r.created_at, e.seq;

rollback;
