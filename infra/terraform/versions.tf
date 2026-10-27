terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.69.1"
    }
  }

  # Settings come from environments/<env>.backend.hcl. The state bucket is the owner's step (dl-5ssh.9).
  backend "s3" {}
}
