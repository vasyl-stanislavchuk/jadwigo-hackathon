variable "domain" {
  description = "The apex Workspace takes mail for"
  type        = string
}

variable "zone_id" {
  description = "The apex's Route 53 zone"
  type        = string
}

variable "site_verification" {
  description = "The google-site-verification token for the apex TXT; null for none yet"
  type        = string
  default     = null
}

variable "mx" {
  description = "Whether Workspace takes the apex's mail: its MX, and its SPF in the apex TXT"
  type        = bool
  default     = false
}

variable "dkim" {
  description = "The google._domainkey TXT value from the admin console, whole; null for none yet"
  type        = string
  default     = null

  validation {
    condition     = var.dkim == null || startswith(coalesce(var.dkim, "-"), "v=DKIM1;")
    error_message = "dkim is the whole TXT value from the admin console, starting v=DKIM1;"
  }
}
