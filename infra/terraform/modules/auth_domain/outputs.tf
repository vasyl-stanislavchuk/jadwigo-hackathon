output "zone_name" {
  value = data.aws_route53_zone.this.name
}

# Every record this module plans, "<name>|<type>" => its values, for the root's test.
output "records" {
  value = merge(
    { "${aws_route53_record.cname.name}|CNAME" = aws_route53_record.cname.records },
    { for name, r in aws_route53_record.txt : "${name}|TXT" => r.records },
  )
}
