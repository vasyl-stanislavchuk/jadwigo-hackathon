# modules/site with the marketing site's inputs and with the docs', planned against mock providers, so
# no AWS and no credentials. The first run pins every value jadwigo.pl's edge had before the module grew
# zone_name, include_www and purpose (dl-5ssh.90.11): an edit to modules/site that changes them fails
# here before a plan could show it on the live site (dl-5ssh.90.17). `make -C infra test` runs it.

# The mocks invent every computed value. These are the ones a resource validates as an ARN or reads at
# plan time.
mock_provider "aws" {
  override_during = plan

  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/test" }
  }
  mock_resource "aws_cloudfront_function" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:function/test" }
  }
  mock_resource "aws_cloudfront_distribution" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:distribution/TEST", domain_name = "d1.cloudfront.net", hosted_zone_id = "Z2FDTNDATAQYW2" }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::test" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
}

mock_provider "aws" {
  alias           = "us_east_1"
  override_during = plan

  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/test" }
  }
}

run "site_keeps_jadwigo_pl" {
  command = plan

  module {
    source = "./modules/site"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  variables {
    domain_name = "jadwigo.pl"
    bucket_name = "jadwigo-site-prod-843109108289"
  }

  # AWS fills the validation options at plan time from the names; a mock does not, so they are given.
  override_resource {
    target          = aws_acm_certificate.this
    override_during = plan
    values = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/test"
      domain_validation_options = [
        { domain_name = "jadwigo.pl", resource_record_name = "_a.jadwigo.pl.", resource_record_type = "CNAME", resource_record_value = "_a.acm-validations.aws." },
        { domain_name = "www.jadwigo.pl", resource_record_name = "_b.www.jadwigo.pl.", resource_record_type = "CNAME", resource_record_value = "_b.acm-validations.aws." },
      ]
    }
  }

  assert {
    condition     = data.aws_route53_zone.this.name == "jadwigo.pl"
    error_message = "The site's zone is ${data.aws_route53_zone.this.name}, not jadwigo.pl"
  }
  assert {
    condition     = aws_acm_certificate.this.domain_name == "jadwigo.pl" && jsonencode(aws_acm_certificate.this.subject_alternative_names) == jsonencode(["www.jadwigo.pl"])
    error_message = "The site's certificate is ${aws_acm_certificate.this.domain_name} with ${jsonencode(aws_acm_certificate.this.subject_alternative_names)}"
  }
  assert {
    condition     = jsonencode(sort(tolist(aws_cloudfront_distribution.site.aliases))) == jsonencode(["jadwigo.pl", "www.jadwigo.pl"])
    error_message = "The site's aliases are ${jsonencode(aws_cloudfront_distribution.site.aliases)}"
  }
  assert {
    condition     = aws_cloudfront_distribution.site.comment == "jadwigo.pl marketing site"
    error_message = "The site's comment is ${aws_cloudfront_distribution.site.comment}"
  }
  assert {
    condition     = aws_cloudfront_function.edge.name == "jadwigo-pl-edge"
    error_message = "The site's edge function is ${aws_cloudfront_function.edge.name}"
  }
  assert {
    condition     = startswith(aws_cloudfront_function.edge.code, "const apex = \"jadwigo.pl\";\n")
    error_message = "The site's edge function no longer starts by naming jadwigo.pl as its apex"
  }
  assert {
    condition     = aws_cloudfront_origin_access_control.site.name == "jadwigo-site-prod-843109108289"
    error_message = "The site's origin access control is ${aws_cloudfront_origin_access_control.site.name}"
  }
  assert {
    condition     = jsonencode(sort(keys(aws_route53_record.alias))) == jsonencode(["jadwigo.pl|A", "jadwigo.pl|AAAA", "www.jadwigo.pl|A", "www.jadwigo.pl|AAAA"])
    error_message = "The site's alias records are ${jsonencode(sort(keys(aws_route53_record.alias)))}"
  }
  assert {
    condition     = jsonencode(sort(keys(aws_route53_record.validation))) == jsonencode(["jadwigo.pl", "www.jadwigo.pl"])
    error_message = "The site's validation records are ${jsonencode(sort(keys(aws_route53_record.validation)))}"
  }
}

run "docs_at_docs_jadwigo_pl" {
  command = plan

  module {
    source = "./modules/site"
  }

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  variables {
    domain_name = "docs.jadwigo.pl"
    zone_name   = "jadwigo.pl"
    include_www = false
    purpose     = "docs"
    bucket_name = "jadwigo-docs-prod-843109108289"
  }

  override_resource {
    target          = aws_acm_certificate.this
    override_during = plan
    values = {
      arn = "arn:aws:acm:us-east-1:123456789012:certificate/test"
      domain_validation_options = [
        { domain_name = "docs.jadwigo.pl", resource_record_name = "_c.docs.jadwigo.pl.", resource_record_type = "CNAME", resource_record_value = "_c.acm-validations.aws." },
      ]
    }
  }

  assert {
    condition     = data.aws_route53_zone.this.name == "jadwigo.pl"
    error_message = "The docs' zone is ${data.aws_route53_zone.this.name}, not jadwigo.pl"
  }
  assert {
    condition     = aws_acm_certificate.this.domain_name == "docs.jadwigo.pl" && length(coalesce(aws_acm_certificate.this.subject_alternative_names, [])) == 0
    error_message = "The docs' certificate has extra names: ${jsonencode(aws_acm_certificate.this.subject_alternative_names)}"
  }
  assert {
    condition     = jsonencode(tolist(aws_cloudfront_distribution.site.aliases)) == jsonencode(["docs.jadwigo.pl"])
    error_message = "The docs' aliases are ${jsonencode(aws_cloudfront_distribution.site.aliases)}"
  }
  assert {
    condition     = aws_cloudfront_distribution.site.comment == "docs.jadwigo.pl docs"
    error_message = "The docs' comment is ${aws_cloudfront_distribution.site.comment}"
  }
  assert {
    condition     = aws_cloudfront_function.edge.name == "docs-jadwigo-pl-edge"
    error_message = "The docs' edge function is ${aws_cloudfront_function.edge.name}"
  }
  assert {
    condition     = jsonencode(sort(keys(aws_route53_record.alias))) == jsonencode(["docs.jadwigo.pl|A", "docs.jadwigo.pl|AAAA"])
    error_message = "The docs' alias records are ${jsonencode(sort(keys(aws_route53_record.alias)))}"
  }
}
