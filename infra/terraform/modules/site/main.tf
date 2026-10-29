# With the defaults (zone_name unset, include_www true) every value below is what it was before
# these options, so the marketing site plans with no changes (dl-5ssh.90.11).
locals {
  www   = "www.${var.domain_name}"
  zone  = coalesce(var.zone_name, var.domain_name)
  names = var.include_www ? [var.domain_name, local.www] : [var.domain_name]
}

data "aws_route53_zone" "this" {
  name = local.zone
}

# Certificate: one name for the domain and, with include_www, one for www, validated in the zone
# this account holds.
resource "aws_acm_certificate" "this" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = var.include_www ? [local.www] : null
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validation" {
  for_each = {
    for o in aws_acm_certificate.this.domain_validation_options : o.domain_name => o
  }

  zone_id         = data.aws_route53_zone.this.zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for r in aws_route53_record.validation : r.fqdn]
}

# Origin bucket: private, read by CloudFront through origin access control.
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = var.bucket_name
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# The edge: www.<apex> redirects to the apex, and a page path reads its index.html (edge.js).
# Without include_www no www host reaches it, and only the index.html mapping applies.
# The bucket's files come from `make -C infra site-deploy` (docs-deploy for the docs), not from Terraform.
resource "aws_cloudfront_function" "edge" {
  name    = "${replace(var.domain_name, ".", "-")}-edge"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = "const apex = ${jsonencode(var.domain_name)};\n${file("${path.module}/edge.js")}"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = "PriceClass_100"
  default_root_object = "index.html"
  aliases             = local.names
  comment             = "${var.domain_name} ${var.purpose}"

  origin {
    origin_id                = "site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.edge.arn
    }
  }

  # A path that is not there serves the site's 404 page. A private bucket answers 403 for a
  # missing key, so both codes land there.
  dynamic "custom_error_response" {
    for_each = [403, 404]
    content {
      error_code            = custom_error_response.value
      response_code         = 404
      response_page_path    = "/404.html"
      error_caching_min_ttl = 60
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.this.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

data "aws_iam_policy_document" "site" {
  statement {
    sid       = "CloudFrontReadsTheSite"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket     = aws_s3_bucket.site.id
  policy     = data.aws_iam_policy_document.site.json
  depends_on = [aws_s3_bucket_public_access_block.site]
}

resource "aws_route53_record" "alias" {
  for_each = toset(flatten([for n in local.names : ["${n}|A", "${n}|AAAA"]]))

  zone_id = data.aws_route53_zone.this.zone_id
  name    = split("|", each.key)[0]
  type    = split("|", each.key)[1]

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
