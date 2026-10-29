# The handshake with the question bank (dl-5ssh.57, docs/research/bank-into-the-monorepo.md step 4).
# The bank's own Terraform root stays in jadwigo-bank/infra and writes its live alias ARN to SSM;
# this module reads it, lets the api role invoke that alias and nothing else, and hands the
# function the ARN. Apply the bank root first: until it has written the parameter, a plan here
# stops on ParameterNotFound (docs/runbooks/bank-handshake.md).
# The content bucket's name, from modules/content (dl-n9fr.43.2). Declared here, beside the grant it scopes.
variable "content_bucket_name" {
  description = "The content bucket the api reads question bodies from: questions/* and khan/converted/* only"
  type        = string
}

locals {
  bank_read_token_param = "/jadwigo/${var.environment}/bank-read-token"
}

# A String parameter, so insecure_value carries it in the clear: an ARN is not a secret, and a
# sensitive value would hide the function's whole env diff in a plan.
data "aws_ssm_parameter" "bank_search_alias_arn" {
  name = var.bank_search_alias_param
}

# The shared read token the route checks until `jw login` and jgw_ tokens exist (dl-e8ov.2.11).
# Terraform writes only a placeholder, once, through the write-only argument, as with the database
# URL, so no value is ever in a tfvars file or in state. The owner sets the real one by hand with
# `aws ssm put-parameter --overwrite` (docs/runbooks/bank-handshake.md).
resource "aws_ssm_parameter" "bank_read_token" {
  name             = local.bank_read_token_param
  description      = "Shared read token for POST /api/v1/question-searches on ${local.name}: set by the owner, never by Terraform"
  type             = "SecureString"
  value_wo         = "set-by-owner"
  value_wo_version = 1
}

# Merged into the api role's policy (api.tf, source_policy_documents): invoke the bank's live alias,
# and read the read token.
data "aws_iam_policy_document" "bank" {
  statement {
    sid       = "InvokesTheBankLiveAlias"
    actions   = ["lambda:InvokeFunction"]
    resources = [data.aws_ssm_parameter.bank_search_alias_arn.insecure_value]
  }

  statement {
    sid       = "ReadsTheBankReadToken"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.bank_read_token.arn]
  }

  statement {
    sid       = "ReadsTheContentBucketName"
    actions   = ["ssm:GetParameter"]
    resources = [var.content_bucket_param_arn]
  }

  # The content bucket's questions/ and khan/converted/ (dl-n9fr.43.2), and no other prefix: not
  # khan/media/, which CloudFront serves, nor khan/raw/. The bank's search function gets no grant.
  statement {
    sid     = "ReadsTheContentBucketQuestions"
    actions = ["s3:GetObject"]
    resources = [
      "arn:aws:s3:::${var.content_bucket_name}/questions/*",
      "arn:aws:s3:::${var.content_bucket_name}/khan/converted/*",
    ]
  }
}
