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
a route added there is added here too, or it falls to `$default` and its stage-default limit. Terraform owns no file in the bucket; `make site-deploy` uploads the Astro build of `apps/site`. `dl-5ssh.34.4` adds the other
modules, the OIDC roles script and the plan on every PR; `dl-w0b4.4` extends the site module.

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

**The database URL never passes through Terraform.** The module creates the parameter with a write-only
placeholder, so neither a tfvars file nor the state holds the value. The owner sets it after the first
`apply`, and again after a password rotation, with jadwigo_api's transaction pooler URL (port 6543):

```sh
aws --profile sergii ssm put-parameter --region eu-central-1 --name /jadwigo/prod/database-url \
  --type SecureString --overwrite --value "postgresql://jadwigo_api.<ref>:<password>@<pooler-host>:6543/postgres"
```

The Lambda reads it once per cold start. Until the first deploy, its placeholder code answers 503.

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
