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

  # ROUTES in packages/contracts/src/routes.ts, as "<METHOD> <path>". tools/src/check-infra-routes.ts
  # (make check, CI's lint job) fails when the two differ.
  routes = [
    "GET /api/health",
    "GET /api/v1/featured-lessons",
    "GET /api/v1/playground-examples/{language}",
    "POST /api/v1/assignments/{id}/attempts",
    "GET /api/v1/attempts/{id}",
    "PATCH /api/v1/attempts/{id}",
    "POST /api/v1/attempts/{id}/answers",
    "POST /api/v1/attempts/{id}/questions/{seq}/help",
    "GET /api/v1/attempts/{id}/results",
    # Lesson review (dl-uukj.30): a finished attempt's questions again, for the child.
    "GET /api/v1/attempts/{id}/review",
    "POST /api/v1/question-searches",
    # Parent login (dl-e8ov.2.36): these 5 need a token. The JWT authorizer on them is
    # dl-e8ov.2.42; apply them only together with it, never alone.
    "GET /api/v1/me",
    "POST /api/v1/accounts",
    "POST /api/v1/learners",
    "POST /api/v1/attempts/{id}/claims",
    "GET /api/v1/learners/{id}/attempts",
    # Lesson review (dl-uukj.30): the parent's, with every try; a token route.
    "GET /api/v1/learners/{id}/attempts/{attempt}/review",
  ]

  # The routes above whose ROUTES auth is "token": only these carry the JWT authorizer
  # (dl-e8ov.2.42). tools/src/check-infra-routes.ts fails when the two lists differ.
  token_routes = [
    "GET /api/v1/me",
    "POST /api/v1/accounts",
    "POST /api/v1/learners",
    "POST /api/v1/attempts/{id}/claims",
    "GET /api/v1/learners/{id}/attempts",
    "GET /api/v1/learners/{id}/attempts/{attempt}/review",
  ]

  jwt_issuer = "https://${var.supabase_ref}.supabase.co/auth/v1"

  reserved_concurrency = var.app_reserved_concurrency
}
