# A message's photos (dl-z5ja.11.2): the api role's grant on the uploads bucket (modules/uploads).
# It presigns the browser's POST into pending/, checks and copies a sent photo to
# pods/<pod>/attachments/, presigns a GET of that copy, and deletes both (apps/api/src/attachments.ts,
# dl-z5ja.11.3). No s3:ListBucket, so a key that is not there answers 403, never a listing.
# Blank, as in a module test that names no bucket: no statement and no UPLOADS_BUCKET.
variable "uploads_bucket_name" {
  description = "The uploads bucket the api presigns into and copies within: pending/* and pods/*/attachments/* only"
  type        = string
  default     = ""
}

variable "uploads_bucket_param_arn" {
  description = "The SSM parameter the api reads the uploads bucket's name from when UPLOADS_BUCKET is unset"
  type        = string
  default     = ""
}

# Merged into the api role's policy (api.tf, source_policy_documents).
data "aws_iam_policy_document" "uploads" {
  dynamic "statement" {
    for_each = var.uploads_bucket_name == "" ? [] : [var.uploads_bucket_name]
    content {
      sid     = "PutsGetsAndDeletesUploads"
      actions = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
      resources = [
        "arn:aws:s3:::${statement.value}/pending/*",
        "arn:aws:s3:::${statement.value}/pods/*/attachments/*",
      ]
    }
  }

  dynamic "statement" {
    for_each = var.uploads_bucket_param_arn == "" ? [] : [var.uploads_bucket_param_arn]
    content {
      sid       = "ReadsTheUploadsBucketName"
      actions   = ["ssm:GetParameter"]
      resources = [statement.value]
    }
  }
}
