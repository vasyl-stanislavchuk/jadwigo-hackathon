# A Supabase project's custom domain (dl-e8ov.2.65): the CNAME to the project's own host, and the TXT
# records Supabase asks for when the domain is created, in the apex's Route 53 zone. Creating,
# verifying and activating the domain on Supabase's side is infra/supabase-auth/domain.sh, the owner's.
data "aws_route53_zone" "this" {
  name = var.zone_name
}

resource "aws_route53_record" "cname" {
  zone_id = data.aws_route53_zone.this.zone_id
  name    = var.domain_name
  type    = "CNAME"
  ttl     = 300
  records = ["${var.supabase_ref}.supabase.co"]
}

resource "aws_route53_record" "txt" {
  for_each = var.txt_records

  zone_id = data.aws_route53_zone.this.zone_id
  name    = each.key
  type    = "TXT"
  ttl     = 300
  records = [each.value]
}
