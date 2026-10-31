# dl-n9fr: wave 5, lane bucket, dl-n9fr.43.2: the content bucket module in the monorepo root

- **Landed:** `16aad98` on `lane/content-bucket`, with this note in the commit after it; not pushed. `modules/content` creates the private bucket, CloudFront over `khan/media/` only, and the 2 SSM parameters.
- **Plan ran** read-only through `jadwigo`: `Plan: 16 to add, 2 to change, 0 to destroy.` This lane's part is 12 to add and 1 to change; the rest is main's unapplied work.
- **Main's unapplied work in the same plan:** 3 route keys (the 2 review routes and `GET /api/v1/assignments/{id}/attempts`), their 3 stage throttles, and the `api-concurrency` alarm. Applying this root applies those too.
- **Checks pass:** `make -C infra fmt validate`, tflint 0.65.0, trivy 0.76.1 with CI's ignore list (0 findings), `check-bootstrap.ts` and `check-infra-routes.ts`.
- **Apply needs the alarm address:** no checkout has `infra/terraform/owner.auto.tfvars`, so the plan warns `Check block assertion failed`. State holds no subscription today, since the plan destroys nothing.
- **One resource beyond the list:** `aws_cloudfront_cache_policy.media`, a year, for the "long default TTL". The managed CachingOptimized default is 1 day.
- **No 404 from the api:** the api role has GetObject and no ListBucket, so a missing `questions/` key answers 403 `AccessDenied`. The api-items lane should read that as not found.
- **Not in this lane:** the function has no env var with the bucket name, because `api.tf` is not mine. A follow-up is below.
- **Runbook:** `docs/runbooks/content-bucket.md`, with Before, Steps, After and Undo.

## What landed

| File | Change |
| --- | --- |
| `infra/terraform/modules/content/main.tf` | new: bucket, public access block, ownership controls, SSE-S3, versioning, lifecycle (noncurrent 30 days), OAC, cache policy, distribution (origin path `/khan/media`, GET and HEAD, compress, PriceClass_100, default certificate), bucket policy, 2 SSM String parameters |
| `infra/terraform/modules/content/{variables,outputs,versions}.tf`, `README.md` | new; `bucket_name` defaults to `jadwigo-content-843109108289` |
| `infra/terraform/main.tf` | `module "content"`, and `content_bucket_name = module.content.bucket_name` in the app module call |
| `infra/terraform/outputs.tf` | `content_bucket`, `media_url` |
| `infra/terraform/modules/app/bank.tf` | new lines only: `variable "content_bucket_name"` and the `ReadsTheContentBucketQuestions` statement, GetObject on `questions/*` and `khan/converted/*` |
| `infra/bootstrap/plan-policy.json` | the bank's state key `jadwigo-bank/prod/terraform.tfstate` beside `prod/terraform.tfstate`, in both the allow and the deny's NotResource |
| `docs/runbooks/content-bucket.md` | new |

Tags come from the provider's `default_tags`, as in the other modules. The variable sits in `bank.tf` rather than `modules/app/variables.tf`, which is not this lane's.

## The plan, this lane's resources

```text
+ module.content.aws_cloudfront_cache_policy.media
+ module.content.aws_cloudfront_distribution.media
+ module.content.aws_cloudfront_origin_access_control.media
+ module.content.aws_s3_bucket.content
+ module.content.aws_s3_bucket_lifecycle_configuration.content
+ module.content.aws_s3_bucket_ownership_controls.content
+ module.content.aws_s3_bucket_policy.content
+ module.content.aws_s3_bucket_public_access_block.content
+ module.content.aws_s3_bucket_server_side_encryption_configuration.content
+ module.content.aws_s3_bucket_versioning.content
+ module.content.aws_ssm_parameter.bucket
+ module.content.aws_ssm_parameter.media_url
~ module.app.aws_iam_role_policy.api
Changes to Outputs: + content_bucket, + media_url
```

And from main, not this lane:

```text
+ module.alarms.aws_cloudwatch_metric_alarm.this["api-concurrency"]
+ module.app.aws_apigatewayv2_route.api["GET /api/v1/assignments/{id}/attempts"]
+ module.app.aws_apigatewayv2_route.api["GET /api/v1/attempts/{id}/review"]
+ module.app.aws_apigatewayv2_route.api["GET /api/v1/learners/{id}/attempts/{attempt}/review"]
~ module.app.aws_apigatewayv2_stage.api   (the 3 routes' throttles)
Plan: 16 to add, 2 to change, 0 to destroy.
```

## The apply, for the lead

From the repo root once the branch is merged, with `owner.auto.tfvars` in place:

```sh
make -C infra init
AWS_PROFILE=jadwigo mise exec -- terraform -chdir=infra/terraform plan -var-file=environments/prod.tfvars -out=content.tfplan
AWS_PROFILE=jadwigo mise exec -- terraform -chdir=infra/terraform apply content.tfplan
```

Expect `Apply complete! Resources: 16 added, 2 changed, 0 destroyed`. Then follow the sync in the runbook's Steps 4, which reads `JADWIGO_KHAN_BUCKET` from `/jadwigo/bank/content-bucket`.

## After checks

These are in the runbook's After section:

- `/jadwigo/bank/content-bucket` reads `jadwigo-content-843109108289`, and `/jadwigo/bank/media-url` reads `https://<id>.cloudfront.net`.
- A HEAD on `$MEDIA/<sha>.<ext>` for the first `khan/media/` key returns 200 after the upload.
- `$MEDIA/khan/converted/pl.json` and the bucket's own S3 URL both return 403.
- `iam simulate-principal-policy` on the api role gives `allowed` for `questions/` and `khan/converted/`, and `implicitDeny` for `khan/raw/` and `khan/media/`.

## What I could not do

- **Run the CI plan job.** It runs on a pushed PR, and pushing is the lead's. The local plan stands in for it.
- **Re-apply the plan role's policy.** `infra/bootstrap/00-oidc.sh` is the owner's and refuses an agent's shell. The runbook says so in Steps 3.
- **Correct the trivy comment.** `.github/workflows/infra.yml` explains its ignore of AWS-0132 (SSE-S3) as "the buckets hold the public site and app builds". The content bucket holds licensed Khan content and is not public, so the reason no longer covers every bucket.

## Proposed bead changes (not made)

- **Record on dl-n9fr.43.2 after the apply:** the 2 outputs and the apply line, then close it once the After checks pass.
- **New bead under dl-n9fr, for the api-items lane's path (`modules/app/api.tf`):** the api function gets `CONTENT_BUCKET` set from `var.content_bucket_name`, so `apps/api` reads the name without an SSM call. Done when the plan shows the env var only.
- **New bead under dl-n9fr, for `.github/workflows/infra.yml`:** reword the AWS-0132 reason to cover the content bucket, or decide a customer key for it. The choice is the owner's.
- **dl-n9fr.52 (pictures) input:** the media URL comes from `/jadwigo/bank/media-url`. A picture's URL is `<media-url>/<sha>.<ext>`, with no `khan/media/` in the path.
