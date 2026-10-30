# Google Workspace mail on one apex, beside SES (dl-e8ov.2.71,
# jadwigo-platform/decisions/2026-10-30-jadwigo-s-mailboxes-are-google-workspace-on-jadwigo-pl-beside-se).
# Each record stays off until its input is set. Nothing here clashes with SES: its DKIM is
# <token>._domainkey CNAMEs and its MAIL FROM MX and SPF sit at mail.<apex>. _dmarc stays as the mail
# module has it, since relaxed alignment covers both senders. docs/runbooks/google-workspace.md is the
# owner's order.
locals {
  # The apex TXT: the SPF once Workspace takes the mail, and the site verification token.
  txt = compact([
    var.mx ? "v=spf1 include:_spf.google.com ~all" : "",
    var.site_verification == null ? "" : "google-site-verification=${var.site_verification}",
  ])
}

# Google's MX for Workspace since 2023: one host, smtp.google.com, at priority 1.
resource "aws_route53_record" "mx" {
  count = var.mx ? 1 : 0

  zone_id = var.zone_id
  name    = var.domain
  type    = "MX"
  ttl     = 3600
  records = ["1 smtp.google.com"]
}

resource "aws_route53_record" "txt" {
  count = length(local.txt) > 0 ? 1 : 0

  zone_id = var.zone_id
  name    = var.domain
  type    = "TXT"
  ttl     = 3600
  records = local.txt
}

# A DKIM key is longer than one TXT string may be (255). Route 53 reads the strings of one value as
# "a""b"; the provider adds the outer quotes.
resource "aws_route53_record" "dkim" {
  count = var.dkim == null ? 0 : 1

  zone_id = var.zone_id
  name    = "google._domainkey.${var.domain}"
  type    = "TXT"
  ttl     = 3600
  records = [join("\"\"", regexall(".{1,255}", var.dkim))]
}
