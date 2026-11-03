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

variable "log_retention_days" {
  description = "Days CloudWatch keeps the logs, which carry ids, counts, times and outcomes only"
  type        = number
  default     = 14
}
