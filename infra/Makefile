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

.PHONY: init plan apply output site-deploy deploy deploy-all prod-status api-deploy web-deploy web-build docs-deploy auth-diff auth-apply fmt validate test probe-step-host-plan probe-step-host-apply probe-step-host-destroy runner-deploy runner-rollback runner-status

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
# Each deploy writes the commit it ships, "<sha> <UTC time>[ dirty]", which `make prod-status` reads
# back (dl-5ssh.34.65): version.txt in the site and the docs, version/web.txt and version/api.txt on
# app.<apex>. The recipe's shell runs it, so it names the checkout the build came from.
STAMP = printf '%s %s%s\n' "$$(git rev-parse HEAD)" "$$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$([ -z "$$(git status --porcelain)" ] || echo ' dirty')"

site-deploy:
	@$(NOT_FROM_AGENT)
	cd $(SITE) && bun run build && bun run check:dist && bun run check:hreflang dist
	$(STAMP) > $(SITE)/dist/version.txt
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

# Every service's code to prod: the api, the web app, the site and the docs. Each half can be undone by
# deploying again. It runs no migration and no Terraform apply: those are one-way or need a reviewed
# plan, so they stay their own gated steps (the root Makefile's db-push, then plan and apply here),
# run first when `make prod-status` or a PR says so.
deploy-all: api-deploy web-deploy site-deploy docs-deploy

# Read-only: each service's live commit and how many commits on origin/main touch it since
# (prod-status.sh). Safe from any shell. JADWIGO_AWS_PROFILE reads the Lambda through aws.mk's profile.
prod-status:
	@JADWIGO_AWS_PROFILE=$(AWS_PROFILE) JW_API_FUNCTION=jadwigo-api-$(ENV) sh prod-status.sh

# The bundle (`make api-bundle`), zipped, as the function's code; then wait until it is live.
api-deploy:
	@$(NOT_FROM_AGENT)
	$(MAKE) -C .. api-bundle
	rm -f $(API_ZIP) && zip -qj $(API_ZIP) ../apps/api/dist/index.mjs
	fn=$$($(TF) output -raw api_function_name) && \
	$(AWS) lambda update-function-code --function-name $$fn --zip-file fileb://$(API_ZIP) --architectures arm64 >/dev/null && \
	$(AWS) lambda wait function-updated-v2 --function-name $$fn && echo "api-deploy: $$fn is live"
	bucket=$$($(TF) output -raw app_bucket) && dist_id=$$($(TF) output -raw app_distribution_id) && \
	$(STAMP) | $(AWS) s3 cp - s3://$$bucket/version/api.txt --content-type "text/plain; charset=utf-8" --cache-control "public, max-age=60" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/version/api.txt" >/dev/null

# apps/web's build to the app bucket, then invalidate. Hashed files under assets/ cache for a year,
# the rest (index.html first) 5 minutes, so a deploy shows within minutes.
web-deploy:
	@$(NOT_FROM_AGENT)
	$(MAKE) web-build
	test -f $(WEB)/dist/index.html
	mkdir -p $(WEB)/dist/version && $(STAMP) > $(WEB)/dist/version/web.txt
	bucket=$$($(TF) output -raw app_bucket) && dist_id=$$($(TF) output -raw app_distribution_id) && \
	{ [ ! -d $(WEB)/dist/assets ] || $(AWS) s3 sync $(WEB)/dist/assets s3://$$bucket/assets --cache-control "public, max-age=31536000, immutable"; } && \
	$(AWS) s3 sync $(WEB)/dist s3://$$bucket --delete --exclude "assets/*" --exclude "version/api.txt" --cache-control "public, max-age=300" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/*"

# apps/web's build with the environment's public settings, web-build/<env>.env: the Supabase URL, its
# publishable key and the sign-in providers (dl-e8ov.2.64). The file's values win over the shell's, so
# what is committed is what ships. It uploads nothing; the deploy above runs it first. WEB_BUILD_FLAGS
# go to vite build: the test builds into a directory of its own (dl-e8ov.2.74).
WEB_BUILD_ENV ?= web-build/$(ENV).env
WEB_BUILD_FLAGS ?=

web-build:
	test -f $(WEB_BUILD_ENV)
	set -a && . $(abspath $(WEB_BUILD_ENV)) && set +a && cd $(WEB) && bun run build $(WEB_BUILD_FLAGS)

# The docs at docs.<apex> (dl-5ssh.90): apps/docs's Starlight build, checked, to the docs bucket, then
# invalidate. As for the site, hashed files under _astro/ cache for a year and the rest 5 minutes,
# which keeps the pages and the files agents read (openapi.json, mcp-tools.json, llms.txt) short.
# docs/runbooks/docs-publish.md is the owner's order. Each page's Markdown goes up in a pass of its
# own, typed with a charset: `aws s3 sync` would send a bare text/markdown, which a browser reads
# as windows-1252 (dl-5ssh.90.32).
DOCS := ../apps/docs

docs-deploy:
	@$(NOT_FROM_AGENT)
	cd $(DOCS) && bun run build && bun run check:dist
	$(STAMP) > $(DOCS)/dist/version.txt
	bucket=$$($(TF) output -raw docs_bucket) && dist_id=$$($(TF) output -raw docs_distribution_id) && \
	{ [ ! -d $(DOCS)/dist/_astro ] || $(AWS) s3 sync $(DOCS)/dist/_astro s3://$$bucket/_astro --cache-control "public, max-age=31536000, immutable"; } && \
	$(AWS) s3 sync $(DOCS)/dist s3://$$bucket --delete --exclude "_astro/*" --exclude "*.md" --cache-control "public, max-age=300" && \
	$(AWS) s3 sync $(DOCS)/dist s3://$$bucket --delete --exclude "*" --include "*.md" --content-type "text/markdown; charset=utf-8" --cache-control "public, max-age=300" && \
	$(AWS) cloudfront create-invalidation --distribution-id $$dist_id --paths "/*"

# Supabase Auth settings for jadwigo-prod and jadwigo-dev (dl-e8ov.2.40): site URL, redirect URLs,
# OTP length, and the Google and Facebook providers with their secrets from the keychain (dl-e8ov.2.52),
# from supabase-auth/<env>.json. auth-diff only reads; it exits 2 when a project would change and 1 when
# a keychain item is missing. auth-apply writes them, and is the owner's, from a terminal.
auth-diff:
	supabase-auth/auth.sh diff

auth-apply:
	@$(NOT_FROM_AGENT)
	supabase-auth/auth.sh apply

# The step host (dl-z5ja.20), its own release target, apart from api-deploy (posthog-ai-production.md
# section 1). It deploys only when the code the runner bundles changed since the commit the live
# version names (the path filter); FORCE=1 deploys anyway. The tree must be clean, so the commit a
# version names is what it holds. The boot check imports the bundle in Node before anything is
# uploaded. A release uploads the zip, publishes a version described "<commit> sha256:<zip>", and
# moves `live` to it: the alias names the exact artifact. Then `make -C .. engine-smoke ENV=$(ENV)`
# runs one turn against it. runner-rollback VERSION=<n> points `live` back; runner-status reads it.
RUNNER_ZIP := ../apps/runner/dist/runner.zip
RUNNER_ENTRY := $(abspath ../apps/runner/dist/index.mjs)
RUNNER_PATHS := apps/runner packages/jadwigo-ai packages/store packages/contracts packages/core packages/lesson-import bun.lock

runner-deploy:
	@$(NOT_FROM_AGENT)
	@test -z "$$(git -C .. status --porcelain)" || { echo "runner-deploy: the tree has changes; a version names a commit, so commit or stash them first"; exit 1; }
	@fn=$$($(TF) output -raw runner_function_name) && \
	live=$$($(AWS) lambda get-alias --function-name $$fn --name live --query FunctionVersion --output text) && \
	shipped=$$($(AWS) lambda get-function-configuration --function-name $$fn --qualifier $$live --query Description --output text | cut -d' ' -f1) && \
	if [ -z "$(FORCE)" ] && git -C .. cat-file -e "$$shipped^{commit}" 2>/dev/null && git -C .. diff --quiet "$$shipped" HEAD -- $(RUNNER_PATHS); then \
	  echo "runner-deploy: nothing the runner bundles changed since $$shipped (version $$live is live); FORCE=1 deploys anyway"; exit 0; fi && \
	$(MAKE) -C .. runner-bundle && \
	node --input-type=module -e "const m = await import('$(RUNNER_ENTRY)'); if (typeof m.handler !== 'function') process.exit(1);" && \
	rm -f $(RUNNER_ZIP) && zip -qj $(RUNNER_ZIP) $(RUNNER_ENTRY) && \
	sum=$$(shasum -a 256 $(RUNNER_ZIP) | cut -d' ' -f1) && commit=$$(git -C .. rev-parse HEAD) && \
	$(AWS) lambda update-function-code --function-name $$fn --zip-file fileb://$(RUNNER_ZIP) --architectures arm64 >/dev/null && \
	$(AWS) lambda wait function-updated-v2 --function-name $$fn && \
	v=$$($(AWS) lambda publish-version --function-name $$fn --description "$$commit sha256:$$sum" --query Version --output text) && \
	$(AWS) lambda update-alias --function-name $$fn --name live --function-version $$v >/dev/null && \
	echo "runner-deploy: $$fn live is version $$v ($$commit, sha256:$$sum); it was $$live. Next: make -C .. engine-smoke ENV=$(ENV). Back: make -C infra runner-rollback VERSION=$$live"

runner-rollback:
	@$(NOT_FROM_AGENT)
	@test -n "$(VERSION)" || { echo "runner-rollback: VERSION=<the version to point live at>; runner-status names the live one"; exit 1; }
	fn=$$($(TF) output -raw runner_function_name) && \
	$(AWS) lambda update-alias --function-name $$fn --name live --function-version $(VERSION) >/dev/null && \
	echo "runner-rollback: $$fn live is version $(VERSION)"

# Read-only: the live version and the commit and zip hash it was published with.
runner-status:
	@fn=$$($(TF) output -raw runner_function_name) && \
	live=$$($(AWS) lambda get-alias --function-name $$fn --name live --query FunctionVersion --output text) && \
	echo "runner-status: $$fn live is version $$live: $$($(AWS) lambda get-function-configuration --function-name $$fn --qualifier $$live --query Description --output text)"

# The step-host probe's Lambda on jadwigo-dev (dl-z5ja.5): a root of its own, terraform/probes/step-host,
# whose state sits beside prod's under its own key, so neither plan ever reads the other. The owner
# applies it before `make step-probe HOST=lambda ENV=dev` and destroys it once the numbers are on the
# issue. Plan reads only; apply and destroy are the owner's, from a terminal.
PROBE_TF := AWS_PROFILE=$(AWS_PROFILE) terraform -chdir=terraform/probes/step-host

probe-step-host-plan:
	$(PROBE_TF) init -input=false
	$(PROBE_TF) plan

probe-step-host-apply:
	@$(NOT_FROM_AGENT)
	$(PROBE_TF) init -input=false
	$(PROBE_TF) apply

probe-step-host-destroy:
	@$(NOT_FROM_AGENT)
	$(PROBE_TF) init -input=false
	$(PROBE_TF) destroy

# No AWS: what CI and `make check` can run.
fmt:
	terraform -chdir=terraform fmt -check -recursive

# -no-tests: terraform 1.17's validate cannot map a child module's aliased provider (aws.us_east_1)
# in a test run block and fails with a "Provider configuration not present" that names a different
# resource each time. `test` below reads, validates and runs those files instead.
validate:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform validate -no-tests
	terraform -chdir=terraform/probes/step-host init -backend=false -input=false >/dev/null && terraform -chdir=terraform/probes/step-host validate

# terraform/tests/*.tftest.hcl against mock providers: no credentials, no AWS call. init fetches the
# providers the lock file pins, once; after that it runs offline (dl-5ssh.90.17). prod.tfvars is the
# root's input, so a run that plans the root (tests/root_auth_domain.tftest.hcl) reads what an apply
# would; a run of one module ignores it (dl-e8ov.2.77).
test:
	terraform -chdir=terraform init -backend=false -input=false >/dev/null && terraform -chdir=terraform test -var-file=environments/prod.tfvars
