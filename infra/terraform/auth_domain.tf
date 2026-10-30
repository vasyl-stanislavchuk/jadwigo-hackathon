# Prod's Supabase Auth on auth.jadwigo.pl, so a parent's Google or Facebook consent names Jadwigo's own
# host and not <ref>.supabase.co (dl-e8ov.2.65,
# jadwigo-platform/decisions/2026-10-30-prod-supabase-auth-runs-on-the-custom-domain-auth-jadwigo-pl-so).
# The CNAME goes first; Supabase then names its TXT records, which go in auth_domain_txt. The paid
# add-on, the verification and the activation are the owner's (docs/runbooks/social-sign-in.md).
module "auth_domain" {
  source = "./modules/auth_domain"
  count  = var.auth_domain == null ? 0 : 1

  domain_name  = var.auth_domain
  zone_name    = var.site_domain
  supabase_ref = var.supabase_ref
  txt_records  = var.auth_domain_txt
}

variable "auth_domain" {
  description = "The custom domain the environment's Supabase Auth answers on, in site_domain's zone; null for none"
  type        = string
  default     = null
}

variable "auth_domain_txt" {
  description = "The TXT records Supabase asks for after the domain is created, name => value (infra/supabase-auth/domain.sh status)"
  type        = map(string)
  default     = {}
}
