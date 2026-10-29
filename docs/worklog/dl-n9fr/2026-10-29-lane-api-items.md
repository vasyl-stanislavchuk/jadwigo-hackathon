# dl-n9fr: wave 5, lane api-items, dl-n9fr.51: the question body route

- **Landed:** code in `a63a751` on `lane/api-items`, and this note in the commit after it; not pushed. `GET /api/v1/questions/{id}` returns one question's body with its key from `questions/khan/<id>.json`.
- **Order in the handler:** the read token first, as the search route checks it, then the id, then the bucket read, then the parse. A caller without the token gets 401 whatever id it sends.
- **Refusals:** 404 "no such question" for an id that fails `^[A-Za-z0-9_-]{1,64}$` or a missing object. 502 for a failed read, a body that is not a `QuestionBody`, or a body naming another id.
- **Bucket name:** `CONTENT_BUCKET`, else the SSM parameter `/jadwigo/bank/content-bucket`, read once per cold start and again after a failed read.
- **Tests:** `apps/api` ends `Tests  138 passed (138)`, and `packages/contracts` ends `Tests  246 passed (246)`.
- **make check:** `Tasks:    29 successful, 29 total`, then `lint:repo` passed with `check-infra-routes`.
- **Snapshots rewritten on purpose:** `vitest -u` wrote 2 new files, `schemas/question-body.json` and `schemas/bank-question-id.json`. No existing snapshot changed.
- **Rule widened:** RULES.md rule 21 now names this route as its second exception to "a response never carries a key".
- **Not done:** the Lambda role's `s3:GetObject` on `questions/khan/*` and `ssm:GetParameter` on the bucket parameter are the infra lane's. Until they land, the deployed route answers 502.

## What landed

| File | Change |
| --- | --- |
| `packages/contracts/src/bank.ts` | `BankQuestionId` and `QuestionBody`: id, source `khan`, `pl` and `en` variants of family, data, key, help and say, `problem_type`, credit, pictures by sha with extension |
| `packages/contracts/src/routes.ts` | `questionBody`, GET `/api/v1/questions/{id}`, status 200, auth `none` because the read token is checked in `apps/api` |
| `packages/contracts/RULES.md` | rule 21's second named exception, citing the david-learns decision on the private body |
| `packages/contracts/src/bank.test.ts` | body parse and strip, refusals, the id cases, the route entry |
| `packages/contracts/schemas/` | `question-body.json` and `bank-question-id.json`, new |
| `apps/api/src/questions.ts` | `questionBody()`, the `BucketDeps` port, `lambdaBucket()` on `S3Client` |
| `apps/api/src/config.ts` | `contentBucket()` and `CONTENT_BUCKET_PARAM` |
| `apps/api/src/app.ts` | `bucket` in `AppDeps` and one `on("questionBody", ...)` line |
| `apps/api/src/index.ts` | `createHandler` takes a 4th argument, the bucket, built once per cold start |
| `apps/api/src/questions.test.ts` | 15 route tests and 5 `lambdaBucket` tests on fakes |
| `apps/api/package.json`, `bun.lock` | `@aws-sdk/client-s3` pinned at `3.1156.0`, like `client-lambda` |
| `infra/terraform/main.tf` | the route key `"GET /api/v1/questions/{id}"` in `routes`, nothing else |

The route tests cover these cases:

- No token and a wrong token are 401, and the bucket is never read.
- A bad id without a token is 401, not 404.
- An invented body with family `enter`, a prompt, an accept key and 1 picture comes back 200, key included.
- A field the schema does not name is dropped.
- A missing object is 404 "no such question".
- An id with a dot segment, a dot, a space, or 65 characters is 404, and no key is built from it.
- A bucket failure is 502, and the reply names nothing of the failure.
- A stored object that is not JSON, not a body, or names another id is 502.
- No bank or no bucket wired is 502.

Every fixture is invented: the id `xfeed0001`, a repeated-hex sha and an `example.org` credit URL. No Khan text is in any fixture.

## Choices the brief left open

- **Params parse only a string.** The route's `params` is `{id: string}`, and the handler checks `BankQuestionId` after the token. Parsing the regex in `params` would make a bad id without a token 404 before the token check.
- **Body id must match.** A stored body whose `id` differs from the key's id is 502, so a misfiled object never reaches a caller.
- **`help` and `say`.** `help` is an unknown-shaped record, as `Help` in the families is an object. `say` is a string, as every other `say` in the contracts is.
- **At least one language.** `QuestionBody` refuses a body with neither `pl` nor `en`.

## Decisions followed

- `jadwigo-question-bank/decisions/2026-10-29-the-bank-repo-stays-separate-and-holds-the-knowledge-base-busine`: the route and its contract are in this repo.
- `jadwigo-question-bank/decisions/2026-10-29-the-content-bucket-is-keyed-by-source-first-khan-then-the-next-l`: the key is `questions/khan/<id>.json`.
- `jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b`: callers reach the body only through `apps/api`.
- david-learns `2026-10-25-a-bank-question-has-a-public-page-and-a-private-body-a-lesson-qu`: the body with its key reaches only a caller with the read token.

## Proposed bead changes

- **New, infra lane:** grant the app Lambda's role `s3:GetObject` on `questions/khan/*` in the content bucket and `ssm:GetParameter` on `/jadwigo/bank/content-bucket`, and set `CONTENT_BUCKET` on the function. Done when the deployed route answers 200 for a real id with the read token.
- **Follow-up already named in dl-n9fr.51:** the CLI's `question_item` switches to this route after the compose lane merges.
- **New, small:** a missing SSM parameter makes every body request retry the read at once. A capped wait like the store's open would cut that to one read per wait.
