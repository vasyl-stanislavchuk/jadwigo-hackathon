# The engine's step host as its own Lambda (dl-z5ja.5 probe, dl-z5ja.20): apps/runner's bundle,
# which drains pgmq's agent_step through runStep as jadwigo_runner. Its own release target, apart
# from the api (posthog-ai-production.md section 1): Terraform creates the function on a placeholder
# and never touches its code again. A release uploads the zip, publishes a version and moves the
# `live` alias to it; rollback points `live` back at the version before. Nothing here invokes it:
# the api's async invoke (dl-z5ja.20) and the owner's probe script do.
locals {
  name         = "jadwigo-${var.name}-${var.environment}"
  db_url_param = "/jadwigo/${var.environment}/${var.name}-database-url"
}

data "archive_file" "placeholder" {
  type                    = "zip"
  output_path             = "${path.root}/.terraform/${local.name}-placeholder.zip"
  source_content_filename = "placeholder.mjs"
  source_content          = "export const handler = async () => { throw new Error(\"not deployed yet\"); };\n"
}

# The database URL: a login in jadwigo_runner through the transaction pooler (port 6543). Terraform
# writes only a placeholder, once, through the write-only argument, so no value is ever in a tfvars
# file or in state. The owner's script overwrites it.
resource "aws_ssm_parameter" "database_url" {
  name             = local.db_url_param
  description      = "DATABASE_URL for ${local.name} (jadwigo_runner): set by the owner, never by Terraform"
  type             = "SecureString"
  value_wo         = "set-by-owner"
  value_wo_version = 1
}

resource "aws_ssm_parameter" "secret" {
  for_each = var.secret_params

  name             = "/jadwigo/${var.environment}/${each.key}"
  description      = "${each.key} for ${local.name}: set by the owner, never by Terraform"
  type             = "SecureString"
  value_wo         = "set-by-owner"
  value_wo_version = 1
}

resource "aws_cloudwatch_log_group" "runner" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "runner" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Its own log group and its own parameters, nothing else: no S3, no other Lambda, no KMS statement
# (the aws/ssm key lets the account's principals decrypt through SSM).
data "aws_iam_policy_document" "runner" {
  statement {
    sid       = "WritesItsLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.runner.arn}:*"]
  }

  statement {
    sid       = "ReadsItsParameters"
    actions   = ["ssm:GetParameter"]
    resources = concat([aws_ssm_parameter.database_url.arn], [for p in aws_ssm_parameter.secret : p.arn])
  }
}

resource "aws_iam_role_policy" "runner" {
  name   = local.name
  role   = aws_iam_role.runner.id
  policy = data.aws_iam_policy_document.runner.json
}

resource "aws_lambda_function" "runner" {
  function_name    = local.name
  role             = aws_iam_role.runner.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = var.handler
  memory_size      = var.memory_size
  timeout          = var.timeout
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256
  publish          = true

  reserved_concurrent_executions = var.reserved_concurrency

  environment {
    variables = merge(var.environment_variables, {
      JADWIGO_RUNNER_DB_URL_PARAM = aws_ssm_parameter.database_url.name
    })
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.runner.name
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash, publish]
  }

  depends_on = [aws_iam_role_policy.runner]
}

# What callers invoke: never $LATEST. A release moves it, so Terraform leaves its version alone.
resource "aws_lambda_alias" "live" {
  name             = "live"
  function_name    = aws_lambda_function.runner.function_name
  function_version = aws_lambda_function.runner.version

  lifecycle {
    ignore_changes = [function_version]
  }
}

# The api's poke is fire-and-forget: a failed or lost one costs nothing, since the step waits in
# agent_step for the next drain. So Lambda retries no async invoke, and drops one older than a minute,
# when the schedule's next drain is due anyway.
resource "aws_lambda_function_event_invoke_config" "live" {
  function_name                = aws_lambda_function.runner.function_name
  qualifier                    = aws_lambda_alias.live.name
  maximum_retry_attempts       = 0
  maximum_event_age_in_seconds = 60
}

data "aws_iam_policy_document" "scheduler_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "schedule" {
  count = var.schedule ? 1 : 0

  name               = "${local.name}-schedule"
  assume_role_policy = data.aws_iam_policy_document.scheduler_assume.json
}

# The schedule may invoke the live alias and nothing else.
data "aws_iam_policy_document" "schedule" {
  statement {
    sid       = "InvokesTheLiveAlias"
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_alias.live.arn]
  }
}

resource "aws_iam_role_policy" "schedule" {
  count = var.schedule ? 1 : 0

  name   = "${local.name}-schedule"
  role   = aws_iam_role.schedule[0].id
  policy = data.aws_iam_policy_document.schedule.json
}

# Every minute, the finest EventBridge Scheduler goes. A drain that finds nothing visible ends at
# once, so an idle minute costs one short invoke and two pooled connections.
resource "aws_scheduler_schedule" "drain" {
  count = var.schedule ? 1 : 0

  name                = "${local.name}-drain"
  schedule_expression = "rate(1 minute)"
  state               = var.schedule_enabled ? "ENABLED" : "DISABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = aws_lambda_alias.live.arn
    role_arn = aws_iam_role.schedule[0].arn
    input    = "{}"

    retry_policy {
      maximum_retry_attempts = 0
    }
  }
}
