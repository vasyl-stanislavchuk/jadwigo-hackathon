variable "name" {
  description = "Prefix for the topic and every alarm, jadwigo-<env>"
  type        = string
}

variable "alarm_email" {
  description = "The address the topic mails. The owner confirms the subscription from the first message"
  type        = string
  sensitive   = true
}

variable "function_name" {
  description = "The one Lambda (modules/app)"
  type        = string
}

variable "api_id" {
  description = "The HTTP API in front of it (modules/app)"
  type        = string
}

variable "concurrency_alarm_at" {
  description = "Account-wide concurrent executions that raise the alarm: 80% of the account's Lambda quota (1000 on 2026-10-28)"
  type        = number
  default     = 800
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
