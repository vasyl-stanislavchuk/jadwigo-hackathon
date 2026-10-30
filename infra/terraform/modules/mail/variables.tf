variable "domains" {
  description = "Apexes that send mail, each with its own Route 53 zone in this account"
  type        = set(string)
}

variable "mail_from_subdomain" {
  description = "The custom MAIL FROM is <this>.<apex>: the bounce address, with its own MX and SPF"
  type        = string
  default     = "mail"
}

variable "dmarc_policy" {
  description = "DMARC p= for each apex. Nothing else sends from these domains, so mail that fails DKIM and SPF is quarantined"
  type        = string
  default     = "quarantine"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.dmarc_policy)
    error_message = "dmarc_policy is none, quarantine or reject."
  }
}

variable "workspace" {
  description = "Google Workspace mail per apex, beside SES (workspace/): each record stays off until its input is set (dl-e8ov.2.71)"
  type = map(object({
    site_verification = optional(string)
    mx                = optional(bool, false)
    dkim              = optional(string)
  }))
  default = {}

  validation {
    condition     = alltrue([for d in keys(var.workspace) : contains(var.domains, d)])
    error_message = "workspace names only apexes in domains: the module looks their zones up there."
  }
}
