variable "environment" {
  description = "The environment, as packages/config names it"
  type        = string
}

variable "uploads_bucket_name" {
  description = "The uploads bucket (modules/uploads) whose pods/*/prints/ it reads sheets from and writes PDFs to"
  type        = string

  validation {
    condition     = var.uploads_bucket_name != ""
    error_message = "the print Lambda needs the uploads bucket"
  }
}

variable "image_tag" {
  description = "The ECR tag `make -C apps/print push` printed. Blank: the repo only, no function, so the first apply needs no image"
  type        = string
  default     = ""
}

variable "memory_size" {
  description = "MB; CPU scales with it, and WeasyPrint's layout is CPU-bound"
  type        = number
  default     = 1024
}

variable "timeout" {
  description = "Seconds one sheet may take: a cold start loads pango and the fonts, then two layouts"
  type        = number
  default     = 60

  validation {
    condition     = var.timeout <= 60
    error_message = "at most 60 s: the web stops polling at 45 s"
  }
}

variable "reserved_concurrency" {
  description = "Renders that may run at once (decision dl-3h2e8, dl-1eieq.8.16): anyone holding a play link may start a print, so a flood waits here. The api starts it as an async invoke, which Lambda retries when throttled, so an extra start queues rather than fails"
  type        = number
  default     = 5

  validation {
    condition     = var.reserved_concurrency >= 1
    error_message = "at least 1: 0 would stop every print"
  }
}

variable "log_retention_days" {
  description = "Days CloudWatch keeps the logs, which carry ids, counts, times and outcomes only"
  type        = number
  default     = 14
}

variable "posthog_key" {
  description = "PostHog's public project key, where this function reports errors (dl-5ssh.160). The browser holds the same key; blank reports nothing"
  type        = string
  default     = ""
}
