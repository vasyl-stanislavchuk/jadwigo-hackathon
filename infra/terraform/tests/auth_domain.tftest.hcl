# modules/auth_domain against a mock provider, so no AWS and no credentials (dl-e8ov.2.65). Before
# the domain is created there is only the CNAME; Supabase's TXT records join it, each under the domain.
mock_provider "aws" {
  override_during = plan
}

run "cname_alone_before_the_domain_is_created" {
  command = plan

  module {
    source = "./modules/auth_domain"
  }

  variables {
    domain_name  = "auth.jadwigo.pl"
    zone_name    = "jadwigo.pl"
    supabase_ref = "xhzkmpainwzrfktxffjv"
  }

  assert {
    condition     = data.aws_route53_zone.this.name == "jadwigo.pl"
    error_message = "The zone is ${data.aws_route53_zone.this.name}, not jadwigo.pl"
  }
  assert {
    condition     = aws_route53_record.cname.name == "auth.jadwigo.pl" && aws_route53_record.cname.type == "CNAME"
    error_message = "The record is ${aws_route53_record.cname.type} ${aws_route53_record.cname.name}"
  }
  assert {
    condition     = jsonencode(aws_route53_record.cname.records) == jsonencode(["xhzkmpainwzrfktxffjv.supabase.co"])
    error_message = "The CNAME points at ${jsonencode(aws_route53_record.cname.records)}"
  }
  assert {
    condition     = length(aws_route53_record.txt) == 0
    error_message = "A TXT record before Supabase named one"
  }
}

run "txt_records_once_supabase_names_them" {
  command = plan

  module {
    source = "./modules/auth_domain"
  }

  variables {
    domain_name  = "auth.jadwigo.pl"
    zone_name    = "jadwigo.pl"
    supabase_ref = "xhzkmpainwzrfktxffjv"
    txt_records = {
      "_cf-custom-hostname.auth.jadwigo.pl" = "ownership-stub"
      "_acme-challenge.auth.jadwigo.pl"     = "ssl-stub"
    }
  }

  assert {
    condition     = jsonencode(sort(keys(aws_route53_record.txt))) == jsonencode(["_acme-challenge.auth.jadwigo.pl", "_cf-custom-hostname.auth.jadwigo.pl"])
    error_message = "The TXT records are ${jsonencode(sort(keys(aws_route53_record.txt)))}"
  }
  assert {
    condition     = jsonencode(aws_route53_record.txt["_acme-challenge.auth.jadwigo.pl"].records) == jsonencode(["ssl-stub"])
    error_message = "The SSL TXT record holds ${jsonencode(aws_route53_record.txt["_acme-challenge.auth.jadwigo.pl"].records)}"
  }
}

run "a_txt_record_outside_the_domain_is_refused" {
  command = plan

  module {
    source = "./modules/auth_domain"
  }

  variables {
    domain_name  = "auth.jadwigo.pl"
    zone_name    = "jadwigo.pl"
    supabase_ref = "xhzkmpainwzrfktxffjv"
    txt_records  = { "jadwigo.pl" = "would-clobber-the-apex" }
  }

  expect_failures = [var.txt_records]
}
