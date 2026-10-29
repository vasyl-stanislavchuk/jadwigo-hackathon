# infra

Terraform for jadwigo: one root module in `terraform/`, read through `terraform/environments/<env>.tfvars`
and `<env>.backend.hcl`, prod only. Decision: `jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module`.

What it holds today: the marketing site's edge for jadwigo.pl (`terraform/modules/site`, `dl-w0b4.24`): the
certificate, the private bucket, CloudFront with `edge.js` (www to the apex, page paths to their `index.html`)
and the alias records. The docs at docs.jadwigo.pl (`module "docs"`, `dl-5ssh.90.11`) are the same module
with `zone_name = jadwigo.pl` and `include_www = false`: no www name, and its records in the apex's zone; the
defaults leave the marketing site as it was. And the service at app.jadwigo.pl (`terraform/modules/app`, `dl-5ssh.3.3`): its own
certificate, a private bucket for `apps/web` with `spa.js` (a path with no extension reads `index.html`, so
`/play/<id>` and `/playground` load the app), `/api/*` uncached to an HTTP API on the same origin, the one
Lambda (Node 24, arm64, `index.handler`), its role, 90-day log groups, the SSM SecureString with
`DATABASE_URL`, and per-route throttles of 10 a second, burst 20, on every route but health
(`jadwigo-platform/decisions/2026-10-28-the-app-s-http-api-stage-throttles-every-route-but-health-at-10`).
The HTTP API's route list in `terraform/main.tf` mirrors `ROUTES` in `packages/contracts/src/routes.ts`:
a route added there is added here too, or it falls to `$default` and its stage-default limit. `bun tools/src/check-infra-routes.ts`, in `make check` and CI, fails when the two differ. Terraform owns no file in the bucket; `make site-deploy` uploads the Astro build of `apps/site`. `dl-5ssh.34.4` adds the plan
role (`bootstrap/`, below) and the plan on every PR; `dl-w0b4.4` extends the site module.

The Lambda runs at most `app_reserved_concurrency` instances at once (`dl-5ssh.75`), 150 in prod. Each
instance holds 1 pooled connection (pool max 1, `dl-5ssh.25`), and jadwigo-prod's pooler (Supabase Pro,
Micro compute) accepts 200 clients, so a burst cannot crowd out `make api-dev` and the seeds, which keep
the other 50. Past 150 the Lambda throttles, and the `api-throttles` alarm fires. A larger compute size
raises the pooler limit; raise this with it, in `terraform/environments/<env>.tfvars`.

Mail (`terraform/modules/mail`, `dl-5ssh.6`): an SES domain identity for jadwigo.pl and for jadwigo.kids
in eu-central-1, each with Easy DKIM (3 CNAMEs), a custom MAIL FROM at `mail.<apex>` with its MX and SPF,
and a DMARC record (`p=quarantine`, relaxed alignment), all in the apex's own zone. The account already
has SES production access in eu-central-1. No SMTP user: auth mail goes out through the Send Email Hook
(`dl-liwi.33`).

Alarms (`terraform/modules/alarms`, `dl-5ssh.13`): one SNS topic, `jadwigo-prod-alarms`, mailing the owner,
and 7 alarms on 5-minute periods. They cover the Lambda's errors and throttles, its concurrency at 80% of
its reserved 150 (120, `dl-5ssh.81`), the HTTP API's 5xx,
account-wide concurrency at 80% of `lambda_concurrency_quota` (1000, so 800), and SES's bounce and complaint rates. There are no dashboards. The
logs are modules/app's. The address is not in git, because the repo is public: put it once in
`terraform/owner.auto.tfvars`, which git ignores and Terraform reads by itself, as
`alarm_email = "you@example.com"`. Without it (CI, another checkout) `plan` still runs and has no
subscription, so an apply from such a checkout would remove the owner's (`dl-5ssh.64`); the plan
warns `Check block assertion failed` when that is so, and an empty `alarm_email` fails validation (`dl-5ssh.81`). After the
first apply, AWS mails a confirmation link, and the alarms reach no one until the owner clicks it.

Parent routes (`dl-e8ov.2.42`): a JWT authorizer named `supabase` on the HTTP API verifies Supabase Auth's
RS256 access tokens (issuer `https://<supabase_ref>.supabase.co/auth/v1`, audience `authenticated`, the
`Authorization` header). It sits only on the routes in `token_routes` in `terraform/main.tf`, which are the `ROUTES`
entries whose `auth` is `token`. The login-free routes and `$default` have none. A missing or bad token is answered 401 at the
gateway, and `apps/api` then checks the caller's member rows.

A merge deploys nothing. The owner deploys by hand
(`jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually`).

| Command | What it does | Who |
| --- | --- | --- |
| `make -C infra fmt validate` | format check and validate, no AWS | anyone, CI |
| `make -C infra plan` | init against the state bucket, then plan prod | the owner |
| `make -C infra apply` | init, then apply prod | the owner |
| `make -C infra site-deploy` | build `apps/site`, check `dist/`, sync it to the bucket, invalidate | the owner |
| `make -C infra docs-deploy` | build `apps/docs`, check `dist/`, sync it to the docs bucket, invalidate (`docs/runbooks/docs-publish.md`) | the owner |
| `make -C infra deploy` | `api-deploy` (`make api-bundle`, zip, `update-function-code`, wait), then `web-deploy` (build `apps/web`, sync to the app bucket, invalidate) | the owner |
| `make -n -C infra deploy` | print both halves, running nothing | anyone |
| `make -C infra auth-diff` | read both Supabase projects' auth config and print what `supabase-auth/<env>.json` would change; exits 2 if anything would | anyone with the token |
| `make -C infra auth-apply` | write those settings through the Management API | the owner |

**The database URL never passes through Terraform.** The module creates the parameter with a write-only
placeholder, so neither a tfvars file nor the state holds the value. The owner sets it after the first
`apply`, and again after a password rotation, with jadwigo_api's transaction pooler URL (port 6543):

```sh
aws --profile sergii ssm put-parameter --region eu-central-1 --name /jadwigo/prod/database-url \
  --type SecureString --overwrite --value "postgresql://jadwigo_api.<ref>:<password>@<pooler-host>:6543/postgres"
```

The Lambda reads it once per cold start. Until the first deploy, its placeholder code answers 503.

**Supabase Auth settings live in `supabase-auth/`, not in Terraform.** The root module's state is one
environment's, and these settings span both projects, so a script reads and writes them through the
Management API: `prod.json` and `dev.json` each hold a project's ref and only the settings we own
(site URL, redirect URLs, the email OTP length). Every other auth setting stays as Supabase has it.
The token is `SUPABASE_ACCESS_TOKEN`, else the line in `~/.config/jadwigo/supabase.env`; it reaches
curl on stdin and is never printed. Dev has no hosted app yet (`packages/config` names prod only), so
its redirect list is any local port on `127.0.0.1` and `localhost`.

The state bucket `jadwigo-terraform-state-843109108289` is created by hand before the first `init` (`dl-5ssh.9`):

```sh
aws --profile sergii s3 mb s3://jadwigo-terraform-state-843109108289 --region eu-central-1
aws --profile sergii s3api put-bucket-versioning --bucket jadwigo-terraform-state-843109108289 --versioning-configuration Status=Enabled
aws --profile sergii s3api put-public-access-block --bucket jadwigo-terraform-state-843109108289 \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

The first time, in order: the state bucket above, `plan`, `apply` (the certificate and the distribution take
10 to 15 minutes), then `site-deploy`. Until `site-deploy` runs, the site answers 404. For app.jadwigo.pl:
`apply`, the `put-parameter` above, then `deploy`, then `curl https://app.jadwigo.pl/api/health`.

**The plan role is the owner's to create, once** (`bootstrap/`, `dl-5ssh.34.4`). `bootstrap/00-oidc.sh` runs as aws.mk's profile even when one is exported (`JADWIGO_AWS_PROFILE` picks another),
reuses the account's GitHub OIDC provider and creates `jadwigo-boundary` and `jadwigo-github-plan`. It
refuses an agent's shell and is safe to run again:

```sh
infra/bootstrap/00-oidc.sh      # then run the gh variable set line it prints
```

The role trusts only this repo's `pull_request` runs, with the immutable-id subject
(`repo:<owner>@<id>/<repo>@<id>:pull_request`, which GitHub sends for repos created after 15 July 2026).
The repo is public and a PR's run executes the PR's own workflow, so the role can only read: no write
verb, a Deny on `kms:Decrypt`, no SSM value but the bank alias (a String), and no S3 object but the
prod state (decision bead `dl-w146`). The AWS provider refreshes an `aws_ssm_parameter` with
decryption, so the CI plan runs `-refresh=false -lock=false`: it shows the config against the state,
and drift shows only in the owner's `make -C infra plan`. `bun tools/src/check-bootstrap.ts` (in
`make check`) fails on a write verb, a missing Deny, or a wider trust. `jadwigo-boundary` is the ceiling
every jadwigo role carries: no role under it can edit it, shed it, create a role without it, or make
a user or an access key. There is no apply role; the owner applies by hand.
