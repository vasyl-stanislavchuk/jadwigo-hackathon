# infra

Terraform for jadwigo: one root module in `terraform/`, read through `terraform/environments/<env>.tfvars`
and `<env>.backend.hcl`, prod only. Decision: `jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module`.

What it holds today: the marketing site's edge for jadwigo.pl (`terraform/modules/site`, `dl-w0b4.24`): the
certificate, the private bucket, CloudFront with `edge.js` (www to the apex, page paths to their `index.html`)
and the alias records. And the service at app.jadwigo.pl (`terraform/modules/app`, `dl-5ssh.3.3`): its own
certificate, a private bucket for `apps/web` with `spa.js` (a path with no extension reads `index.html`, so
`/play/<id>` and `/playground` load the app), `/api/*` uncached to an HTTP API on the same origin, the one
Lambda (Node 24, arm64, `index.handler`), its role, 90-day log groups, the SSM SecureString with
`DATABASE_URL`, and per-route throttles of 10 a second, burst 20, on every route but health
(`jadwigo-platform/decisions/2026-10-28-the-app-s-http-api-stage-throttles-every-route-but-health-at-10`).
The HTTP API's route list in `terraform/main.tf` mirrors `ROUTES` in `packages/contracts/src/routes.ts`:
a route added there is added here too, or it falls to `$default` and its stage-default limit. `bun tools/src/check-infra-routes.ts`, in `make check` and CI, fails when the two differ. Terraform owns no file in the bucket; `make site-deploy` uploads the Astro build of `apps/site`. `dl-5ssh.34.4` adds the other
modules, the OIDC roles script and the plan on every PR; `dl-w0b4.4` extends the site module.

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
