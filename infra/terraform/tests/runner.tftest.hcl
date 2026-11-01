# modules/runner, the engine's step host (dl-z5ja.5, dl-z5ja.20), planned against a mock provider: no
# AWS and no credentials. It pins what a release relies on: callers invoke the `live` alias, Terraform
# never takes the alias or the code back from a release, the role reads only its own parameters, and
# no secret is ever in the function's environment. `make -C infra test` runs it.

mock_provider "aws" {
  override_during = plan

  mock_resource "aws_ssm_parameter" {
    defaults = { arn = "arn:aws:ssm:eu-central-1:123456789012:parameter/jadwigo/dev/runner-probe-database-url" }
  }
  mock_resource "aws_cloudwatch_log_group" {
    defaults = { arn = "arn:aws:logs:eu-central-1:123456789012:log-group:/aws/lambda/jadwigo-runner-probe-dev" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/jadwigo-runner-probe-dev" }
  }
  mock_resource "aws_lambda_function" {
    defaults = { arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-runner-probe-dev", version = "1" }
  }
  mock_resource "aws_lambda_alias" {
    defaults = { arn = "arn:aws:lambda:eu-central-1:123456789012:function:jadwigo-runner-prod:live" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
}

run "the_probe_runner" {
  command = plan

  module {
    source = "./modules/runner"
  }

  variables {
    environment          = "dev"
    name                 = "runner-probe"
    handler              = "probe-lambda.handler"
    reserved_concurrency = 1
  }

  assert {
    condition     = aws_lambda_function.runner.function_name == "jadwigo-runner-probe-dev"
    error_message = "the function is jadwigo-<name>-<environment>"
  }

  assert {
    condition     = aws_lambda_function.runner.runtime == "nodejs24.x" && aws_lambda_function.runner.architectures == tolist(["arm64"])
    error_message = "the runner runs on the api's runtime, Node 24 on arm64, so one bundle command serves both"
  }

  assert {
    condition     = aws_lambda_alias.live.name == "live"
    error_message = "callers invoke the live alias, never $LATEST"
  }

  assert {
    condition     = aws_lambda_function.runner.environment[0].variables == tomap({ JADWIGO_RUNNER_DB_URL_PARAM = "/jadwigo/dev/runner-probe-database-url" })
    error_message = "the environment names the database URL's parameter and holds no secret"
  }

  assert {
    condition     = aws_ssm_parameter.database_url.type == "SecureString"
    error_message = "the database URL is a SecureString"
  }

  assert {
    condition     = length(aws_ssm_parameter.secret) == 0
    error_message = "the probe reads no Muse key: its model is scripted"
  }
}

run "the_step_host_reads_its_muse_key" {
  command = plan

  module {
    source = "./modules/runner"
  }

  variables {
    environment   = "prod"
    handler       = "index.handler"
    secret_params = ["muse-api-key"]
    schedule      = true
  }

  assert {
    condition     = aws_ssm_parameter.secret["muse-api-key"].name == "/jadwigo/prod/muse-api-key"
    error_message = "a secret is a SecureString under /jadwigo/<env>/, which the role alone reads"
  }

  assert {
    condition     = aws_scheduler_schedule.drain[0].schedule_expression == "rate(1 minute)" && aws_scheduler_schedule.drain[0].target[0].input == "{}"
    error_message = "the host's schedule drains every minute with an empty event"
  }

  assert {
    condition     = aws_scheduler_schedule.drain[0].state == "DISABLED"
    error_message = "the schedule is created disabled, so it never invokes the placeholder before the first deploy"
  }

  assert {
    condition     = aws_lambda_function_event_invoke_config.live.maximum_retry_attempts == 0
    error_message = "an async poke is never retried: the step waits in agent_step for the next drain"
  }
}

run "the_probe_has_no_schedule" {
  command = plan

  module {
    source = "./modules/runner"
  }

  variables {
    environment = "dev"
    name        = "runner-probe"
    handler     = "probe-lambda.handler"
  }

  assert {
    condition     = length(aws_scheduler_schedule.drain) == 0 && length(aws_iam_role.schedule) == 0
    error_message = "the probe is invoked by its script only"
  }
}
