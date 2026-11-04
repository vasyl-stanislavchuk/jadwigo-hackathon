# The print Lambda (dl-1eieq.8.2, decision dl-o05aa): apps/print's image, one Lambda the api
# invokes with InvocationType Event and S3 keys. It reads a sheet at pods/<pod>/prints/<id>.json and
# writes <id>.pdf or <id>.error.json beside it, each tagged kind=print. It has no URL, no trigger and
# no resource policy: only a role granted lambda:InvokeFunction on it (the api's, modules/app) can
# call it. Its reserved concurrency caps the renders at once (var.reserved_concurrency).
#
# The ECR repo comes first. With image_tag blank, that is all this module makes, so the first apply
# needs no image; the owner then pushes one (`make -C apps/print image image-check push`), sets
# print_image_tag, and applies again (dl-1eieq.8.5).
locals {
  name    = "jadwigo-print-${var.environment}"
  enabled = var.image_tag != ""
}

resource "aws_ecr_repository" "print" {
  name                 = local.name
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "print" {
  repository = aws_ecr_repository.print.name
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

resource "aws_cloudwatch_log_group" "print" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.log_retention_days
}

# jsonencode()d, not policy-document data sources, so a plan of the root against a bare mock
# provider still reads valid JSON (as modules/converter).
locals {
  # Its logs, and in the uploads bucket a read of a sheet and a write of its two answers: no List,
  # no Delete, no read of a PDF, nothing outside pods/*/prints/, no other bucket. PutObjectTagging
  # because every put carries kind=print, which the bucket's lifecycle rule expires.
  statements = [
    {
      Sid      = "WritesItsLogs"
      Effect   = "Allow"
      Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
      Resource = ["${aws_cloudwatch_log_group.print.arn}:*"]
    },
    {
      Sid      = "ReadsSheets"
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = ["arn:aws:s3:::${var.uploads_bucket_name}/pods/*/prints/*.json"]
    },
    {
      Sid    = "WritesPdfsAndErrors"
      Effect = "Allow"
      Action = ["s3:PutObject", "s3:PutObjectTagging"]
      Resource = [
        "arn:aws:s3:::${var.uploads_bucket_name}/pods/*/prints/*.pdf",
        "arn:aws:s3:::${var.uploads_bucket_name}/pods/*/prints/*.error.json",
      ]
    },
  ]
}

resource "aws_iam_role" "print" {
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

resource "aws_iam_role_policy" "print" {
  name   = local.name
  role   = aws_iam_role.print.id
  policy = jsonencode({ Version = "2012-10-17", Statement = local.statements })
}

resource "aws_lambda_function" "print" {
  count = local.enabled ? 1 : 0

  function_name = local.name
  role          = aws_iam_role.print.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.print.repository_url}:${var.image_tag}"
  architectures = ["arm64"]
  memory_size   = var.memory_size
  timeout       = var.timeout

  # A cap on the renders at once, so a flood of public starts queues (dl-1eieq.8.16). It is taken
  # from the account's unreserved concurrency, which must stay at 100 or more.
  reserved_concurrent_executions = var.reserved_concurrency

  environment {
    variables = { UPLOADS_BUCKET = var.uploads_bucket_name }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.print.name
  }

  depends_on = [aws_iam_role_policy.print]
}
