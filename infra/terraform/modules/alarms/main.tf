# Six alarms and one topic, no dashboards (dl-5ssh.13). Standard-resolution metrics AWS publishes
# anyway, so nothing costs while idle beyond the alarms themselves. The log groups are modules/app's.
resource "aws_sns_topic" "alarms" {
  name = "${var.name}-alarms"
}

# Pending until the owner clicks the link in AWS's first mail; an alarm before that mails no one.
# With no address (a plan in CI or another checkout) there is no subscription, and the topic and
# alarms are planned all the same.
resource "aws_sns_topic_subscription" "owner" {
  count = var.alarm_email == null ? 0 : 1

  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

locals {
  concurrency_alarm_at = floor(0.8 * var.lambda_concurrency_quota)

  lambda = { FunctionName = var.function_name }
  api    = { ApiId = var.api_id, Stage = "$default" }

  alarms = {
    "api-errors" = {
      description = "The Lambda threw or timed out"
      namespace   = "AWS/Lambda"
      metric      = "Errors"
      dimensions  = local.lambda
      statistic   = "Sum"
      threshold   = 1
    }
    "api-throttles" = {
      description = "The Lambda was refused for concurrency"
      namespace   = "AWS/Lambda"
      metric      = "Throttles"
      dimensions  = local.lambda
      statistic   = "Sum"
      threshold   = 1
    }
    "api-5xx" = {
      description = "The HTTP API answered 5xx: the Lambda failed, timed out, or is still the placeholder"
      namespace   = "AWS/ApiGateway"
      metric      = "5xx"
      dimensions  = local.api
      statistic   = "Sum"
      threshold   = 1
    }
    "lambda-concurrency" = {
      description = "Account-wide concurrent executions near the quota"
      namespace   = "AWS/Lambda"
      metric      = "ConcurrentExecutions"
      dimensions  = {}
      statistic   = "Maximum"
      threshold   = local.concurrency_alarm_at
    }
    "ses-bounce-rate" = {
      description = "SES account bounce rate near the level where SES reviews the account"
      namespace   = "AWS/SES"
      metric      = "Reputation.BounceRate"
      dimensions  = {}
      statistic   = "Maximum"
      threshold   = var.ses_bounce_rate
    }
    "ses-complaint-rate" = {
      description = "SES account complaint rate near the level where SES reviews the account"
      namespace   = "AWS/SES"
      metric      = "Reputation.ComplaintRate"
      dimensions  = {}
      statistic   = "Maximum"
      threshold   = var.ses_complaint_rate
    }
  }
}

# Five-minute periods; one breaching period alarms, and no data is not a breach.
resource "aws_cloudwatch_metric_alarm" "this" {
  for_each = local.alarms

  alarm_name          = "${var.name}-${each.key}"
  alarm_description   = each.value.description
  namespace           = each.value.namespace
  metric_name         = each.value.metric
  dimensions          = each.value.dimensions
  statistic           = each.value.statistic
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = each.value.threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
}
