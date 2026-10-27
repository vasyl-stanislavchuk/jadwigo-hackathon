# infra

Terraform for jadwigo: one root module in `terraform/`, read through `terraform/environments/<env>.tfvars`
and `<env>.backend.hcl`, prod only. Decision: `jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module`.

What it holds today: the marketing site's edge for jadwigo.pl (`terraform/modules/site`, `dl-w0b4.24`), serving
`apps/site/placeholder/index.html` until `apps/site` builds the real site. `dl-5ssh.34.4` adds the other
modules, the OIDC roles script and the plan on every PR; `dl-w0b4.4` extends the site module.

A merge deploys nothing. The owner deploys by hand
(`jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually`).

| Command | What it does | Who |
| --- | --- | --- |
| `make -C infra fmt validate` | format check and validate, no AWS | anyone, CI |
| `make -C infra plan` | init against the state bucket, then plan prod | the owner |
| `make -C infra apply` | init, then apply prod | the owner |

The state bucket `jadwigo-terraform-state-843109108289` is created by hand before the first `init` (`dl-5ssh.9`):

```sh
aws --profile sergii s3 mb s3://jadwigo-terraform-state-843109108289 --region eu-central-1
aws --profile sergii s3api put-bucket-versioning --bucket jadwigo-terraform-state-843109108289 --versioning-configuration Status=Enabled
aws --profile sergii s3api put-public-access-block --bucket jadwigo-terraform-state-843109108289 \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```
