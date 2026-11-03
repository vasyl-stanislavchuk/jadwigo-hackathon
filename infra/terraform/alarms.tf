# Alarms on the service, mailed to the owner through one SNS topic (dl-5ssh.13). The address is not
# in git, as the repo is public: the owner keeps it in terraform/owner.auto.tfvars, which git ignores
# and Terraform reads by itself (infra/README.md). Without it the plan has no subscription and
# nothing else changes, so a plan in CI or another checkout runs (dl-5ssh.64).
module "alarms" {
  source = "./modules/alarms"

  name          = "jadwigo-${var.environment}"
  alarm_email   = var.alarm_email
  function_name = module.app.function_name
  api_id        = module.app.api_id

  function_reserved_concurrency = module.app.reserved_concurrency
}

# A warning, not an error: CI plans without the address. An apply from such a checkout would delete
# the owner's subscription, and this says so before it does (dl-5ssh.81).
check "alarm_email" {
  assert {
    condition     = var.alarm_email != null
    error_message = "No alarm_email (terraform/owner.auto.tfvars): an apply from here deletes the owner's alarm subscription."
  }
}

variable "alarm_email" {
  description = "Where alarms are mailed: the owner's address, from owner.auto.tfvars. null: no subscription"
  type        = string
  default     = null
  sensitive   = true
}

# How long a ready step sat with nobody on it: a run's idle time, which should stay near 0
# (dl-hin8.52). The runner logs it on every drain that ran a fresh step; a drain with none logs null,
# which this pattern skips, so a quiet system is no data, not a breach.
resource "aws_cloudwatch_log_metric_filter" "runner_step_wait" {
  name           = "jadwigo-runner-${var.environment}-step-wait"
  log_group_name = module.runner.log_group_name
  pattern        = "{ $.max_wait_s >= 0 }"

  metric_transformation {
    name      = "StepWaitSeconds"
    namespace = "Jadwigo/Runner/${var.environment}"
    value     = "$.max_wait_s"
  }
}

resource "aws_cloudwatch_metric_alarm" "runner_step_wait" {
  alarm_name          = "jadwigo-runner-${var.environment}-step-wait"
  alarm_description   = "A ready step waited over 10 s for a runner: a lost wake-up, every slot busy, or a run past the drain's limit. docs/runbooks/run-timeline.md"
  namespace           = "Jadwigo/Runner/${var.environment}"
  metric_name         = "StepWaitSeconds"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_actions       = [module.alarms.topic_arn]
  ok_actions          = [module.alarms.topic_arn]
}

output "alarm_topic_arn" {
  value = module.alarms.topic_arn
}
