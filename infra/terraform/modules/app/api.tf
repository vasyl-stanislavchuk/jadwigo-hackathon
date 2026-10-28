# The one Lambda (apps/api, `index.handler` in the bundle `make api-bundle` writes) behind an HTTP
# API. Its code ships only through `make -C infra api-deploy`: Terraform creates the function on a
# placeholder and never touches its code again, so a plan needs no build.
locals {
  name          = "jadwigo-api-${var.environment}"
  health        = "GET /api/health"
  all_routes    = concat(var.routes, var.token_routes, ["$default"])
  throttled     = setsubtract(local.all_routes, [local.health])
  db_url_param  = "/jadwigo/${var.environment}/database-url"
  log_retention = var.log_retention_days
}

data "archive_file" "placeholder" {
  type                    = "zip"
  output_path             = "${path.root}/.terraform/app-placeholder.zip"
  source_content_filename = "index.mjs"
  source_content          = "export const handler = async () => ({ statusCode: 503, body: \"not deployed yet: make -C infra api-deploy\" });\n"
}

# The database URL, jadwigo_api's transaction pooler URL (port 6543). Terraform writes only a
# placeholder, once, through the write-only argument, so no value is ever in a tfvars file or in
# state. The owner sets the real one with `aws ssm put-parameter --overwrite` (infra/README.md).
resource "aws_ssm_parameter" "database_url" {
  name             = local.db_url_param
  description      = "DATABASE_URL for ${local.name}: set by the owner, never by Terraform"
  type             = "SecureString"
  value_wo         = "set-by-owner"
  value_wo_version = 1
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = local.log_retention
}

resource "aws_cloudwatch_log_group" "access" {
  name              = "/aws/apigateway/${local.name}"
  retention_in_days = local.log_retention
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

resource "aws_iam_role" "api" {
  name               = local.name
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Its own log group and the one parameter, nothing else. The aws/ssm key's policy lets the
# account's principals decrypt through SSM, so no KMS statement is needed.
data "aws_iam_policy_document" "api" {
  statement {
    sid       = "WritesItsLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.api.arn}:*"]
  }

  statement {
    sid       = "ReadsTheDatabaseUrl"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.database_url.arn]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = local.name
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

# No reserved or provisioned concurrency: the account's quota is 10 while the raise is open.
resource "aws_lambda_function" "api" {
  function_name    = local.name
  role             = aws_iam_role.api.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "index.handler"
  memory_size      = 256
  timeout          = 10
  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  environment {
    variables = {
      JADWIGO_DB_URL_PARAM = aws_ssm_parameter.database_url.name
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.api.name
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }

  depends_on = [aws_iam_role_policy.api]
}

resource "aws_apigatewayv2_api" "api" {
  name          = local.name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 10000
}

# Supabase Auth's access tokens, verified at the gateway against the project's JWKS (RS256 only:
# jadwigo-platform/decisions/2026-10-27-jadwigo-s-supabase-projects-are-recreated-in-frankfurt-and-sign).
# A missing, expired or foreign token is answered 401 before the Lambda runs; apps/api authorizes
# the verified caller against its member rows.
resource "aws_apigatewayv2_authorizer" "supabase" {
  api_id           = aws_apigatewayv2_api.api.id
  name             = "supabase"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    issuer   = var.jwt_issuer
    audience = [var.jwt_audience]
  }
}

# One route per ROUTES entry, so each carries its own throttle; $default sends the rest to the
# router, which answers NotFound. Only the token routes carry the authorizer.
resource "aws_apigatewayv2_route" "api" {
  for_each = toset(local.all_routes)

  api_id             = aws_apigatewayv2_api.api.id
  route_key          = each.key
  target             = "integrations/${aws_apigatewayv2_integration.api.id}"
  authorization_type = contains(var.token_routes, each.key) ? "JWT" : "NONE"
  authorizer_id      = contains(var.token_routes, each.key) ? aws_apigatewayv2_authorizer.supabase.id : null
}

resource "aws_apigatewayv2_stage" "api" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.stage_throttle.rate
    throttling_burst_limit = var.stage_throttle.burst
  }

  dynamic "route_settings" {
    for_each = local.throttled
    content {
      route_key              = route_settings.value
      throttling_rate_limit  = var.route_throttle.rate
      throttling_burst_limit = var.route_throttle.burst
    }
  }

  # Ids and outcomes only: no body, no query string.
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.access.arn
    format = jsonencode({
      requestId = "$context.requestId"
      routeKey  = "$context.routeKey"
      status    = "$context.status"
      latency   = "$context.responseLatency"
      error     = "$context.integrationErrorMessage"
      time      = "$context.requestTime"
    })
  }

  depends_on = [aws_apigatewayv2_route.api]
}

resource "aws_lambda_permission" "api" {
  statement_id  = "HttpApiInvokes"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
