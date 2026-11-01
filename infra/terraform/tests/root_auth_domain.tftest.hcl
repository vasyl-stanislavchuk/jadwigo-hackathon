# The root module's auth_domain wiring (auth_domain.tf, dl-e8ov.2.77): planned with prod.tfvars
# (`make -C infra test` passes it as -var-file) against mock providers, every other module overridden,
# so no AWS and no credentials. prod.tfvars turns the domain on: one CNAME in the site's zone, to prod's
# own Supabase host. With auth_domain null there is no module at all.
mock_provider "aws" {
  override_during = plan
}

mock_provider "aws" {
  alias           = "us_east_1"
  override_during = plan
}

override_module {
  target = module.site
}

override_module {
  target = module.docs
}

override_module {
  target = module.content
}

override_module {
  target = module.app
}

override_module {
  target = module.mail
}

override_module {
  target = module.alarms
}

override_module {
  target = module.runner
}

# alarms.tf's check fails a test run without an address; any address will do here.
variables {
  alarm_email = "alarms@example.invalid"
}

run "prod_tfvars_plans_one_cname_in_jadwigo_pl" {
  command = plan

  assert {
    condition     = length(module.auth_domain) == 1
    error_message = "prod.tfvars plans ${length(module.auth_domain)} auth_domain modules"
  }
  assert {
    condition     = module.auth_domain[0].zone_name == "jadwigo.pl"
    error_message = "The auth domain's zone is ${module.auth_domain[0].zone_name}"
  }
  assert {
    condition     = jsonencode(module.auth_domain[0].records) == jsonencode({ "auth.jadwigo.pl|CNAME" = ["xhzkmpainwzrfktxffjv.supabase.co"] })
    error_message = "The auth domain plans ${jsonencode(module.auth_domain[0].records)}"
  }
}

run "txt_records_from_auth_domain_txt" {
  command = plan

  variables {
    auth_domain_txt = { "_acme-challenge.auth.jadwigo.pl" = "ssl-stub" }
  }

  assert {
    condition     = jsonencode(module.auth_domain[0].records) == jsonencode({ "auth.jadwigo.pl|CNAME" = ["xhzkmpainwzrfktxffjv.supabase.co"], "_acme-challenge.auth.jadwigo.pl|TXT" = ["ssl-stub"] })
    error_message = "The auth domain plans ${jsonencode(module.auth_domain[0].records)}"
  }
}

run "no_auth_domain_no_module" {
  command = plan

  variables {
    auth_domain = null
  }

  assert {
    condition     = length(module.auth_domain) == 0
    error_message = "auth_domain null still plans ${length(module.auth_domain)} modules"
  }
}
