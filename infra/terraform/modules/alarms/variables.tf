variable "name" {
  description = "Prefix for the topic and every alarm, jadwigo-<env>"
  type        = string
}

variable "alarm_email" {
  description = "The address the topic mails. The owner confirms the subscription from the first message. null: no subscription"
  type        = string
  default     = null
  sensitive   = true

  validation {
    condition     = var.alarm_email == null || can(regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", var.alarm_email))
    error_message = "alarm_email is an address or null; an empty string would fail only at apply."
  }
}

variable "function_name" {
  description = "The one Lambda (modules/app)"
  type        = string
}

variable "function_reserved_concurrency" {
  description = "The Lambda's reserved concurrency (modules/app). Its own alarm fires at 80% of it"
  type        = number
}

variable "api_id" {
  description = "The HTTP API in front of it (modules/app)"
  type        = string
}

variable "lambda_concurrency_quota" {
  description = "The account's Lambda concurrent executions quota (Service Quotas L-B99A9384): 1000 since 2026-10-28, case 179318942100525. The alarm fires at 80% of it"
  type        = number
  default     = 1000

  validation {
    condition     = var.lambda_concurrency_quota >= 1
    error_message = "lambda_concurrency_quota is the account's quota, at least 1."
  }
}

variable "ses_bounce_rate" {
  description = "SES account bounce rate that raises the alarm. SES reviews an account at 5% and can pause it at 10%"
  type        = number
  default     = 0.05
}

variable "ses_complaint_rate" {
  description = "SES account complaint rate that raises the alarm. SES reviews an account at 0.1% and can pause it at 0.5%"
  type        = number
  default     = 0.001
}
