variable "domain_name" {
  description = "The host the site answers on. With include_www, www.<domain_name> redirects to it"
  type        = string
}

variable "bucket_name" {
  description = "Private origin bucket, read only by this distribution"
  type        = string
}

variable "zone_name" {
  description = "The Route 53 zone for domain_name's records and certificate validation. Unset, it is domain_name"
  type        = string
  default     = null
}

variable "include_www" {
  description = "Whether www.<domain_name> joins the certificate, the aliases and the records, and redirects to domain_name"
  type        = bool
  default     = true
}

variable "purpose" {
  description = "What the site is, after the domain in the distribution's comment"
  type        = string
  default     = "marketing site"
}
