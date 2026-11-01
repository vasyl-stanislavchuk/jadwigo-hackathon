# The converter's image (dl-z5ja.11.8), as ~/projects/lambda-docx-conversion builds it. The owner
# runs image and push, from a terminal; the tag push prints goes into infra's prod.tfvars as
# converter_image_tag, and `make -C infra plan apply` deploys it (infra/README.md, Converter).
# `test` is what turbo and CI run.
include ../../infra/aws.mk

ENV      ?= prod
REGION   ?= eu-central-1
REPO     := jadwigo-converter-$(ENV)
TAG      ?= $(ENV)-$(shell git rev-parse --short HEAD)
LOCAL    := jadwigo-converter:$(TAG)
AWS      := aws --profile $(AWS_PROFILE) --region $(REGION)
NOT_FROM_AGENT = if [ -n "$$CLAUDECODE" ]; then echo "$@: the owner builds and pushes the image, from a terminal, not from an agent's shell"; exit 1; fi

.PHONY: help test image image-check push

help: ## list targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n",$$1,$$2}'

test: ## pytest; the soffice, poppler and heif-convert tests skip where the tool is missing
	uv run --frozen pytest -q

image: ## build the image for Lambda's x86_64, tagged $(LOCAL)
	@$(NOT_FROM_AGENT)
	docker build --platform linux/amd64 --provenance=false -t $(LOCAL) .

image-check: ## start each tool inside the built image, and import the handler
	@$(NOT_FROM_AGENT)
	docker run --rm --platform linux/amd64 --entrypoint /bin/sh $(LOCAL) -c '\
	  $$SOFFICE_BIN --version && $$PDFINFO_BIN -v && $$PDFTOPPM_BIN -v && $$HEIF_CONVERT_BIN --version && \
	  python -c "import converter.handler"'

push: ## push $(LOCAL) to the env's ECR repo (the module makes it); prints the tag for converter_image_tag
	@$(NOT_FROM_AGENT)
	@test -z "$$(git status --porcelain -- .)" || { echo "push: apps/converter has changes; the tag names a commit, so commit them first"; exit 1; }
	$(eval REGISTRY := $(shell $(AWS) sts get-caller-identity --query Account --output text).dkr.ecr.$(REGION).amazonaws.com)
	$(AWS) ecr get-login-password | docker login --username AWS --password-stdin $(REGISTRY)
	docker tag $(LOCAL) $(REGISTRY)/$(REPO):$(TAG)
	docker push $(REGISTRY)/$(REPO):$(TAG)
	@echo 'converter_image_tag = "$(TAG)"   # in infra/terraform/environments/$(ENV).tfvars'
