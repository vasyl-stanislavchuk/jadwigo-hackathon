# The step-host probe's Lambda (dl-z5ja.5) on jadwigo-dev: a root of its own, so applying it or
# destroying it never touches prod's root. modules/runner with the probe's entry, which drains
# agent_step with a scripted model: no paid call. The owner applies it, runs
# `make step-probe HOST=lambda ENV=dev`, and destroys it once dl-z5ja.5's numbers are recorded:
# `make -C infra probe-step-host-destroy`. Its state is beside prod's, under its own key.
terraform {
  required_version = "1.17.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.70.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "2.8.1"
    }
  }

  backend "s3" {
    bucket       = "jadwigo-terraform-state-843109108289"
    key          = "dev/probe-step-host.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "eu-central-1"

  default_tags {
    tags = {
      project     = "jadwigo"
      environment = "dev"
      managed_by  = "terraform"
      repo        = "jadwigo-hackathon"
      probe       = "dl-z5ja.5"
    }
  }
}

module "runner" {
  source = "../../modules/runner"

  environment          = "dev"
  name                 = "runner-probe"
  handler              = "probe-lambda.handler"
  timeout              = 120
  reserved_concurrency = 1
  log_retention_days   = 7
}

output "function_name" {
  description = "The probe's function"
  value       = module.runner.function_name
}

output "live_alias_arn" {
  description = "The alias the probe invokes"
  value       = module.runner.live_alias_arn
}

output "database_url_param" {
  description = "The SecureString the probe script sets to jadwigo_runner's pooler URL"
  value       = module.runner.database_url_param
}
