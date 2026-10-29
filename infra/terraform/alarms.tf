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
}

variable "alarm_email" {
  description = "Where alarms are mailed: the owner's address, from owner.auto.tfvars. null: no subscription"
  type        = string
  default     = null
  sensitive   = true
}

output "alarm_topic_arn" {
  value = module.alarms.topic_arn
}
