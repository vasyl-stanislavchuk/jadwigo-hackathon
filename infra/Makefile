# Terraform for jadwigo, one root module under terraform/ read through environments/<env>.tfvars
# and <env>.backend.hcl (jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module).
# Agents plan at most; the owner applies by hand. A merge deploys nothing.
include aws.mk
ENV ?= prod
TF := AWS_PROFILE=$(AWS_PROFILE) terraform -chdir=terraform

.PHONY: init plan apply output fmt validate

init:
	$(TF) init -input=false -reconfigure -backend-config=environments/$(ENV).backend.hcl

plan: init
	$(TF) plan -var-file=environments/$(ENV).tfvars

apply: init
	$(TF) apply -var-file=environments/$(ENV).tfvars

output:
	@$(TF) output

# No AWS: what CI and `make check` can run.
fmt:
	terraform -chdir=terraform fmt -check -recursive

validate:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform validate
