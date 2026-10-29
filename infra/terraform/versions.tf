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

  # Settings come from environments/<env>.backend.hcl. The state bucket is the owner's step (dl-5ssh.9).
  backend "s3" {}
}
