# modules/content's picture distribution, planned against a mock provider: no AWS and no credentials.
# The Khan origin keeps its path /khan/media as the default behaviour, so a Khan URL is unchanged; a
# second origin at the bucket root serves /alfik/media/* only, and the bucket policy lets the
# distribution read khan/media/* and alfik/media/* and no other prefix (dl-e8ov.2.98).
# `make -C infra test` runs it.

mock_provider "aws" {
  override_during = plan

  mock_resource "aws_cloudfront_distribution" {
    defaults = { arn = "arn:aws:cloudfront::123456789012:distribution/TEST", domain_name = "d1.cloudfront.net" }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::jadwigo-content-test", bucket_regional_domain_name = "jadwigo-content-test.s3.eu-central-1.amazonaws.com" }
  }
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }
}

run "media_serves_khan_and_alfik_only" {
  command = plan

  module {
    source = "./modules/content"
  }

  variables {
    bucket_name     = "jadwigo-content-test"
    bucket_param    = "/jadwigo/test/content-bucket"
    media_url_param = "/jadwigo/test/media-url"
  }

  assert {
    condition     = aws_cloudfront_distribution.media.default_cache_behavior[0].target_origin_id == "media"
    error_message = "The default behaviour no longer reads the Khan origin"
  }
  assert {
    condition     = jsonencode(sort([for o in aws_cloudfront_distribution.media.origin : "${o.origin_id}=${o.origin_path == null ? "" : o.origin_path}"])) == jsonencode(["alfik-media=", "media=/khan/media"])
    error_message = "The origins are ${jsonencode([for o in aws_cloudfront_distribution.media.origin : "${o.origin_id}=${o.origin_path == null ? "" : o.origin_path}"])}"
  }
  assert {
    condition     = length(aws_cloudfront_distribution.media.ordered_cache_behavior) == 1
    error_message = "The distribution has ${length(aws_cloudfront_distribution.media.ordered_cache_behavior)} ordered behaviours, not 1"
  }
  assert {
    condition     = aws_cloudfront_distribution.media.ordered_cache_behavior[0].path_pattern == "/alfik/media/*" && aws_cloudfront_distribution.media.ordered_cache_behavior[0].target_origin_id == "alfik-media"
    error_message = "The ordered behaviour is ${aws_cloudfront_distribution.media.ordered_cache_behavior[0].path_pattern} to ${aws_cloudfront_distribution.media.ordered_cache_behavior[0].target_origin_id}"
  }
  assert {
    condition     = jsonencode(aws_cloudfront_distribution.media.ordered_cache_behavior[0].allowed_methods) == jsonencode(["GET", "HEAD"]) || jsonencode(sort(tolist(aws_cloudfront_distribution.media.ordered_cache_behavior[0].allowed_methods))) == jsonencode(["GET", "HEAD"])
    error_message = "The Alfik behaviour allows more than GET and HEAD"
  }
  assert {
    condition     = jsonencode(sort(tolist(data.aws_iam_policy_document.content.statement[0].resources))) == jsonencode(["arn:aws:s3:::jadwigo-content-test/alfik/media/*", "arn:aws:s3:::jadwigo-content-test/khan/media/*"])
    error_message = "The distribution may read ${jsonencode(data.aws_iam_policy_document.content.statement[0].resources)}"
  }
}
