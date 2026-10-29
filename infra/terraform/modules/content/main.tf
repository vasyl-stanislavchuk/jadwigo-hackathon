# The content bucket (dl-n9fr.43.2): the question bodies, answer keys and pictures that never enter
# git (jadwigo-question-bank/decisions/2026-10-29-the-question-bodies-and-answer-keys-live-in-a-private-bucket-in).
# Keyed by source first: khan/raw/, khan/candidates/, khan/converted/{en,pl}.json, khan/media/<sha>,
# and a derived questions/<source>/<id>.json layer for the item route
# (jadwigo-question-bank/decisions/2026-10-29-the-content-bucket-is-keyed-by-source-first-khan-then-the-next-l).
# jadwigo-bank's tools/khan/sync.py fills it; Terraform owns no object in it.
locals {
  media_prefix = "khan/media"
  media_url    = "https://${aws_cloudfront_distribution.media.domain_name}"
}

resource "aws_s3_bucket" "content" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "content" {
  bucket                  = aws_s3_bucket.content.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "content" {
  bucket = aws_s3_bucket.content.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "content" {
  bucket = aws_s3_bucket.content.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioned, so a sync that overwrites or deletes (--delete) can be undone for noncurrent_days.
resource "aws_s3_bucket_versioning" "content" {
  bucket = aws_s3_bucket.content.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "content" {
  bucket = aws_s3_bucket.content.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_days
    }
  }

  depends_on = [aws_s3_bucket_versioning.content]
}

# Pictures for a child's browser: CloudFront over khan/media/ only, the bucket private behind origin
# access control (jadwigo-question-bank/decisions/2026-10-29-khan-pictures-are-served-from-a-cloudfront-path-over-the-bucket).
# The origin path is /khan/media, so /<sha>.svg reads khan/media/<sha>.svg and no other key has a URL.
resource "aws_cloudfront_origin_access_control" "media" {
  name                              = var.bucket_name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# A picture's key is its sha, so a key's bytes never change: cache it for a year at the edge and in
# the browser. No cookie, header or query string reaches the origin or the cache key.
resource "aws_cloudfront_cache_policy" "media" {
  name        = "${var.bucket_name}-media"
  comment     = "Pictures keyed by sha: immutable, a year"
  min_ttl     = 86400
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

# The default *.cloudfront.net name tonight; a custom domain is a later bead.
resource "aws_cloudfront_distribution" "media" {
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = "PriceClass_100"
  comment         = "${var.bucket_name} ${local.media_prefix}/ pictures"

  origin {
    origin_id                = "media"
    domain_name              = aws_s3_bucket.content.bucket_regional_domain_name
    origin_path              = "/${local.media_prefix}"
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  default_cache_behavior {
    target_origin_id           = "media"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.media.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

# CloudFront reads khan/media/* and nothing else. The api role's read of questions/* and
# khan/converted/* is an identity policy (modules/app/bank.tf), so it needs no line here.
data "aws_iam_policy_document" "content" {
  statement {
    sid       = "CloudFrontReadsTheMediaOnly"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.content.arn}/${local.media_prefix}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.media.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "content" {
  bucket     = aws_s3_bucket.content.id
  policy     = data.aws_iam_policy_document.content.json
  depends_on = [aws_s3_bucket_public_access_block.content]
}

# The names travel through SSM, as the bank's alias ARN does (modules/app/bank.tf): the bank's tools
# read the bucket's name, the player and the playground the media URL. Neither is a secret.
resource "aws_ssm_parameter" "bucket" {
  name        = var.bucket_param
  description = "The content bucket's name (dl-n9fr.43.2), read by jadwigo-bank's tools/khan/sync.py"
  type        = "String"
  value       = aws_s3_bucket.content.id
}

resource "aws_ssm_parameter" "media_url" {
  name        = var.media_url_param
  description = "The https URL that serves the content bucket's khan/media/ by sha (dl-n9fr.43.2)"
  type        = "String"
  value       = local.media_url
}
