variable "domain_name" {
  description = "The custom domain Supabase Auth answers on, for example auth.jadwigo.pl"
  type        = string
}

variable "zone_name" {
  description = "The Route 53 zone in this account that holds domain_name"
  type        = string
}

variable "supabase_ref" {
  description = "The Supabase project the domain points at: its CNAME target is <ref>.supabase.co"
  type        = string
}

variable "txt_records" {
  description = "The TXT records Supabase asks for once the domain is created, name => value (infra/supabase-auth/domain.sh status prints them). Empty until then"
  type        = map(string)
  default     = {}

  validation {
    condition     = alltrue([for name in keys(var.txt_records) : endswith(name, ".${var.domain_name}")])
    error_message = "Every TXT record sits under domain_name, as Supabase names them (_cf-custom-hostname.<domain>, _acme-challenge.<domain>)."
  }
}
