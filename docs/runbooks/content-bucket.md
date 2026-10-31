# The content bucket: applying modules/content, then the first upload

`infra/terraform/modules/content` (`dl-n9fr.43.2`) creates the private bucket that holds the Khan pull,
a CloudFront distribution that serves its `khan/media/` prefix and nothing else, and 2 SSM parameters
that carry its name and the media URL. The api role may read `questions/*` and `khan/converted/*`, and
no other prefix. jadwigo-bank's `tools/khan/sync.py` fills the bucket; Terraform owns no object in it.

| Parameter | Written by | Read by | Holds |
| --- | --- | --- | --- |
| `/jadwigo/bank/content-bucket` | `modules/content` | jadwigo-bank's tools | `jadwigo-content-843109108289` |
| `/jadwigo/bank/media-url` | `modules/content` | the player and the playground (`dl-n9fr.52`) | `https://<id>.cloudfront.net` |

Decisions: `jadwigo-question-bank/decisions/2026-10-29-the-monorepo-s-terraform-root-creates-the-content-bucket-and-the`,
`2026-10-29-the-content-bucket-is-keyed-by-source-first-khan-then-the-next-l`,
`2026-10-29-khan-pictures-are-served-from-a-cloudfront-path-over-the-bucket`.

## Before

1. The branch is merged: `git log --oneline -1 -- infra/terraform/modules/content` prints a `dl-n9fr.43.2` commit.
2. The profile reaches the account:
   `aws --profile jadwigo sts get-caller-identity --query Account --output text` prints `843109108289`.
3. The bucket name is free: `aws --profile jadwigo s3api head-bucket --bucket jadwigo-content-843109108289`
   answers `Not Found` (404). A 403 means another account holds the name; stop and pick another
   `bucket_name`.
4. The alarm address is in `infra/terraform/owner.auto.tfvars` (`infra/README.md`, Alarms). Without it
   the plan warns `Check block assertion failed`, and an apply removes the owner's alarm subscription if
   state holds one.
5. **The plan.** `make -C infra plan` shows these for this module, and nothing else of it:

   ```
   + module.content.aws_s3_bucket.content                                    jadwigo-content-843109108289
   + module.content.aws_s3_bucket_public_access_block.content                all 4 blocks true
   + module.content.aws_s3_bucket_ownership_controls.content                 BucketOwnerEnforced
   + module.content.aws_s3_bucket_server_side_encryption_configuration.content  AES256
   + module.content.aws_s3_bucket_versioning.content                         Enabled
   + module.content.aws_s3_bucket_lifecycle_configuration.content            noncurrent versions expire after 30 days
   + module.content.aws_s3_bucket_policy.content                             GetObject on khan/media/* for the distribution
   + module.content.aws_cloudfront_origin_access_control.media               sigv4, always
   + module.content.aws_cloudfront_cache_policy.media                        jadwigo-content-843109108289-media, a year
   + module.content.aws_cloudfront_distribution.media                        origin path /khan/media, GET and HEAD, PriceClass_100
   + module.content.aws_ssm_parameter.bucket                                 /jadwigo/bank/content-bucket, String
   + module.content.aws_ssm_parameter.media_url                              /jadwigo/bank/media-url, String
   ~ module.app.aws_iam_role_policy.api                                      jadwigo-api-prod: + ReadsTheContentBucketQuestions
   Changes to Outputs: + content_bucket, + media_url
   ```

   That is 12 to add and 1 to change. On 2026-10-29 the plan also carried work merged to main and not
   yet applied: 3 `module.app.aws_apigatewayv2_route.api` keys (the 2 review routes and
   `GET /api/v1/assignments/{id}/attempts`), their 3 throttles on `module.app.aws_apigatewayv2_stage.api`,
   and `module.alarms.aws_cloudwatch_metric_alarm.this["api-concurrency"]`, for
   `Plan: 16 to add, 2 to change, 0 to destroy`. Anything beyond those, or any destroy, is a stop.

   The role policy shows `-> (known after apply)` because the bucket document is read during apply. The
   new statement grants `s3:GetObject` on `arn:aws:s3:::jadwigo-content-843109108289/questions/*` and
   `.../khan/converted/*`.

## Steps

1. **Plan to a file**, from the repo root:

   ```sh
   make -C infra init
   AWS_PROFILE=jadwigo mise exec -- terraform -chdir=infra/terraform plan \
     -var-file=environments/prod.tfvars -out=content.tfplan
   ```

   Check it against "Before" step 5.
2. **Apply it:** `AWS_PROFILE=jadwigo mise exec -- terraform -chdir=infra/terraform apply content.tfplan`.
   The distribution takes 5 to 15 minutes. It ends `Apply complete! Resources: 12 added, 1 changed`
   (16 and 2 with main's unapplied work). Then:

   ```sh
   mise exec -- make -C infra output | grep -E 'content_bucket|media_url'
   ```

   prints `content_bucket = "jadwigo-content-843109108289"` and `media_url = "https://<id>.cloudfront.net"`.
3. **The plan role reads the bank's state too.** `infra/bootstrap/plan-policy.json` now lets
   `jadwigo-github-plan` read `jadwigo-bank/prod/terraform.tfstate` beside `prod/terraform.tfstate`, for
   when the bank's state moves into the shared bucket (`dl-e8ov.5.2.20`). A merge does not change the
   live role. The owner re-applies the policy by running `infra/bootstrap/00-oidc.sh` again, from a
   terminal; it is safe to run again and refuses an agent's shell.
4. **Upload the pull**, in `~/projects/jadwigo-bank`, with jadwigo-bank's `docs/runbook.md`,
   "Sync the Khan pull". The bucket name comes from the parameter:

   ```sh
   cd ~/projects/jadwigo-bank
   export JADWIGO_KHAN_BUCKET=$(aws --profile jadwigo ssm get-parameter --region eu-central-1 \
     --name /jadwigo/bank/content-bucket --query Parameter.Value --output text)
   export JADWIGO_KHAN_DIR=~/projects/david-learns/media/khan
   uv run python -m tools.khan.sync up --dry-run
   uv run python -m tools.khan.sync up
   uv run python -m tools.khan.sync check
   ```

   Go on only when `check` ends `in sync`, with 8,787 English items, 6,944 Polish items, 8,787 candidates
   and 28,262 media files. The derived `questions/khan/<id>.json` layer is uploaded by the sync once
   `dl-n9fr.43.3` lands.

## After

- The parameters read the names:

  ```sh
  aws --profile jadwigo ssm get-parameter --region eu-central-1 --name /jadwigo/bank/content-bucket \
    --query Parameter.Value --output text
  # jadwigo-content-843109108289
  MEDIA=$(aws --profile jadwigo ssm get-parameter --region eu-central-1 --name /jadwigo/bank/media-url \
    --query Parameter.Value --output text); echo "$MEDIA"
  # https://<id>.cloudfront.net
  ```

- A picture loads by sha, once uploaded. Take one key name, which is a sha and not item text:

  ```sh
  KEY=$(aws --profile jadwigo s3api list-objects-v2 --bucket jadwigo-content-843109108289 \
    --prefix khan/media/ --max-keys 1 --query 'Contents[0].Key' --output text)
  curl -sI "$MEDIA/${KEY#khan/media/}" | head -1
  # HTTP/2 200
  ```

- Nothing outside `khan/media/` is reachable. Through the distribution, `/khan/converted/pl.json` reads
  `khan/media/khan/converted/pl.json`, which is not there, and the bucket answers 403. The bucket itself
  answers 403 to anyone:

  ```sh
  curl -s -o /dev/null -w '%{http_code}\n' "$MEDIA/khan/converted/pl.json"
  # 403
  curl -s -o /dev/null -w '%{http_code}\n' https://jadwigo-content-843109108289.s3.eu-central-1.amazonaws.com/khan/converted/pl.json
  # 403
  ```

- The api role reads the 2 prefixes and no other:

  ```sh
  aws --profile jadwigo iam simulate-principal-policy \
    --policy-source-arn arn:aws:iam::843109108289:role/jadwigo-api-prod \
    --action-names s3:GetObject \
    --resource-arns arn:aws:s3:::jadwigo-content-843109108289/questions/khan/x.json \
      arn:aws:s3:::jadwigo-content-843109108289/khan/converted/pl.json \
      arn:aws:s3:::jadwigo-content-843109108289/khan/raw/pl/x.json \
      arn:aws:s3:::jadwigo-content-843109108289/khan/media/x.svg \
    --query 'EvaluationResults[].EvalDecision' --output text
  # allowed  allowed  implicitDeny  implicitDeny
  ```

## Undo

Revert, then apply. Do not run `terraform destroy -target=module.content`: a targeted destroy also
destroys what depends on the module, and the api role's policy reads the bucket's name from it.

1. **Empty the bucket**, every version and delete marker, since a versioned bucket with any left refuses
   deletion. From `~/projects/jadwigo-bank`, which has boto3:

   ```sh
   uv run python -c "import boto3; boto3.Session(profile_name='jadwigo').resource('s3').Bucket('jadwigo-content-843109108289').object_versions.delete()"
   ```

2. **Revert the `dl-n9fr.43.2` commit**, then plan. Expect `0 to add, 1 to change, 12 to destroy`: the
   module's 12 resources go, and the api role's policy loses `ReadsTheContentBucketQuestions`. Apply that plan.
3. **The plan policy line** stays harmless; revert it with the commit and re-run `00-oidc.sh` if the bank's
   state never moved.

What the undo loses:

- **Every object and every version** in the bucket. The laptop folder `~/projects/david-learns/media/khan`
  is the source of the pull, so a re-apply and `sync up` restore it, but the derived `questions/` layer
  must be derived again.
- **The media URL.** A new distribution gets a new `*.cloudfront.net` name, so every page or setting that
  holds the old URL breaks until it reads the new parameter.
- **The item route.** Once the api reads `questions/`, it answers errors until the bucket is back.
