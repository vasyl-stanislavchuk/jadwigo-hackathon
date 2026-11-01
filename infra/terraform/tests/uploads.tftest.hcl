# A message's photos (dl-z5ja.11.2), planned against mock providers: no AWS and no credentials. The
# uploads bucket is private, unversioned so a delete erases, expires pending/ after a day, and takes a
# CORS POST from the app's origin only. The api role may put, get and delete under pending/ and
# pods/*/attachments/ and nowhere else; the runner may only get under pods/*/attachments/. Blank, each
# module grants nothing. `make -C infra test` runs it.

mock_provider "aws" {
  override_during = plan

  mock_data "aws_ssm_parameter" {
    defaults = { insecure_value = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-bank-search:live" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
  # The provider checks these are ARNs: mocks shaped like them.
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/jadwigo-app-dev" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:eu-central-1:123456789012:log-group:/aws/lambda/jadwigo-app-dev" }
  }
  mock_resource "aws_ssm_parameter" {
    defaults = { arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/x" }
  }
  mock_resource "aws_lambda_function" {
    defaults = {
      version    = "1"
      arn        = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-app-dev"
      invoke_arn = "arn:aws:apigateway:eu-central-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-app-dev/invocations"
    }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::jadwigo-app-dev-test" }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:distribution/EXAMPLE" }
  }
  mock_resource "aws_lambda_alias" {
    defaults = { arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-runner-dev:live" }
  }
  mock_resource "aws_apigatewayv2_api" {
    defaults = { execution_arn = "arn:aws:execute-api:eu-central-1:123456789012:abcdef1234", api_endpoint = "https://abcdef1234.execute-api.eu-central-1.amazonaws.com" }
  }
}

mock_provider "aws" {
  alias           = "us_east_1"
  override_during = plan

  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000" }
  }

  # The certificate's DNS records are keyed by its validation options, which a plan must know.
  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/00000000-0000-0000-0000-000000000000"
      domain_validation_options = [{
        domain_name           = "app.jadwigo.test"
        resource_record_name  = "_x.app.jadwigo.test."
        resource_record_type  = "CNAME"
        resource_record_value = "_y.acm-validations.aws."
      }]
    }
  }
}


run "the_uploads_bucket" {
  command = plan

  module {
    source = "./modules/uploads"
  }

  variables {
    bucket_name     = "jadwigo-uploads-dev-test"
    allowed_origins = ["https://app.jadwigo.test"]
  }

  assert {
    condition = (
      aws_s3_bucket_public_access_block.uploads.block_public_acls &&
      aws_s3_bucket_public_access_block.uploads.block_public_policy &&
      aws_s3_bucket_public_access_block.uploads.ignore_public_acls &&
      aws_s3_bucket_public_access_block.uploads.restrict_public_buckets
    )
    error_message = "every public access setting is blocked"
  }

  assert {
    condition     = one(one(aws_s3_bucket_server_side_encryption_configuration.uploads.rule).apply_server_side_encryption_by_default).sse_algorithm == "AES256"
    error_message = "objects are encrypted with SSE-S3"
  }

  assert {
    condition = anytrue([
      for r in aws_s3_bucket_lifecycle_configuration.uploads.rule :
      r.status == "Enabled" && one(r.filter).prefix == "pending/" && one(r.expiration).days == 1
    ])
    error_message = "pending/ expires after 1 day"
  }

  assert {
    condition = (
      length(aws_s3_bucket_cors_configuration.uploads.cors_rule) == 1 &&
      one(aws_s3_bucket_cors_configuration.uploads.cors_rule).allowed_methods == toset(["POST"]) &&
      one(aws_s3_bucket_cors_configuration.uploads.cors_rule).allowed_origins == toset(["https://app.jadwigo.test"])
    )
    error_message = "CORS allows a POST from the app's origin and nothing else"
  }

  assert {
    condition     = aws_ssm_parameter.bucket.name == "/jadwigo/uploads/bucket" && aws_ssm_parameter.bucket.type == "String"
    error_message = "the name is a String parameter at apps/api's UPLOADS_BUCKET_PARAM"
  }
}

run "refuses_a_plain_http_origin" {
  command = plan

  module {
    source = "./modules/uploads"
  }

  variables {
    bucket_name     = "jadwigo-uploads-dev-test"
    allowed_origins = ["http://app.jadwigo.test"]
  }

  expect_failures = [var.allowed_origins]
}

run "the_api_puts_gets_and_deletes_under_its_two_prefixes" {
  command = plan

  module {
    source = "./modules/app"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  variables {
    domain_name              = "app.jadwigo.test"
    zone_name                = "jadwigo.test"
    environment              = "dev"
    bucket_name              = "jadwigo-app-dev-test"
    routes                   = ["GET /api/health"]
    jwt_issuer               = "https://example.supabase.co/auth/v1"
    reserved_concurrency     = 1
    content_bucket_name      = "jadwigo-content-dev-test"
    content_bucket_param_arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/content-bucket"
    uploads_bucket_name      = "jadwigo-uploads-dev-test"
    uploads_bucket_param_arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/uploads/bucket"
  }

  assert {
    condition     = length(data.aws_iam_policy_document.uploads.statement) == 2
    error_message = "the api role has 2 statements for the uploads bucket"
  }

  assert {
    condition = anytrue([
      for s in data.aws_iam_policy_document.uploads.statement :
      s.actions == toset(["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]) &&
      s.resources == toset([
        "arn:aws:s3:::jadwigo-uploads-dev-test/pending/*",
        "arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/attachments/*",
      ])
    ])
    error_message = "the api role may put, get and delete under pending/ and pods/*/attachments/ only"
  }

  assert {
    condition = anytrue([
      for s in data.aws_iam_policy_document.uploads.statement :
      s.actions == toset(["ssm:GetParameter"]) && s.resources == toset([var.uploads_bucket_param_arn])
    ])
    error_message = "the api role reads the bucket's name parameter and no other"
  }

  assert {
    condition     = aws_lambda_function.api.environment[0].variables["UPLOADS_BUCKET"] == "jadwigo-uploads-dev-test"
    error_message = "the api knows the bucket"
  }
}

run "the_api_without_a_bucket_gets_no_grant" {
  command = plan

  module {
    source = "./modules/app"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  variables {
    domain_name              = "app.jadwigo.test"
    zone_name                = "jadwigo.test"
    environment              = "dev"
    bucket_name              = "jadwigo-app-dev-test"
    routes                   = ["GET /api/health"]
    jwt_issuer               = "https://example.supabase.co/auth/v1"
    reserved_concurrency     = 1
    content_bucket_name      = "jadwigo-content-dev-test"
    content_bucket_param_arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/content-bucket"
  }

  assert {
    condition     = length(data.aws_iam_policy_document.uploads.statement) == 0
    error_message = "with no bucket named the api role gets no uploads grant"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "UPLOADS_BUCKET")
    error_message = "with no bucket named the api has no UPLOADS_BUCKET"
  }
}

run "the_runner_only_reads_attached_photos" {
  command = plan

  module {
    source = "./modules/runner"
  }

  variables {
    environment         = "dev"
    handler             = "index.handler"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
  }

  assert {
    condition = anytrue([
      for s in data.aws_iam_policy_document.runner.statement :
      s.actions == toset(["s3:GetObject"]) &&
      s.resources == toset(["arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/attachments/*"])
    ])
    error_message = "the runner may get under pods/*/attachments/"
  }

  assert {
    condition = alltrue([
      for s in data.aws_iam_policy_document.runner.statement :
      alltrue([for a in s.actions : !startswith(a, "s3:") || a == "s3:GetObject"]) &&
      alltrue([for r in s.resources : !strcontains(r, "/pending/")])
    ])
    error_message = "the runner never writes or deletes an object, and never reads pending/"
  }

  assert {
    condition     = aws_lambda_function.runner.environment[0].variables["UPLOADS_BUCKET"] == "jadwigo-uploads-dev-test"
    error_message = "the runner knows the bucket"
  }
}
