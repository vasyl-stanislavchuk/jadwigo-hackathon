# Error tracking in PostHog

Use this to turn error tracking on, to read an issue, or to turn it off. The errors go to project
331261 on PostHog's EU cloud (decision `dl-9tuku`).

## What reports what

| Surface | What it reports | What leaves |
| --- | --- | --- |
| `site`, `app` (browser) | Uncaught errors and rejections, and a crash the app's boundary caught (`source: error_boundary`) | Type, stack, scrubbed message |
| `api` | A route that failed in a way no refusal names (`route`, `request_id`), and failures it catches and carries on from (`operation`: `mastery_rebuild`, `mcp_tool:<name>`, `jwks_read`, `auth_mail`) | Type, stack, scrubbed message |
| `runner` | A step that threw (`operation: agent_step`, `run_id`), or a host that failed (`operation: host_drain`) | Type, code, stack, no message |
| `print`, `converter` | An unexpected failure (`operation`) | Type, stack, no message |

Not reported, on purpose: a named 4xx refusal, a model's refusal, a poke or a photo delete that has a
safety net, browser notices, and anything from a visitor's browser extension. A browser that said no
sends nothing, and `/playground` never loads PostHog.

CloudWatch and its alarms keep working as they did. PostHog tells you what is failing and how often;
CloudWatch holds the full line.

## Before

- The PRs for `dl-w0b4.148`, `dl-5ssh.158` and `dl-5ssh.160` are on `main`: `git log origin/main --grep dl-5ssh.158`.
- The DPA in `dl-w0b4.12` is signed, and the privacy pages in `dl-w0b4.142` say errors are reported.

## Steps

The owner runs these, from a terminal, on the machine that holds `infra/terraform/owner.auto.tfvars`:
without that file, an apply deletes the alarm subscription.

1. `make -C apps/print push` and `make -C apps/converter push`, on a clean checkout. Each prints a tag.
2. Set the tags as `print_image_tag` and `converter_image_tag` in
   `infra/terraform/environments/prod.tfvars`, in a PR. `make release` ships only `origin/main`, so wait
   for it to merge.
3. Create a personal API key in PostHog for project 331261, able to write error tracking's source maps,
   and `export POSTHOG_CLI_API_KEY=phx_…` in the shell you release from. Never commit it.
4. `make release`. Its preview should show `JW_POSTHOG_KEY` added to 4 Lambdas and the 2 image tags
   change. Type `prod`: it applies that plan and ships each service. Each build prints
   `upload-sourcemaps: … uploaded; N maps deleted`. Without the key it prints `nothing uploaded` and
   goes on, and that build's stacks stay minified.
5. In PostHog, under Error tracking, add an alert on a new issue, sent to the address prod alarms use
   (`dl-5ssh.34.77`). Without it nobody hears about a new error.

## After

1. Open app.jadwigo.pl. In the browser's console, run:
   `setTimeout(() => { throw new Error('test "Ala" lrn_abcdefghijkl a@b.c') })`
2. In project 331261, under Error tracking, the issue shows `test "…" :id :email`, with `surface: app`.
   Its stack names our files, not minified ones. If the name, id or email shows, turn it off (Undo)
   and file an issue with the shape that got through.
3. The alert from step 5 arrives.
4. Answer no on the cookie banner, or open `/playground`, and repeat step 1: nothing arrives.

## Reading an issue

1. **Is it new, and how many?** A burst straight after a release points at that release.
2. **Browser:** open its session replay from the event, to see what the person did. Inputs are masked.
3. **`api`:** search the function's log group for `request_id`.
   `aws logs tail /aws/lambda/jadwigo-api-prod --since 1h --filter-pattern '"<request_id>"'`
4. **`runner`:** `make run-timeline CONV=cnv_…` with the conversation of `run_id` (`run-timeline.md`).
5. **`print`, `converter`:** the type and frame say where. The log line by the same time says which print.
6. **Noise:** something that is real but not worth acting on gets a suppression rule in PostHog, not
   a code change. Something no visitor could ever act on belongs in `isNoise` (`packages/analytics/src/scrub.ts`).

A stale tab after a release shows as `Failed to fetch dynamically imported module`. It lands on the
crash screen, whose button reloads, so a small burst after a release is expected.

## If learner data got through

Scrubbing works on patterns, so a name in an unquoted message written by our own code can pass.

1. Turn it off (Undo), if it can keep happening.
2. Delete the affected events in PostHog.
3. File an issue with the shape, without the data, and add it to `packages/analytics/src/scrub.test.ts`.
4. Change the message that carried it: no learner's data belongs in an error.

## Undo

- **The Lambdas:** set `posthog_key = ""` in `prod.tfvars`, merge it, and `make release`.
- **The browser:** set `capture_exceptions: false` in `packages/analytics/src/options.ts`, then release
  it the same way. What already reached PostHog stays until it is deleted there.
