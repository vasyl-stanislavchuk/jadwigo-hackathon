variable "domain_name" {
  description = "The host the app answers on, app.<apex> (packages/config hosts.<env>.app)"
  type        = string
}

variable "zone_name" {
  description = "The Route 53 zone the host sits in, the apex"
  type        = string
}

variable "environment" {
  description = "The environment, as packages/config names it; part of every name here"
  type        = string
}

variable "bucket_name" {
  description = "Private origin bucket for apps/web's build, read only by this distribution"
  type        = string
}

variable "log_retention_days" {
  description = "How long the function's and the stage's logs are kept (jadwigo-platform/decisions/2026-10-26-the-service-keeps-its-logs-for-90-days)"
  type        = number
  default     = 90
}

variable "routes" {
  description = "The login-free route keys, ROUTES entries whose auth is none (packages/contracts/src/routes.ts). $default catches the rest"
  type        = list(string)
}

variable "token_routes" {
  description = "The route keys a signed-in adult calls, ROUTES entries whose auth is token: the JWT authorizer guards these and no others"
  type        = list(string)
  default     = []
}

variable "jwt_issuer" {
  description = "The Supabase project's Auth issuer, https://<ref>.supabase.co/auth/v1, signing with RS256"
  type        = string
}

variable "jwt_audience" {
  description = "The aud claim Supabase puts in a signed-in user's access token"
  type        = string
  default     = "authenticated"
}

variable "route_throttle" {
  description = "Per-route limit on every route but health (jadwigo-platform/decisions/2026-10-28-the-app-s-http-api-stage-throttles-every-route-but-health-at-10)"
  type        = object({ rate = number, burst = number })
  default     = { rate = 10, burst = 20 }
}

variable "stage_throttle" {
  description = "The stage default, which health keeps (docs/research/serverless-api-and-permissions.md section 4)"
  type        = object({ rate = number, burst = number })
  default     = { rate = 50, burst = 100 }
}
