# modules/app's grant to poke the step host (dl-z5ja.88), planned against mock providers: no AWS and
# no credentials. With the runner's live alias named, the api role may invoke that alias and only it,
# and the function knows the alias; blank, there is neither. `make -C infra test` runs it.

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

variables {
  domain_name              = "app.jadwigo.test"
  zone_name                = "jadwigo.test"
  environment              = "dev"
  bucket_name              = "jadwigo-app-dev-test"
  routes                   = ["GET /api/health"]
  token_routes             = []
  jwt_issuer               = "https://example.supabase.co/auth/v1"
  reserved_concurrency     = 1
  content_bucket_name      = "jadwigo-content-dev-test"
  content_bucket_param_arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/content-bucket"
}

run "pokes_the_named_alias_only" {
  command = plan

  module {
    source = "./modules/app"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  variables {
    runner_alias_arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-runner-dev:live"
  }

  assert {
    condition     = length(data.aws_iam_policy_document.runner.statement) == 1
    error_message = "the api role has one statement for the step host"
  }

  assert {
    condition = (
      one(data.aws_iam_policy_document.runner.statement).actions == toset(["lambda:InvokeFunction"]) &&
      one(data.aws_iam_policy_document.runner.statement).resources == toset([var.runner_alias_arn])
    )
    error_message = "the api role may invoke the runner's live alias and nothing else"
  }

  assert {
    condition     = aws_lambda_function.api.environment[0].variables["RUNNER_LIVE_ALIAS_ARN"] == var.runner_alias_arn
    error_message = "the api knows the alias it pokes"
  }
}

run "no_alias_no_grant" {
  command = plan

  module {
    source = "./modules/app"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  assert {
    condition     = length(data.aws_iam_policy_document.runner.statement) == 0
    error_message = "with no alias named the api role gets no invoke grant"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.api.environment[0].variables), "RUNNER_LIVE_ALIAS_ARN")
    error_message = "with no alias named the api pokes nothing"
  }
}
