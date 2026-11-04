# The print Lambda (dl-1eieq.8.3, decision dl-o05aa), planned against mock providers: no AWS and
# no credentials. Its role reads a sheet (pods/*/prints/*.json) and writes a PDF or an error file
# beside it, tagged, and nothing else in S3; the function runs the tagged image on arm64 with no URL;
# with no tag there is only the ECR repo. At most 5 renders run at once (dl-1eieq.8.16). The api may invoke it, and put and get under
# pods/*/prints/, once it exists and not before. The uploads bucket expires whatever is tagged
# kind=print after 30 days. `make -C infra test` runs it.

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
  mock_resource "aws_ecr_repository" {
    defaults = { repository_url = "123456789012.dkr.ecr.eu-central-1.amazonaws.com/jadwigo-print-dev" }
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

run "the_print_lambda" {
  command = plan

  module {
    source = "./modules/print"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
    image_tag           = "dev-abc1234"
  }

  assert {
    condition = (
      aws_lambda_function.print[0].function_name == "jadwigo-print-dev" &&
      aws_lambda_function.print[0].package_type == "Image" &&
      aws_lambda_function.print[0].image_uri == "123456789012.dkr.ecr.eu-central-1.amazonaws.com/jadwigo-print-dev:dev-abc1234" &&
      aws_lambda_function.print[0].architectures == tolist(["arm64"])
    )
    error_message = "the function runs the tagged image from its own repo, on arm64"
  }

  assert {
    condition     = aws_lambda_function.print[0].memory_size == 1024 && aws_lambda_function.print[0].timeout == 60
    error_message = "1024 MB and a 60 s timeout"
  }

  assert {
    condition     = aws_lambda_function.print[0].reserved_concurrent_executions == 5
    error_message = "at most 5 renders at once, so a flood of public starts queues (dl-1eieq.8.16)"
  }

  assert {
    condition     = aws_lambda_function.print[0].environment[0].variables == tomap({ UPLOADS_BUCKET = "jadwigo-uploads-dev-test" })
    error_message = "the environment names the bucket and nothing else"
  }

  assert {
    condition     = aws_ecr_repository.print.image_tag_mutability == "IMMUTABLE" && one(aws_ecr_repository.print.image_scanning_configuration).scan_on_push
    error_message = "a tag names one image forever, and each push is scanned"
  }

  assert {
    condition     = length(local.statements) == 3
    error_message = "logs, a read and a write: 3 statements"
  }

  assert {
    condition = anytrue([
      for s in local.statements :
      s.Action == ["s3:GetObject"] &&
      s.Resource == ["arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/prints/*.json"]
    ])
    error_message = "the print Lambda gets only a sheet under pods/*/prints/"
  }

  assert {
    condition = anytrue([
      for s in local.statements :
      s.Action == ["s3:PutObject", "s3:PutObjectTagging"] &&
      s.Resource == [
        "arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/prints/*.pdf",
        "arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/prints/*.error.json",
      ]
    ])
    error_message = "the print Lambda puts (tagged) only a PDF or an error file under pods/*/prints/"
  }

  assert {
    condition = alltrue([
      for s in local.statements :
      s.Effect == "Allow" &&
      alltrue([for a in s.Action : contains(["s3:GetObject", "s3:PutObject", "s3:PutObjectTagging", "logs:CreateLogStream", "logs:PutLogEvents"], a)]) &&
      alltrue([for r in s.Resource : !strcontains(r, "/pending/") && !strcontains(r, "/attachments/") && !endswith(r, ":::jadwigo-uploads-dev-test")])
    ])
    error_message = "no list, no delete, no other service, nothing under pending/ or attachments/"
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.print.policy).Statement == local.statements
    error_message = "the role's policy is those statements"
  }

  assert {
    condition     = jsondecode(aws_iam_role.print.assume_role_policy).Statement[0].Principal == { Service = "lambda.amazonaws.com" }
    error_message = "only Lambda assumes the role"
  }

  assert {
    condition     = output.function_arn == aws_lambda_function.print[0].arn && output.function_name == "jadwigo-print-dev"
    error_message = "the module hands the api the function's ARN"
  }
}

run "no_tag_makes_the_repo_only" {
  command = plan

  module {
    source = "./modules/print"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
  }

  assert {
    condition     = length(aws_lambda_function.print) == 0 && output.function_arn == "" && output.function_name == ""
    error_message = "with no image tag there is no function to invoke, so the first apply needs no image"
  }

  assert {
    condition     = aws_ecr_repository.print.name == "jadwigo-print-dev"
    error_message = "the repo exists for the first push"
  }
}

run "refuses_a_timeout_past_60_s" {
  command = plan

  module {
    source = "./modules/print"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
    timeout             = 120
  }

  expect_failures = [var.timeout]
}

run "refuses_a_cap_of_0" {
  command = plan

  module {
    source = "./modules/print"
  }

  variables {
    environment          = "dev"
    uploads_bucket_name  = "jadwigo-uploads-dev-test"
    reserved_concurrency = 0
  }

  expect_failures = [var.reserved_concurrency]
}

run "the_uploads_bucket_expires_prints" {
  command = plan

  module {
    source = "./modules/uploads"
  }

  variables {
    bucket_name     = "jadwigo-uploads-dev-test"
    allowed_origins = ["https://app.jadwigo.test"]
  }

  assert {
    condition = anytrue([
      for r in aws_s3_bucket_lifecycle_configuration.uploads.rule :
      r.status == "Enabled" &&
      try(one(one(r.filter).tag).key, "") == "kind" && try(one(one(r.filter).tag).value, "") == "print" &&
      try(one(r.expiration).days, 0) == 30
    ])
    error_message = "whatever is tagged kind=print expires after 30 days"
  }

  assert {
    condition = anytrue([
      for r in aws_s3_bucket_lifecycle_configuration.uploads.rule :
      r.status == "Enabled" && try(one(r.filter).prefix, "") == "pending/" && try(one(r.expiration).days, 0) == 1
    ])
    error_message = "pending/ still expires after 1 day"
  }
}

run "the_api_invokes_the_print_lambda_and_reaches_prints" {
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
    print_function_arn       = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-print-dev"
    media_url                = "https://media.jadwigo.test"
  }

  assert {
    condition = anytrue([
      for s in data.aws_iam_policy_document.print.statement :
      s.actions == toset(["lambda:InvokeFunction"]) && s.resources == toset(["arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-print-dev"])
    ])
    error_message = "the api may invoke the print Lambda and no other function for printing"
  }

  assert {
    condition     = aws_lambda_function.api.environment[0].variables["PRINT_FUNCTION"] == "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-print-dev"
    error_message = "the api knows the print Lambda as PRINT_FUNCTION"
  }

  assert {
    condition     = aws_lambda_function.api.environment[0].variables["MEDIA_URL"] == "https://media.jadwigo.test"
    error_message = "the print route resolves pictures against MEDIA_URL"
  }

  assert {
    condition = (
      length(data.aws_iam_policy_document.prints.statement) == 1 &&
      one(data.aws_iam_policy_document.prints.statement).actions == toset(["s3:PutObject", "s3:PutObjectTagging", "s3:GetObject"]) &&
      one(data.aws_iam_policy_document.prints.statement).resources == toset(["arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/prints/*"])
    )
    error_message = "the api may put (tagged) and get under pods/*/prints/ only: no delete, no list"
  }

  assert {
    condition     = length(data.aws_iam_policy_document.uploads.statement) == 2
    error_message = "the photo grants are unchanged"
  }
}

run "the_api_without_a_print_lambda_gets_no_grant" {
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
    condition     = length(data.aws_iam_policy_document.print.statement) == 0 && length(data.aws_iam_policy_document.prints.statement) == 0
    error_message = "with no print Lambda the api invokes nothing for printing and has no prints/ grant"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "PRINT_FUNCTION")
    error_message = "with no print Lambda the api has no PRINT_FUNCTION"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "MEDIA_URL")
    error_message = "with no media URL named the api has no MEDIA_URL"
  }
}
