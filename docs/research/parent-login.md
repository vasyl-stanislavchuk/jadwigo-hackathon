# How does a parent sign in, add a child and keep the attempt the child just played?

Issue: `dl-e8ov.2.35`

## The answer in 5 lines

1. After the results, the page offers "save your progress". The adult signs in with a 6-digit email code from Supabase Auth, in the same tab, so the attempt id in `sessionStorage` survives.
2. The first sign-in makes a pod, an account and a member row in one call (`POST /api/v1/accounts`). Adding a child makes a learner with a first name and, optionally, named goal stubs.
3. The claim is one database call: it sets `attempt.learner_id`, `claimed_by` and `claimed_at` and touches no answer. The attempt stays in Jadwigo's pod, and the learner's pod reads it through row-level security.
4. Only the 5 new parent routes need a token. API Gateway's JWT authorizer guards them in AWS, and every login-free route stays open as it is.
5. Local development and CI need no Supabase. A test RS256 key signs tokens shaped like Supabase's, and the API verifies them against that key's JWKS.

## Method

Read:

- the decisions in force, listed under "Decisions in force";
- `docs/research/core-data-model.md`, mainly "What is deferred";
- `supabase/migrations/20261027120000_core_v0.sql`, `20261027210000_ended_missed.sql` and `supabase/tests/shim.sql`;
- `packages/contracts` (`RULES.md`, `src/routes.ts`, `src/wire.ts`, `src/naming.test.ts`);
- `apps/api/AGENTS.md`, `apps/web/src/play/storedAttempt.ts` and `infra/terraform/modules/app/api.tf`;
- the open owner questions `dl-e8ov.2.8`, `.9`, `.14`, `.16`, `.27`, `.28` and `dl-5ssh.6`.

Not done: no Supabase project was called, no mail was sent and no token was minted against a real project. The migration this note argues for is `dl-e8ov.2.37`; its pgTAP tests are where the claim and the row-level security below are checked.

## Decisions in force

- `david-learns/decisions/2026-10-22-parent-login-aims-to-use-supabase-auth`: Supabase Auth signs the parent in.
- `jadwigo-platform/decisions/2026-10-27-jadwigo-s-supabase-projects-are-recreated-in-frankfurt-and-sign`: both projects sign with RS256, so API Gateway's JWT authorizer can verify the tokens (`docs/runbooks/supabase-projects.md`).
- `jadwigo-platform/decisions/2026-10-27-the-v0-people-records-are-pod-and-learner-account-and-member-com`: account and member arrive with Supabase Auth, keyed to the pod.
- `jadwigo-platform/decisions/2026-10-27-before-supabase-auth-row-level-security-reads-the-caller-s-pod-f`: row-level security reads `app.pod_id` now and the token's claim later.
- `jadwigo-platform/decisions/2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho`: whoever holds the attempt id may read and answer it.
- `david-learns/decisions/2026-10-22-the-login-free-flow-no-identity-no-voice-results-and-a-congratul`: the results come first, then the adult registers this child with suggested goals.
- `david-learns/decisions/2026-10-22-unregistered-anonymous-answers-are-kept-for-3-months`: an unclaimed attempt goes after 3 months. The sweep is `dl-5ssh.3.5`, outside this wave.

## The flow, screen by screen

```text
results ──> save your progress ──> email ──> 6-digit code ──> (first time) add a child ──> parent home
   │               │                                  │                │                       │
   │        "not now" keeps playing           POST /accounts     POST /learners       GET /learners/{id}/attempts
   │                                          (once per user)    POST /attempts/{id}/claims
   └── the tab holds the attempt id in sessionStorage the whole way
```

1. **Results.** As today: the child's list, then the congratulation. Below it, for the adult, one call: "Save {name}'s progress". Nothing on this screen asks the child anything.
2. **Save your progress.** The promise and the consent line sit here, then an email field. The wording is the owner's (`dl-e8ov.2.14`) and a lawyer's (`dl-e8ov.2.9`). Until both land, the web lane uses placeholder copy marked as a draft in `packages/copy`.
3. **Email code.** `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })` sends a 6-digit code, and `verifyOtp({ email, token, type: "email" })` turns it into a session. Typing a code keeps the adult in this tab. A magic link would open a new tab with an empty `sessionStorage`, and the attempt id would be lost, so the mail carries the code and the page never asks the adult to click the link. The OTP length and the site URL are `dl-e8ov.2.40`; the sender is `dl-5ssh.6`.
4. **First sign-in.** The page calls `GET /api/v1/me`. With no account yet it calls `POST /api/v1/accounts` once: one transaction makes the pod, the account (keyed by the token's `sub`) and a member row with role `parent`. A repeat call returns the same records, so a double tap or a reload is safe.
5. **Add a child.** A first name, an optional age group, and up to 5 goal stubs, each a name only. The page may prefill the stubs from the lesson just played (the lesson's title, for example). Goals with skills are a later wave (see the owner's decisions). `POST /api/v1/learners` makes the learner with a handle the server derives, unique in the pod.
6. **Claim.** `POST /api/v1/attempts/{id}/claims` with `{learner_id}`, where the id comes from `sessionStorage`. The page then clears the stored id, so the next lesson starts a new attempt.
7. **Parent home.** `GET /api/v1/me` lists the pod's learners. For each, `GET /api/v1/learners/{id}/attempts` lists their attempts, newest first, with the lesson's title and the full `attempt_result` rows. The full row is the parent's (decision `2026-10-27-the-child-s-after-lesson-list-shows-what-was-asked-how-it-ended`).

A returning parent signs in the same way, and `GET /api/v1/me` finds the account, so steps 4 and 5 are skipped. Claiming another tab's attempt later works the same way, as long as that tab still holds the id.

## The records

The migration is `dl-e8ov.2.37`. The names follow `packages/contracts/RULES.md`.

| Record | Columns | Notes |
| --- | --- | --- |
| `account` | `id`, `pod_id`, `sub`, `created_at` | Someone who signs in. `sub` is the Supabase Auth user, the token's `sub` claim, unique. `pod_id` is the pod the first sign-in made. No email, no name: the token carries them, and `dl-e8ov.2.16` decides what is kept. |
| `member` | `id`, `pod_id`, `account_id`, `role`, `created_at` | One account in one pod. `role` is `parent` or `self`. Unique on (`pod_id`, `account_id`). Which learners a member covers waits on `dl-e8ov.2.28`, so v0 has no cover list and a member sees every learner in its pod. |
| `goal` | `id`, `pod_id`, `learner_id`, `name`, `created_at` | A name stub, nothing more. Skills and stages attach later as new columns or tables. |
| `attempt` | adds `claimed_by`, `claimed_at`, `moved_by`, `moved_at` | `claimed_by` and `moved_by` are account ids. A move between learners is `dl-e8ov.5.11`. This wave adds the columns and its trigger refuses a move until that route exists. |

Wire ids get 3 new prefixes: `acc_`, `mem_` and `gol_`.

### Where a claimed attempt lives

A featured lesson's attempt is in Jadwigo's pod, with the assignment, the version and the questions it played. The child's learner is in the parent's pod. Every row of an attempt (`attempt`, `attempt_question`, `attempt_answer`) carries `pod_id` and points at content in the same pod through composite foreign keys. Moving the attempt into the parent's pod would mean copying the version and its questions, and rewriting answer rows, which rule 11 forbids.

So the attempt stays where it is, and the claim only points it at a learner in another pod:

- The foreign key from `attempt.learner_id` becomes a plain one to `learner (id)`, in place of the composite one on (`pod_id`, `learner_id`). A trigger keeps a named attempt's learner in the attempt's own pod. Only a claim may point across pods.
- Row-level security adds read-only policies:
  - an attempt is readable from a pod that holds its learner;
  - so are its attempt questions and answers;
  - so is the content the attempt points at: its version, that version's lesson and its assignment, and nothing else of the pod. No lesson question is readable, so no answer key: the results read each asked question's face (`say`, `family`, `question_type`) through `app.asked_question()`.
  Writes still need `pod_id` to be the caller's pod, so the parent's pod reads the attempt and can never write to it.
- The parent's API transaction runs with the parent's pod, never with Jadwigo's, so a bug there cannot reach anyone else's anonymous attempts.

This is the lead's design call, and the owner sees it through the migration's PR, which the steward holds as a one-way door. It is also listed below as an owner question, because "where a child's evidence lives" is not something to settle overnight.

### The claim as one transaction

`app.claim_attempt(attempt_id, learner_id, account_id)` is one `security definer` function, so it is one statement and one transaction:

```text
claim(attempt, learner, account), as the caller's pod P:
  learner in P?                 no  -> NotFound (another pod's learner looks unknown)
  account a member of P?        no  -> NotFound
  attempt exists?               no  -> NotFound
  attempt.mode = preview?       yes -> AttemptPreview (409)
  attempt.learner_id set?
     same learner, same account -> return the stored claim (a replay)
     anything else              -> AttemptClaimed (409)
  update attempt set learner_id, claimed_by, claimed_at = now()   -- row lock: 2 parents racing, 1 wins
  attempt_question, attempt_answer: untouched
```

A claim works on a finished attempt as well as an open one: the triggers on `attempt` change so that a finished attempt refuses everything except the claim columns. The 3-month sweep (`dl-5ssh.3.5`) deletes only attempts with no learner, so a claimed attempt is kept.

## Who reads which pod

`app.current_pod_id()`, which every policy calls, reads the pod from the token when it carries one, and falls back to `app.pod_id`:

```sql
coalesce(
  (request.jwt.claims ->> 'pod_id')::uuid,   -- what auth.jwt() reads, set by the API from a verified token
  current_setting('app.pod_id')::uuid        -- set by the API after authorize(), as today
)
```

Supabase's tokens carry no `pod_id` until a custom access token hook adds one, and this wave adds none. So in practice the API resolves the pod from the account's member row (`app.member_pod(sub)`, `security definer`, like `app.attempt_pod`) and sets `app.pod_id`. The claim path in the function is there so a hook can switch it on later without touching a policy.

## Which routes need a token

| Route | Token | Why |
| --- | --- | --- |
| `GET /api/health`, `GET /api/v1/featured-lessons` | no | public |
| `POST /api/v1/assignments/{id}/attempts`, every `/api/v1/attempts/{id}` route of the player | no | login-free play, bound by the attempt id |
| `GET /api/v1/me` | yes | |
| `POST /api/v1/accounts` | yes | |
| `POST /api/v1/learners` | yes | |
| `POST /api/v1/attempts/{id}/claims` | yes | the attempt id and the token together |
| `GET /api/v1/learners/{id}/attempts` | yes | |

Each route in `ROUTES` says which it is (`auth: "none" | "token"`), so `apps/api`, `packages/api-client` and the Terraform route list read the same answer. In AWS, API Gateway's JWT authorizer sits on the 5 token routes only. Its issuer is `https://<ref>.supabase.co/auth/v1` and its audience is `authenticated`. It refuses a bad token with 401 before the Lambda runs, and the handler reads the verified claims from the request context. Everywhere else (local, CI, tests), `apps/api` verifies the token itself against a configured JWKS. That is the only code path in local development, so it is the one the tests cover. Wiring the authorizer is infra work no issue held, filed as `dl-e8ov.2.42`.

A missing or bad token on a token route is 401 `NotSignedIn`, a new error type. Rule 20 in `RULES.md` gains 401.

## Local development with no Supabase

- `packages/testing` holds a fixed RS256 test key pair, with its public half as a JWKS. It is a test key, made for this repo, and never a Supabase key. A helper signs tokens shaped like Supabase's: `iss`, `aud: "authenticated"`, `role: "authenticated"`, `sub` (a uuid), `email` and `exp`.
- `apps/api` reads the JWKS from `AUTH_JWKS_URL` and the issuer a token must carry from `AUTH_ISSUER`, both in `src/config.ts`. The issuer is never inferred from the URL. With `AUTH_JWKS_URL` unset, or set without `AUTH_ISSUER`, every token route is 401, and so is a token when the JWKS cannot be read (`dl-e8ov.2.44`). The tests sign with the test key's JWKS and issuer. In AWS, the authorizer has already verified the token.
- `apps/web` in local and e2e mode skips supabase-js's network call. The Playwright test writes a session holding a token signed by the test key, as supabase-js stores one, so the page behaves as if the code had been typed.
- pgTAP sets `request.jwt.claims` as `shim.sql` expects, which is how `auth.jwt()` is faked today.

## What this means for jadwigo

- Wave 3 of `dl-e8ov.2` builds this flow in 5 lanes. The plan is `dl-e8ov.2.35`'s wave plan in the worklog.
- Contracts first (`dl-e8ov.2.36`), then the migration (`dl-e8ov.2.37`). The api (`dl-e8ov.2.39`) and web (`dl-e8ov.2.38`) lanes build on both.
- New issue `dl-e8ov.2.42`: the JWT authorizer on the 5 token routes, in `infra/terraform/modules/app`.
- The registration issue `dl-e8ov.2.6` is mostly carried out by this wave. Its "suggested goals" stay a name stub until the owner answers the goals question below.

### The owner's questions, with the lead's recommendation

The outcome block lists the options only, as the research check requires. The recommendations live here.

1. **Promise-screen wording and the child's fields (`dl-e8ov.2.14`).** Recommend the Q7 draft plus "I am this child's parent or guardian", with first name and age group only, held as a draft until `dl-e8ov.2.9`'s lawyer review. It asks for the least, and the age group is already a learner column.
2. **Google profile metadata (`dl-e8ov.2.16`).** Recommend trimming: keep nothing from Google in our tables, since the account row holds only `sub`. Clearing Supabase's own `user_metadata` is a small hook later.
3. **When Google sign-in comes (`dl-e8ov.2.8`).** Recommend after this wave. The email code needs no consent-screen review, and Google's verification takes days. The same verified email lands on the same Supabase user either way.
4. **What a member sees across the pod (`dl-e8ov.2.28`).** Recommend every learner in the pod for v0. A pod has one parent today, and a cover list can be added as a table under `member` without changing a route.
5. **How far a CLI token reaches (`dl-e8ov.2.27`).** Recommend one pod, capped by the member row: it is the row-level security boundary already, so a leaked token reaches no further than the policies allow.
6. **Consent wording and a lawyer (`dl-e8ov.2.9`).** Recommend shipping to the classmates pilot only after the lawyer's text. Until then, sign-in works on `jadwigo-dev` and in local development, and prod stays login-free.
7. **Mail sender (`dl-5ssh.6`).** Recommend Supabase's built-in sender for `jadwigo-dev` only. It is rate-limited to a few mails an hour and sends from Supabase's domain. Prod waits for SES, so no parent's first mail comes from a domain that isn't ours.
8. **Goals beyond a name (no issue yet).** Recommend a name stub now, with the stub's name prefilled from the lesson just played. Skills, stages and suggested goal templates come with the learner-knowledge workstream's goal work.
9. **Where a claimed attempt lives (this note).** Recommend keeping it in Jadwigo's pod, readable by the learner's pod, as built in `dl-e8ov.2.37`. Copying it would rewrite evidence.

```json jadwigo-outcome
{
  "issue": "dl-e8ov.2.35",
  "question": "How does a parent sign in, add a child and keep the attempt the child just played?",
  "answer": "With a 6-digit Supabase Auth email code in the same tab; the first sign-in makes pod, account and member, the parent adds a learner with goal stubs, and one database call claims the tab's attempt by setting its learner and claimed_by while it stays in Jadwigo's pod, readable by the learner's pod; only the 5 parent routes need a token.",
  "status": "answered",
  "sources": [
    "https://supabase.com/docs/guides/auth/auth-email-passwordless",
    "https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook",
    "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html",
    "docs/research/core-data-model.md",
    "supabase/migrations/20261027120000_core_v0.sql",
    "david-learns/decisions/2026-10-22-parent-login-aims-to-use-supabase-auth",
    "jadwigo-platform/decisions/2026-10-27-the-v0-people-records-are-pod-and-learner-account-and-member-com",
    "jadwigo-platform/decisions/2026-10-27-before-supabase-auth-row-level-security-reads-the-caller-s-pod-f",
    "jadwigo-platform/decisions/2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho",
    "david-learns/decisions/2026-10-22-the-login-free-flow-no-identity-no-voice-results-and-a-congratul"
  ],
  "owner_decisions": [
    {
      "question": "What exact promise-screen wording (Polish and English) and child fields does registration ask for? (dl-e8ov.2.14)",
      "options": [
        "The Q7 draft plus 'I am this child's parent or guardian', first name and age group only",
        "The owner rewrites the promise or asks for more about the child (birth year, school class)"
      ]
    },
    {
      "question": "Is the Google profile (name, avatar) in Supabase user metadata trimmed or accepted and disclosed? (dl-e8ov.2.16)",
      "options": [
        "Trim: keep nothing from Google in jadwigo's tables and clear the metadata",
        "Accept it and disclose it in the privacy notice"
      ]
    },
    {
      "question": "When does Continue with Google come? (dl-e8ov.2.8)",
      "options": [
        "After this wave, once the consent screen is verified",
        "In this wave, beside the email code"
      ]
    },
    {
      "question": "What does a member see across the pod's learners? (dl-e8ov.2.28)",
      "options": [
        "Every learner in the pod",
        "Only the learners the member row covers",
        "Every learner's goals and mastery, and only covered learners' notes and uploads"
      ]
    },
    {
      "question": "How far does a jw CLI token reach? (dl-e8ov.2.27)",
      "options": [
        "The whole account: every pod the parent belongs to",
        "One pod, capped by the member row",
        "One learner: a token per child"
      ]
    },
    {
      "question": "Does parent login reach prod before the lawyer-reviewed consent text? (dl-e8ov.2.9)",
      "options": [
        "No: prod stays login-free until the lawyer's text is on the promise screen",
        "Yes, with the draft promise, for the owner's own family only"
      ]
    },
    {
      "question": "Which sender mails the sign-in code until SES is set up? (dl-5ssh.6)",
      "options": [
        "Supabase's built-in sender on jadwigo-dev only; prod waits for SES",
        "Supabase's built-in sender on both projects until SES lands",
        "No sign-in anywhere until SES lands"
      ]
    },
    {
      "question": "What does adding a child set up beyond a first name?",
      "options": [
        "Goal stubs with a name only, prefilled from the lesson just played",
        "Suggested goal templates with skills, from the learner-knowledge workstream, before launch",
        "No goals at all in this wave"
      ]
    },
    {
      "question": "Where does a claimed featured-lesson attempt live?",
      "options": [
        "In Jadwigo's pod, readable by the pod that holds its learner (built in dl-e8ov.2.37)",
        "Copied into the parent's pod with the version and questions it played"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "API Gateway JWT authorizer on the 5 parent routes",
      "scope": "infra/terraform/modules/app: an aws_apigatewayv2_authorizer (JWT, issuer https://<ref>.supabase.co/auth/v1, audience authenticated) attached only to the ROUTES entries with auth token; login-free routes unchanged. Plan only; the owner applies.",
      "done_when": "terraform validate passes and make -C infra plan shows the authorizer on exactly the 5 token routes",
      "depends_on": ["dl-e8ov.2.36"],
      "labels": ["lane:infra", "wave:dl-e8ov.2-3", "project:jadwigo-platform", "auth"]
    }
  ],
  "page_changes": [
    {
      "section": "docs/research/core-data-model.md, What is deferred",
      "change": "Account and member, and claim, are built by wave 3 of dl-e8ov.2; a claimed featured attempt stays in Jadwigo's pod"
    }
  ]
}
```
