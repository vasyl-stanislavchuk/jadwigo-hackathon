# Why a lesson took so long: `make run-timeline`

Use this when a lesson's prep was slow or the chat shows "Ten krok się nie udał". The conversation id
is in the lesson's URL: `app.jadwigo.pl/parent/lessons/cnv_…`.

```sh
make run-timeline CONV=cnv_…             # the local database
make run-timeline CONV=cnv_… ENV=dev     # jadwigo-dev
make run-timeline CONV=cnv_… ENV=prod    # the owner's: type it with ! in Claude Code
```

The guard refuses `ENV=prod` to a session, because the query reads every pod's run records past
row-level security. Nothing here writes: it is one read-only transaction, rolled back.

## What it prints

| Section | It answers |
| --- | --- |
| runs | status, seconds, spend against the cap |
| inbox | what arrived and when, kinds only |
| events per run and type | how much happened |
| model calls per run | calls, tokens, cost, model |
| tool results per verb | which verbs were refused, and how often |
| refused calls | the key paths each refused call sent, and its `family`, `input` and `entry` values |
| timeline | every event in order, with the seconds since the last one |

It never prints a message's text, a tool's other values or output, a lesson file or the model's
words. A refusal's reason is cut to 300 characters, because it can quote a lesson line.
`tools/src/run-timeline.test.ts` fails if the query reads anything else.

## How to read the timeline

- **A `gap_s` before `model_response`** is the model's time, and any wait before the step started.
- **A `gap_s` before `tool_result`** is the tool's time.
- **A gap much longer than its neighbours** before a `model_response` is the step waiting for a
  drain. Compare it with the drain lines below.
- **`REFUSED`** is a verb's refusal. The model reads it and goes on, so the run can still pass. The
  chat's generic failure line appears only for a refusal nothing recovered.

## When the idle alarm fires

The `step-wait` alarm mails when a ready step waited 10 s or more for a runner (`max_wait_s` on the
drain line). The usual causes are a lost wake-up, all 5 runner slots busy, or a run past the drain's
time limit. Look for a drain line with a high `max_wait_s`, and check the function's concurrency: if
every slot is busy, raise `reserved_concurrency` in `infra/terraform/modules/runner`, within the
pooler's limit.

## The drain lines in CloudWatch

Each runner invocation logs one JSON line with ids, counts and outcomes, and never a message or a
name. Reading it needs no database:

```sh
aws --profile jadwigo --region eu-central-1 logs filter-log-events \
  --log-group-name /aws/lambda/jadwigo-runner-prod \
  --start-time $(( ($(date +%s) - 86400) * 1000 )) \
  --filter-pattern '{ $.steps > 0 }' --query 'events[].message' --output text
```

Bank search is `/aws/lambda/jadwigo-bank-search`, the document converter
`/aws/lambda/jadwigo-converter-prod`, and the API `/aws/lambda/jadwigo-api-prod`.
