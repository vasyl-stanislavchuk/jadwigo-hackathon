# The uploads bucket (dl-z5ja.11.2): the photos a parent attaches to a message, scoped to the pod
# (wave 5 decision 43, docs/worklog/dl-z5ja/2026-11-01-wave-5.md). It is apart from the content
# bucket, so learner data never mixes with the bank. Two prefixes:
#   pending/<pod>/<atch_id>               the browser's presigned POST, before the message is sent
#   pods/<pod>/attachments/<atch_id>.jpg  the checked copy, once a message carries it
# The grants are the api's and the runner's (modules/app/uploads.tf, modules/runner). Terraform owns
# no object in it.
resource "aws_s3_bucket" "uploads" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# No aws_s3_bucket_versioning, on purpose: a new bucket is unversioned, so a delete erases the photo
# and keeps no old version behind it (md drop-comments' bucket, and the erasure decision dl-z5ja.34).

# What no message ever carried is gone after pending_days; the sweep in Postgres drops its row.
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "expire-pending"
    status = "Enabled"

    filter {
      prefix = "pending/"
    }

    expiration {
      days = var.pending_days
    }
  }

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# The browser posts the presigned form straight to the bucket from the app's origin, and nothing
# else crosses origins: the page shows a stored photo through a presigned GET in an <img>, which
# needs no CORS.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["POST"]
    allowed_origins = var.allowed_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# TLS only.
data "aws_iam_policy_document" "uploads" {
  statement {
    sid       = "DeniesPlainHttp"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.uploads.arn, "${aws_s3_bucket.uploads.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "uploads" {
  bucket     = aws_s3_bucket.uploads.id
  policy     = data.aws_iam_policy_document.uploads.json
  depends_on = [aws_s3_bucket_public_access_block.uploads]
}

# The name for a local invoke with no UPLOADS_BUCKET, as the content bucket's is
# (apps/api/src/config.ts UPLOADS_BUCKET_PARAM). Not a secret.
resource "aws_ssm_parameter" "bucket" {
  name        = var.bucket_param
  description = "The uploads bucket's name (dl-z5ja.11.2), read by apps/api when UPLOADS_BUCKET is unset"
  type        = "String"
  value       = aws_s3_bucket.uploads.id
}
