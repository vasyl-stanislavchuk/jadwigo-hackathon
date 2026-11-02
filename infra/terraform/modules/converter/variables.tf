variable "environment" {
  description = "The environment, as packages/config names it"
  type        = string
}

variable "uploads_bucket_name" {
  description = "The uploads bucket (modules/uploads) whose attachments it reads and whose pages it writes"
  type        = string

  validation {
    condition     = var.uploads_bucket_name != ""
    error_message = "the converter needs the uploads bucket"
  }
}

variable "image_tag" {
  description = "The ECR tag `make -C apps/converter push` printed. Blank: the repo only, no function, so the first apply needs no image"
  type        = string
  default     = ""
}

variable "memory_size" {
  description = "MB; CPU scales with it, and LibreOffice's start is CPU-bound"
  type        = number
  default     = 2048
}

variable "timeout" {
  description = "Seconds one conversion may take: soffice's 75 s, then pdftoppm and the re-encode"
  type        = number
  default     = 120

  validation {
    condition     = var.timeout <= 120
    error_message = "at most 120 s, inside the runner's 300 s drain"
  }
}

variable "ephemeral_storage" {
  description = "MB of /tmp for the source, LibreOffice's profile and the rendered pages"
  type        = number
  default     = 2048
}

variable "log_retention_days" {
  description = "Days CloudWatch keeps the logs, which carry ids, kinds, counts and outcomes only"
  type        = number
  default     = 14
}
