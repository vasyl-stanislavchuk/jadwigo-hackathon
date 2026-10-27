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
  index_html  = "${path.root}/../../apps/site/placeholder/index.html"
}
