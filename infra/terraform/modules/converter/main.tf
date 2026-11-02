# The attachments converter (dl-z5ja.11.8, wave 6 decision 58): apps/converter's image, one Lambda
# the runner invokes over IAM with S3 keys. It turns a PDF, DOCX or HEIC under
# pods/<pod>/attachments/<id>.<ext> into page JPEGs and a pages.json under pods/<pod>/attachments/<id>/.
# It has no URL, no trigger and no resource policy: only a role granted lambda:InvokeFunction on it
# (the runner's, modules/runner) can call it.
#
# The ECR repo comes first. With image_tag blank, that is all this module makes, so the first apply
# needs no image; the owner then pushes one (`make -C apps/converter image push`), sets
# converter_image_tag, and applies again. Lambda adds its own pull grant to the repo's policy when it
# creates the function in the same account, as lambda-docx-conversion relies on.
locals {
  name    = "jadwigo-converter-${var.environment}"
  enabled = var.image_tag != ""
}

resource "aws_ecr_repository" "converter" {
  name                 = local.name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "converter" {
  repository = aws_ecr_repository.converter.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 14 days"
        selection    = { tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 14 }
        action       = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the last 10 tagged images, so a rollback has somewhere to go"
        selection    = { tagStatus = "tagged", tagPrefixList = [var.environment], countType = "imageCountMoreThan", countNumber = 10 }
        action       = { type = "expire" }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "converter" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.log_retention_days
}

# The policies are jsonencode()d here, not policy-document data sources, so a plan of the root
# against a bare mock provider (tests/root_auth_domain.tftest.hcl) still reads valid JSON.
locals {
  # Its logs, and in the uploads bucket a read of attachments and a write of their pages: no List, no
  # Delete, nothing under pending/, no other bucket. S3's * spans slashes, so the read also covers a
  # stored pages.json, and the write is only ever below an attachment's id.
  statements = [
    {
      Sid      = "WritesItsLogs"
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = ["${aws_cloudwatch_log_group.converter.arn}:*"]
    },
    {
      Sid      = "ReadsAttachments"
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = ["arn:aws:s3:::${var.uploads_bucket_name}/pods/*/attachments/*"]
    },
    {
      Sid      = "WritesTheirPages"
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = ["arn:aws:s3:::${var.uploads_bucket_name}/pods/*/attachments/*/*"]
    },
  ]
}

resource "aws_iam_role" "converter" {
  name = local.name
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "converter" {
  name   = local.name
  role   = aws_iam_role.converter.id
  policy = jsonencode({ Version = "2012-10-17", Statement = local.statements })
}

resource "aws_lambda_function" "converter" {
  count = local.enabled ? 1 : 0

  function_name = local.name
  role          = aws_iam_role.converter.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.converter.repository_url}:${var.image_tag}"
  architectures = ["x86_64"]
  memory_size   = var.memory_size
  timeout       = var.timeout

  ephemeral_storage {
    size = var.ephemeral_storage
  }

  environment {
    variables = { UPLOADS_BUCKET = var.uploads_bucket_name }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.converter.name
  }

  depends_on = [aws_iam_role_policy.converter]
}
