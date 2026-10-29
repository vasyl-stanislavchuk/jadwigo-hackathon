output "identity_arns" {
  value = { for d, i in aws_sesv2_email_identity.this : d => i.arn }
}

output "mail_from_domains" {
  value = local.mail_from
}
