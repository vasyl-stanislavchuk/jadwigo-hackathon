# modules/mail/workspace, Google Workspace mail beside SES, against a mock provider: no AWS and no
# credentials (dl-e8ov.2.71). With the inputs unset there is no record at all, so a plan before the
# owner signs up changes nothing; with them set, the exact MX, SPF, verification and DKIM records.
mock_provider "aws" {
  override_during = plan
}

variables {
  domain  = "jadwigo.pl"
  zone_id = "Z08182772X0QEYE8APFY2"
}

run "no_record_with_the_inputs_unset" {
  command = plan

  module {
    source = "./modules/mail/workspace"
  }

  assert {
    condition     = length(aws_route53_record.mx) + length(aws_route53_record.txt) + length(aws_route53_record.dkim) == 0
    error_message = "A Workspace record before its input was set"
  }
}

run "verification_alone_before_signup_finishes" {
  command = plan

  module {
    source = "./modules/mail/workspace"
  }

  variables {
    site_verification = "abc123"
  }

  assert {
    condition     = aws_route53_record.txt[0].name == "jadwigo.pl" && jsonencode(aws_route53_record.txt[0].records) == jsonencode(["google-site-verification=abc123"])
    error_message = "The apex TXT is ${jsonencode(aws_route53_record.txt[0].records)}"
  }
  assert {
    condition     = length(aws_route53_record.mx) == 0 && length(aws_route53_record.dkim) == 0
    error_message = "MX or DKIM before their inputs"
  }
}

run "every_record_with_the_inputs_set" {
  command = plan

  module {
    source = "./modules/mail/workspace"
  }

  variables {
    site_verification = "abc123"
    mx                = true
    dkim              = "v=DKIM1; k=rsa; p=${join("", [for i in range(40) : "ABCDEFGHIJ"])}"
  }

  assert {
    condition     = aws_route53_record.mx[0].name == "jadwigo.pl" && aws_route53_record.mx[0].zone_id == "Z08182772X0QEYE8APFY2" && jsonencode(aws_route53_record.mx[0].records) == jsonencode(["1 smtp.google.com"])
    error_message = "The MX is ${jsonencode(aws_route53_record.mx[0].records)}"
  }
  assert {
    condition     = jsonencode(sort(tolist(aws_route53_record.txt[0].records))) == jsonencode(["google-site-verification=abc123", "v=spf1 include:_spf.google.com ~all"])
    error_message = "The apex TXT is ${jsonencode(aws_route53_record.txt[0].records)}"
  }
  assert {
    condition     = aws_route53_record.dkim[0].name == "google._domainkey.jadwigo.pl" && aws_route53_record.dkim[0].type == "TXT"
    error_message = "The DKIM record is ${aws_route53_record.dkim[0].type} ${aws_route53_record.dkim[0].name}"
  }
  # 418 characters: one string of 255, then one of 163, as Route 53 reads "a""b".
  assert {
    condition     = [for r in aws_route53_record.dkim[0].records : [for s in split("\"\"", r) : length(s)]][0] == [255, 163]
    error_message = "The DKIM value is not split at 255: ${jsonencode(aws_route53_record.dkim[0].records)}"
  }
  assert {
    condition     = [for r in aws_route53_record.dkim[0].records : replace(r, "\"\"", "")][0] == "v=DKIM1; k=rsa; p=${join("", [for i in range(40) : "ABCDEFGHIJ"])}"
    error_message = "The DKIM strings do not join back to the key"
  }
}

run "a_dkim_value_that_is_not_the_whole_key_is_refused" {
  command = plan

  module {
    source = "./modules/mail/workspace"
  }

  variables {
    dkim = "p=MIIBIjAN"
  }

  expect_failures = [var.dkim]
}
