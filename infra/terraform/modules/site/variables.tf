variable "domain_name" {
  description = "The apex the site answers on. www.<apex> redirects to it"
  type        = string
}

variable "bucket_name" {
  description = "Private origin bucket, read only by this distribution"
  type        = string
}
