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

# The public docs at docs.<apex>: apps/docs, a static Starlight build, in the apex's zone and with no
# www (dl-5ssh.90, jadwigo-platform/notes/2026-10-29-jadwigo-s-docs-are-a-starlight-site-at-docs-jadwigo-pl-generated).
module "docs" {
  source = "./modules/site"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.docs_domain
  zone_name   = var.site_domain
  include_www = false
  purpose     = "docs"
  bucket_name = "jadwigo-docs-${var.environment}-843109108289"
}

# The content bucket (dl-n9fr.43.2): the bank's Khan pull and the derived questions/ layer, private,
# with CloudFront over khan/media/ only
# (jadwigo-question-bank/decisions/2026-10-29-the-monorepo-s-terraform-root-creates-the-content-bucket-and-the).
module "content" {
  source = "./modules/content"
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
    "GET /api/v1/questions/{id}",
    # Parent login (dl-e8ov.2.36): these 5 need a token. The JWT authorizer on them is
    # dl-e8ov.2.42; apply them only together with it, never alone.
    "GET /api/v1/me",
    "POST /api/v1/accounts",
    "POST /api/v1/learners",
    "POST /api/v1/attempts/{id}/claims",
    "GET /api/v1/learners/{id}/attempts",
    # Lesson review (dl-uukj.30): the parent's, with every try; a token route.
    "GET /api/v1/learners/{id}/attempts/{attempt}/review",
    # The lesson overview (dl-uukj.30 wave 2): one assignment's attempts; a token route.
    "GET /api/v1/assignments/{id}/attempts",
    # The learner knowledge base (dl-e8ov.5.1): a learner's skills, goals and reports; token routes.
    "GET /api/v1/learners/{id}/skills",
    "GET /api/v1/skills",
    "GET /api/v1/learners/{id}/goals",
    "POST /api/v1/learners/{id}/goals",
    "PATCH /api/v1/learners/{id}/goals/{goal}",
    "GET /api/v1/learners/{id}/reports",
    "POST /api/v1/learners/{id}/reports",
    "PATCH /api/v1/learners/{id}/reports/{report}",
    # The AI engine's conversations (dl-z5ja.21): a parent's chat, one run per turn; token routes.
    "POST /api/v1/conversations",
    "POST /api/v1/conversations/{id}/messages",
    "GET /api/v1/conversations/{id}/runs",
    "GET /api/v1/runs/{id}/events",
    "POST /api/v1/runs/{id}/cancellations",
    # A parent's Good or Bad on a turn (dl-z5ja.110); a token route.
    "POST /api/v1/runs/{id}/ratings",
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
    "GET /api/v1/assignments/{id}/attempts",
    "GET /api/v1/learners/{id}/skills",
    "GET /api/v1/skills",
    "GET /api/v1/learners/{id}/goals",
    "POST /api/v1/learners/{id}/goals",
    "PATCH /api/v1/learners/{id}/goals/{goal}",
    "GET /api/v1/learners/{id}/reports",
    "POST /api/v1/learners/{id}/reports",
    "PATCH /api/v1/learners/{id}/reports/{report}",
    "POST /api/v1/conversations",
    "POST /api/v1/conversations/{id}/messages",
    "GET /api/v1/conversations/{id}/runs",
    "GET /api/v1/runs/{id}/events",
    "POST /api/v1/runs/{id}/cancellations",
    "POST /api/v1/runs/{id}/ratings",
  ]

  jwt_issuer = "https://${var.supabase_ref}.supabase.co/auth/v1"

  reserved_concurrency = var.app_reserved_concurrency

  # The api role reads questions/* and khan/converted/* in it (modules/app/bank.tf).
  content_bucket_name      = module.content.bucket_name
  content_bucket_param_arn = module.content.bucket_param_arn

  # The message and Stop routes poke the step host's live alias after a commit (dl-z5ja.88): the api
  # role gains lambda:InvokeFunction on that alias only.
  runner_alias_arn = module.runner.live_alias_arn
}

# The engine's step host (dl-z5ja.20): apps/runner, its own release target (`make -C infra
# runner-deploy`), apart from the api. The api pokes its live alias after each pgmq.send, and the
# schedule drains every minute behind it once enabled. Its pool holds 2 connections per instance, 10 at the
# reserved 5, inside the 50 the api's 150 leave of the pooler's 200.
module "runner" {
  source = "./modules/runner"

  environment   = var.environment
  handler       = "index.handler"
  schedule      = true
  secret_params = ["muse-api-key"]

  # Created disabled: the owner sets runner_schedule_enabled = true in prod.tfvars and applies
  # again after the first `make -C infra runner-deploy`, so it never invokes the placeholder.
  schedule_enabled = var.runner_schedule_enabled

  environment_variables = {
    JADWIGO_MUSE_KEY_PARAM     = "/jadwigo/${var.environment}/muse-api-key"
    JADWIGO_MUSE_CAP_USD       = var.runner_muse_cap_usd
    JADWIGO_MUSE_TIER          = var.runner_muse_tier
    JADWIGO_MUSE_PRIVATE_MODEL = var.runner_muse_private_model
  }
}
