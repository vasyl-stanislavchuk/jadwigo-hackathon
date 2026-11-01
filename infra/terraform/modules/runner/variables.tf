variable "environment" {
  description = "The environment, as packages/config names it: dev for the probe, prod once dl-z5ja.20 ships"
  type        = string
}

variable "name" {
  description = "The function's name after jadwigo-: runner for the step host, runner-probe for dl-z5ja.5"
  type        = string
  default     = "runner"
}

variable "handler" {
  description = "<file>.<export> in the zip apps/runner's bundle makes: probe-lambda.handler, or index.handler"
  type        = string
}

variable "timeout" {
  description = "Seconds one invocation may run: one drain of agent_step, at most MAX_STEPS steps"
  type        = number
  default     = 300
}

variable "memory_size" {
  description = "MB; CPU scales with it, and lesson_check is the CPU-heavy verb"
  type        = number
  default     = 512
}

variable "reserved_concurrency" {
  description = "Caps the function below the Supabase pooler's client limit: each instance holds 2 pooled connections (the store's and the queue's)"
  type        = number
  default     = 5
}

variable "log_retention_days" {
  description = "Days CloudWatch keeps the function's logs, which carry ids and outcomes only"
  type        = number
  default     = 14
}

variable "environment_variables" {
  description = "More settings for the function, never a secret: a secret is an SSM SecureString it reads by name"
  type        = map(string)
  default     = {}
}

variable "secret_params" {
  description = "Names after /jadwigo/<env>/ of more SecureStrings the function reads, each written once as a placeholder the owner overwrites (muse-api-key for dl-z5ja.20)"
  type        = set(string)
  default     = []
}

variable "schedule" {
  description = "Invoke live every minute with {}: the safety net for a lost api invoke, and what drains the steps the pg_cron sweep enqueues. Off for the probe"
  type        = bool
  default     = false
}

variable "schedule_enabled" {
  description = "Whether the schedule runs. Off by default: until the first runner-deploy ships code, it would invoke a placeholder that throws once a minute. The owner flips it after that deploy"
  type        = bool
  default     = false
}

variable "uploads_bucket_name" {
  description = "The uploads bucket whose pods/*/attachments/* the step host reads a message's photos from (dl-z5ja.11.2); blank for the probe, which reads none"
  type        = string
  default     = ""
}
