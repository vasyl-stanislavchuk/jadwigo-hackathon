variable "bucket_name" {
  description = "The uploads bucket, jadwigo-uploads-<env>-<acct>: a parent's photos, apart from the bank's content bucket"
  type        = string
}

variable "allowed_origins" {
  description = "The app origins a browser may POST an upload form from (https://app.<apex>); CORS allows nothing else"
  type        = list(string)

  validation {
    condition     = length(var.allowed_origins) > 0 && alltrue([for o in var.allowed_origins : startswith(o, "https://")])
    error_message = "allowed_origins names at least one origin, each https://."
  }
}

variable "pending_days" {
  description = "Days an upload no message carried stays under pending/ before S3 deletes it"
  type        = number
  default     = 1
}

variable "bucket_param" {
  description = "The SSM String parameter that carries the bucket's name to apps/api when UPLOADS_BUCKET is unset"
  type        = string
  default     = "/jadwigo/uploads/bucket"
}
