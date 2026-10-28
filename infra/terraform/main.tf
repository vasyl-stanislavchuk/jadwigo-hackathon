# The marketing site at the apex, apart from the app at app.<domain>
# (david-learns/decisions/2026-10-24-each-domain-has-a-marketing-site-at-its-apex-and-the-service-at).
# jadwigo.pl only for the hackathon
# (jadwigo-marketing/decisions/2026-10-27-for-the-hackathon-jadwigo-is-jadwigo-pl-only-in-polish-with-no-e).
module "site" {
  source = "./modules/site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.site_domain
  bucket_name = "jadwigo-site-${var.environment}-843109108289"
}

# The service at app.<apex>: apps/web, and /api/* to the one Lambda (dl-5ssh.3.3).
module "app" {
  source = "./modules/app"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.app_domain
  zone_name   = var.site_domain
  environment = var.environment
  bucket_name = "jadwigo-app-${var.environment}-843109108289"

  # ROUTES in packages/contracts/src/routes.ts whose auth is "none", as "<METHOD> <path>".
  # tools/src/check-infra-routes.ts (make check, CI's lint job) fails on a ROUTES entry missing
  # here or in token_routes.
  routes = [
    "GET /api/health",
    "GET /api/v1/featured-lessons",
    "POST /api/v1/assignments/{id}/attempts",
    "GET /api/v1/attempts/{id}",
    "PATCH /api/v1/attempts/{id}",
    "POST /api/v1/attempts/{id}/answers",
    "POST /api/v1/attempts/{id}/questions/{seq}/help",
    "GET /api/v1/attempts/{id}/results",
  ]

  # ROUTES entries whose auth is "token" (dl-e8ov.2.36): only these carry the JWT authorizer.
  token_routes = [
    "GET /api/v1/me",
    "POST /api/v1/accounts",
    "POST /api/v1/learners",
    "POST /api/v1/attempts/{id}/claims",
    "GET /api/v1/learners/{id}/attempts",
  ]

  jwt_issuer = "https://${var.supabase_ref}.supabase.co/auth/v1"
}
