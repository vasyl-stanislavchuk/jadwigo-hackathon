# The attachments converter (dl-z5ja.11.8), planned against mock providers: no AWS and no
# credentials. Its role reads under pods/*/attachments/ and writes one level below an attachment's
# id, and nothing else in S3; the function has no URL and runs the image the tag names; with no tag
# there is only the ECR repo. The runner may invoke it once it exists, and not before.
# `make -C infra test` runs it.

mock_provider "aws" {
  override_during = plan

  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/jadwigo-converter-dev" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:eu-central-1:123456789012:log-group:/aws/lambda/jadwigo-converter-dev" }
  }
  mock_resource "aws_ecr_repository" {
    defaults = { repository_url = "123456789012.dkr.ecr.eu-central-1.amazonaws.com/jadwigo-converter-dev" }
  }
  mock_resource "aws_lambda_function" {
    defaults = { arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-converter-dev", version = "1" }
  }
  mock_resource "aws_ssm_parameter" {
    defaults = { arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/runner-database-url" }
  }
  mock_resource "aws_lambda_alias" {
    defaults = { arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-runner-dev:live" }
  }
}

run "the_converter" {
  command = plan

  module {
    source = "./modules/converter"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
    image_tag           = "dev-abc1234"
  }

  assert {
    condition = (
      aws_lambda_function.converter[0].function_name == "jadwigo-converter-dev" &&
      aws_lambda_function.converter[0].package_type == "Image" &&
      aws_lambda_function.converter[0].image_uri == "123456789012.dkr.ecr.eu-central-1.amazonaws.com/jadwigo-converter-dev:dev-abc1234" &&
      aws_lambda_function.converter[0].architectures == tolist(["x86_64"])
    )
    error_message = "the function runs the tagged image from its own repo, on x86_64 for LibreOffice's RPMs"
  }

  assert {
    condition     = aws_lambda_function.converter[0].memory_size == 2048 && aws_lambda_function.converter[0].timeout == 120
    error_message = "2048 MB and a 120 s timeout"
  }

  assert {
    condition     = aws_lambda_function.converter[0].environment[0].variables == tomap({ UPLOADS_BUCKET = "jadwigo-uploads-dev-test" })
    error_message = "the environment names the bucket and nothing else"
  }

  assert {
    condition     = aws_ecr_repository.converter.image_tag_mutability == "IMMUTABLE" && one(aws_ecr_repository.converter.image_scanning_configuration).scan_on_push
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
      s.Resource == ["arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/attachments/*"]
    ])
    error_message = "the converter gets under pods/*/attachments/"
  }

  assert {
    condition = anytrue([
      for s in local.statements :
      s.Action == ["s3:PutObject"] &&
      s.Resource == ["arn:aws:s3:::jadwigo-uploads-dev-test/pods/*/attachments/*/*"]
    ])
    error_message = "the converter puts only below an attachment's id"
  }

  assert {
    condition = alltrue([
      for s in local.statements :
      s.Effect == "Allow" &&
      alltrue([for a in s.Action : contains(["s3:GetObject", "s3:PutObject", "logs:CreateLogStream", "logs:PutLogEvents"], a)]) &&
      alltrue([for r in s.Resource : !strcontains(r, "/pending/") && !endswith(r, ":::jadwigo-uploads-dev-test")])
    ])
    error_message = "no list, no delete, no other service, nothing under pending/"
  }

  assert {
    condition     = jsondecode(aws_iam_role_policy.converter.policy).Statement == local.statements
    error_message = "the role's policy is those statements"
  }

  assert {
    condition     = jsondecode(aws_iam_role.converter.assume_role_policy).Statement[0].Principal == { Service = "lambda.amazonaws.com" }
    error_message = "only Lambda assumes the role"
  }

  assert {
    condition     = output.function_arn == "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-converter-dev"
    error_message = "the module hands the runner the function's ARN"
  }
}

run "no_tag_makes_the_repo_only" {
  command = plan

  module {
    source = "./modules/converter"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
  }

  assert {
    condition     = length(aws_lambda_function.converter) == 0 && output.function_arn == "" && output.function_name == ""
    error_message = "with no image tag there is no function to invoke, so the first apply needs no image"
  }

  assert {
    condition     = aws_ecr_repository.converter.name == "jadwigo-converter-dev"
    error_message = "the repo exists for the first push"
  }
}

run "refuses_a_timeout_past_120_s" {
  command = plan

  module {
    source = "./modules/converter"
  }

  variables {
    environment         = "dev"
    uploads_bucket_name = "jadwigo-uploads-dev-test"
    timeout             = 300
  }

  expect_failures = [var.timeout]
}

run "the_runner_invokes_the_converter" {
  command = plan

  module {
    source = "./modules/runner"
  }

  variables {
    environment            = "dev"
    handler                = "index.handler"
    uploads_bucket_name    = "jadwigo-uploads-dev-test"
    converter_function_arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-converter-dev"
  }

  assert {
    condition = anytrue([
      for s in data.aws_iam_policy_document.runner.statement :
      s.actions == toset(["lambda:InvokeFunction"]) &&
      s.resources == toset(["arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-converter-dev"])
    ])
    error_message = "the runner may invoke the converter and no other function"
  }

  assert {
    condition     = aws_lambda_function.runner.environment[0].variables["CONVERTER_FUNCTION"] == "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-converter-dev"
    error_message = "the runner knows the converter as CONVERTER_FUNCTION"
  }
}

run "the_runner_without_a_converter_gets_no_grant" {
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
    condition = alltrue([
      for s in data.aws_iam_policy_document.runner.statement :
      !contains(s.actions, "lambda:InvokeFunction")
    ])
    error_message = "with no converter the runner invokes nothing"
  }

  assert {
    condition     = !contains(keys(aws_lambda_function.runner.environment[0].variables), "CONVERTER_FUNCTION")
    error_message = "with no converter the runner has no CONVERTER_FUNCTION"
  }
}
