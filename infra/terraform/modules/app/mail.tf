# Auth mail (dl-liwi.33, decision dl-h25k5): Supabase's Send Email Hook POSTs each auth mail to the
# api (apps/api/src/mail/), which sends it through SES. The role may send only through the one SES
# identity (modules/mail) and only From the one address. The hook's Standard Webhooks secrets, one
# per Supabase project that calls it, are a SecureString the owner sets (docs/runbooks/auth-mail.md).
# Blank, as in a module test that names no identity: no statement, no parameter, no env key.
variable "mail_identity_arn" {
  description = "The SES identity the api sends auth mail through (module.mail.identity_arns[\"jadwigo.pl\"])"
  type        = string
  default     = ""
}

variable "mail_from_address" {
  description = "The one From address the api may send as, the ses:FromAddress condition"
  type        = string
  default     = ""
}

locals {
  # Keyed on the address, a literal the plan always knows, not on the identity's ARN, which a
  # plan with a new identity does not know yet.
  mail_on                = var.mail_from_address != ""
  send_email_hook_secret = "/jadwigo/${var.environment}/send-email-hook-secret"
}

# The hook's secrets, space-separated `v1,whsec_<base64>`, one per Supabase project. Terraform writes
# only a placeholder, once, through the write-only argument, as for the database URL (api.tf).
resource "aws_ssm_parameter" "send_email_hook_secret" {
  count            = local.mail_on ? 1 : 0
  name             = local.send_email_hook_secret
  description      = "The Send Email Hook's Standard Webhooks secrets for ${local.name}: set by the owner, never by Terraform"
  type             = "SecureString"
  value_wo         = "set-by-owner"
  value_wo_version = 1
}

# Merged into the api role's policy (api.tf, source_policy_documents).
data "aws_iam_policy_document" "mail" {
  dynamic "statement" {
    for_each = local.mail_on ? [var.mail_identity_arn] : []
    content {
      sid       = "SendsAuthMailFromNoReply"
      actions   = ["ses:SendEmail", "ses:SendRawEmail"]
      resources = [statement.value]

      condition {
        test     = "StringEquals"
        variable = "ses:FromAddress"
        values   = [var.mail_from_address]
      }
    }
  }

  dynamic "statement" {
    for_each = aws_ssm_parameter.send_email_hook_secret
    content {
      sid       = "ReadsTheSendEmailHookSecret"
      actions   = ["ssm:GetParameter"]
      resources = [statement.value.arn]
    }
  }
}
