variable "environment" {
  description = "The environment this root is applied for, as packages/config names it"
  type        = string
}

variable "aws_region" {
  description = "Region for buckets and state. Viewers reach the CloudFront edge"
  type        = string
  default     = "eu-central-1"
}

variable "site_domain" {
  description = "The apex the marketing site answers on (packages/config hosts.<env>.site)"
  type        = string
}

variable "app_domain" {
  description = "The host the service answers on (packages/config hosts.<env>.app)"
  type        = string
}

variable "docs_domain" {
  description = "The host the docs answer on (packages/config hosts.<env>.docs), in site_domain's zone"
  type        = string
}

variable "supabase_ref" {
  description = "The environment's Supabase project ref; its Auth issues the tokens the JWT authorizer verifies"
  type        = string
}

variable "app_reserved_concurrency" {
  description = "The app Lambda's reserved concurrency, set per environment below its Supabase pooler's client limit (dl-5ssh.75)"
  type        = number
}

variable "runner_muse_cap_usd" {
  description = "USD the step host's Muse lane may spend per cold start before GuardedMuse refuses (dl-z5ja.20); each run's own cap_usd holds per turn"
  type        = string
  default     = "1"
}

variable "runner_muse_private_model" {
  description = "The no-training tier's model the step host calls (dl-z5ja.3 names it). Blank until then, and every private-tier call is refused before anything is sent"
  type        = string
  default     = ""
}
