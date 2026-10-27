# Terraform for jadwigo, one root module under terraform/ read through environments/<env>.tfvars
# and <env>.backend.hcl (jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module).
# Agents plan at most; the owner applies by hand. A merge deploys nothing.
include aws.mk
ENV ?= prod
TF := AWS_PROFILE=$(AWS_PROFILE) terraform -chdir=terraform

.PHONY: init plan apply output site-deploy fmt validate

init:
	$(TF) init -input=false -reconfigure -backend-config=environments/$(ENV).backend.hcl

plan: init
	$(TF) plan -var-file=environments/$(ENV).tfvars

apply: init
	$(TF) apply -var-file=environments/$(ENV).tfvars

output:
	@$(TF) output

# The site's files: build, check the head tags, sync to the bucket, then invalidate. The owner runs it
# after an apply; a merge deploys nothing. Hashed assets under _astro/ cache for a year, the rest 5 minutes.
SITE := ../apps/site
AWS := aws --profile $(AWS_PROFILE)

site-deploy:
	cd $(SITE) && bun run build && bun run check:dist
	bucket=$$($(TF) output -raw site_bucket) && dist_id=$$($(TF) output -raw site_distribution_id) && \
	{ [ ! -d $(SITE)/dist/_astro ] || $(AWS) s3 sync $(SITE)/dist/_astro s3://$$bucket/_astro --cache-control "public, max-age=31536000, immutable"; } && \
	$(AWS) s3 sync $(SITE)/dist s3://$$bucket --delete --exclude "_astro/*" --cache-control "public, max-age=300" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/*"

# No AWS: what CI and `make check` can run.
fmt:
	terraform -chdir=terraform fmt -check -recursive

validate:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform validate
