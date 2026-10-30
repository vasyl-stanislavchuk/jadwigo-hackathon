# SES sending for each apex (dl-5ssh.6): a domain identity with Easy DKIM, a custom MAIL FROM with
# its MX and SPF, and DMARC, all in the apex's own Route 53 zone. SES sends in this provider's region.
# Auth mail goes out through it later, from the Send Email Hook (dl-liwi.33); no SMTP user here.
data "aws_region" "this" {}

data "aws_route53_zone" "this" {
  for_each = var.domains
  name     = each.key
}

locals {
  mail_from = { for d in var.domains : d => "${var.mail_from_subdomain}.${d}" }

  # Easy DKIM publishes 3 tokens per identity. The keys are known at plan, the tokens after apply.
  dkim = merge([
    for d in var.domains : { for i in range(3) : "${d}/${i}" => { domain = d, index = i } }
  ]...)
}

resource "aws_sesv2_email_identity" "this" {
  for_each       = var.domains
  email_identity = each.key
}

resource "aws_route53_record" "dkim" {
  for_each = local.dkim

  zone_id = data.aws_route53_zone.this[each.value.domain].zone_id
  name    = "${aws_sesv2_email_identity.this[each.value.domain].dkim_signing_attributes[0].tokens[each.value.index]}._domainkey.${each.value.domain}"
  type    = "CNAME"
  ttl     = 1800
  records = ["${aws_sesv2_email_identity.this[each.value.domain].dkim_signing_attributes[0].tokens[each.value.index]}.dkim.amazonses.com"]
}

# Bounces return to mail.<apex>, so SPF passes for SES and aligns with the From apex (relaxed).
resource "aws_sesv2_email_identity_mail_from_attributes" "this" {
  for_each = var.domains

  email_identity         = aws_sesv2_email_identity.this[each.key].email_identity
  mail_from_domain       = local.mail_from[each.key]
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "mail_from_mx" {
  for_each = var.domains

  zone_id = data.aws_route53_zone.this[each.key].zone_id
  name    = local.mail_from[each.key]
  type    = "MX"
  ttl     = 1800
  records = ["10 feedback-smtp.${data.aws_region.this.region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  for_each = var.domains

  zone_id = data.aws_route53_zone.this[each.key].zone_id
  name    = local.mail_from[each.key]
  type    = "TXT"
  ttl     = 1800
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "dmarc" {
  for_each = var.domains

  zone_id = data.aws_route53_zone.this[each.key].zone_id
  name    = "_dmarc.${each.key}"
  type    = "TXT"
  ttl     = 1800
  records = ["v=DMARC1; p=${var.dmarc_policy}; adkim=r; aspf=r"]
}

# Google Workspace mail beside SES on the apexes that name it (dl-e8ov.2.71, workspace/main.tf).
module "workspace" {
  source   = "./workspace"
  for_each = var.workspace

  domain            = each.key
  zone_id           = data.aws_route53_zone.this[each.key].zone_id
  site_verification = each.value.site_verification
  mx                = each.value.mx
  dkim              = each.value.dkim
}
