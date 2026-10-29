# Terraform for jadwigo, one root module under terraform/ read through environments/<env>.tfvars
# and <env>.backend.hcl (jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module).
# Agents plan at most; the owner applies by hand. A merge deploys nothing.
include aws.mk
# The terraform mise.toml pins on PATH even in a shell that never activated mise, as the root Makefile
# does. versions.tf requires exactly that version. Without mise, PATH is left as it is.
MISE_BIN_PATHS := $(shell command -v mise >/dev/null 2>&1 && mise bin-paths 2>/dev/null | tr '\n' ':')
export PATH := $(MISE_BIN_PATHS)$(PATH)
ENV ?= prod
TF := AWS_PROFILE=$(AWS_PROFILE) terraform -chdir=terraform

.PHONY: init plan apply output site-deploy deploy api-deploy web-deploy docs-deploy auth-diff auth-apply fmt validate test

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

# The service at app.<apex> (dl-5ssh.2): `make -C infra deploy` is the api, then the web app. The
# owner runs it after an apply, from a terminal; a merge deploys nothing
# (jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually).
# Every name comes from terraform output. An agent's shell (Claude Code sets CLAUDECODE) is refused;
# `make -n -C infra deploy` prints the steps anywhere.
WEB := ../apps/web
API_ZIP := ../apps/api/dist/api.zip
NOT_FROM_AGENT = if [ -n "$$CLAUDECODE" ]; then echo "$@: the owner deploys, from a terminal, not from an agent's shell"; exit 1; fi

deploy: api-deploy web-deploy

# The bundle (`make api-bundle`), zipped, as the function's code; then wait until it is live.
api-deploy:
	@$(NOT_FROM_AGENT)
	$(MAKE) -C .. api-bundle
	rm -f $(API_ZIP) && zip -qj $(API_ZIP) ../apps/api/dist/index.mjs
	fn=$$($(TF) output -raw api_function_name) && \
	$(AWS) lambda update-function-code --function-name $$fn --zip-file fileb://$(API_ZIP) --architectures arm64 >/dev/null && \
	$(AWS) lambda wait function-updated-v2 --function-name $$fn && echo "api-deploy: $$fn is live"

# apps/web's build to the app bucket, then invalidate. Hashed files under assets/ cache for a year,
# the rest (index.html first) 5 minutes, so a deploy shows within minutes.
web-deploy:
	@$(NOT_FROM_AGENT)
	cd $(WEB) && bun run build
	test -f $(WEB)/dist/index.html
	bucket=$$($(TF) output -raw app_bucket) && dist_id=$$($(TF) output -raw app_distribution_id) && \
	{ [ ! -d $(WEB)/dist/assets ] || $(AWS) s3 sync $(WEB)/dist/assets s3://$$bucket/assets --cache-control "public, max-age=31536000, immutable"; } && \
	$(AWS) s3 sync $(WEB)/dist s3://$$bucket --delete --exclude "assets/*" --cache-control "public, max-age=300" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/*"

# The docs at docs.<apex> (dl-5ssh.90): apps/docs's Starlight build, checked, to the docs bucket, then
# invalidate. As for the site, hashed files under _astro/ cache for a year and the rest 5 minutes,
# which keeps the pages and the files agents read (openapi.json, mcp-tools.json, llms.txt) short.
# docs/runbooks/docs-publish.md is the owner's order.
DOCS := ../apps/docs

docs-deploy:
	@$(NOT_FROM_AGENT)
	cd $(DOCS) && bun run build && bun run check:dist
	bucket=$$($(TF) output -raw docs_bucket) && dist_id=$$($(TF) output -raw docs_distribution_id) && \
	{ [ ! -d $(DOCS)/dist/_astro ] || $(AWS) s3 sync $(DOCS)/dist/_astro s3://$$bucket/_astro --cache-control "public, max-age=31536000, immutable"; } && \
	$(AWS) s3 sync $(DOCS)/dist s3://$$bucket --delete --exclude "_astro/*" --cache-control "public, max-age=300" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/*"

# Supabase Auth settings for jadwigo-prod and jadwigo-dev (dl-e8ov.2.40): site URL, redirect URLs,
# OTP length, from supabase-auth/<env>.json. auth-diff only reads; it exits 2 when a project would
# change. auth-apply writes them, and is the owner's, from a terminal.
auth-diff:
	supabase-auth/auth.sh diff

auth-apply:
	@$(NOT_FROM_AGENT)
	supabase-auth/auth.sh apply

# No AWS: what CI and `make check` can run.
fmt:
	terraform -chdir=terraform fmt -check -recursive

# -no-tests: terraform 1.17's validate cannot map a child module's aliased provider (aws.us_east_1)
# in a test run block and fails with a "Provider configuration not present" that names a different
# resource each time. `test` below reads, validates and runs those files instead.
validate:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform validate -no-tests

# terraform/tests/*.tftest.hcl against mock providers: no credentials, no AWS call. init fetches the
# providers the lock file pins, once; after that it runs offline (dl-5ssh.90.17).
test:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform test
