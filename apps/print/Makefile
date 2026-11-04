# The print Lambda's image (dl-1eieq.8.2), in the converter's shape. The owner runs image and push,
# from a terminal; the tag push prints goes into infra's prod.tfvars as print_image_tag, and
# `make -C infra plan apply` deploys it (dl-1eieq.8.5). `test` is what turbo and CI run; `sample`
# draws the 20-question fixture on this machine for the owner to read.
include ../../infra/aws.mk

ENV      ?= prod
REGION   ?= eu-central-1
REPO     := jadwigo-print-$(ENV)
TAG      ?= $(ENV)-$(shell git rev-parse --short HEAD)
LOCAL    := jadwigo-print:$(TAG)
AWS      := aws --profile $(AWS_PROFILE) --region $(REGION)
SHEET    ?= tests/fixtures/mixed-20.sheet.json
OUT      ?= $(or $(TMPDIR),/tmp)/jadwigo-print-sample.pdf
NOT_FROM_AGENT = if [ -n "$$CLAUDECODE" ]; then echo "$@: the owner builds and pushes the image, from a terminal, not from an agent's shell"; exit 1; fi

.PHONY: help test sample image image-check push

help: ## list targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  %-12s %s\n",$$1,$$2}'

test: ## pytest; the layout tests skip where pango is missing (brew install pango)
	uv run --frozen pytest -q

sample: ## draw SHEET (the 20-question fixture) to OUT with this machine's pango, its pictures from memory, and open it
	uv run --frozen python tests/sample.py $(SHEET) $(OUT)
	@if command -v open >/dev/null; then open $(OUT); fi

image: ## build the image for Lambda's arm64, tagged $(LOCAL)
	@$(NOT_FROM_AGENT)
	docker build --platform linux/arm64 --provenance=false -t $(LOCAL) .

image-check: ## draw the fixture inside the built image, and import the handler
	@$(NOT_FROM_AGENT)
	docker run --rm --platform linux/arm64 --entrypoint /bin/sh -v "$$PWD/tests/fixtures:/fixtures:ro" $(LOCAL) -c '\
	  python -c "import printer.handler" && python -m printer /fixtures/mixed-20.sheet.json /tmp/sample.pdf'

push: ## push $(LOCAL) to the env's ECR repo (the module makes it); prints the tag for print_image_tag
	@$(NOT_FROM_AGENT)
	@test -z "$$(git status --porcelain -- .)" || { echo "push: apps/print has changes; the tag names a commit, so commit them first"; exit 1; }
	$(eval REGISTRY := $(shell $(AWS) sts get-caller-identity --query Account --output text).dkr.ecr.$(REGION).amazonaws.com)
	$(AWS) ecr get-login-password | docker login --username AWS --password-stdin $(REGISTRY)
	docker tag $(LOCAL) $(REGISTRY)/$(REPO):$(TAG)
	docker push $(REGISTRY)/$(REPO):$(TAG)
	@echo 'print_image_tag = "$(TAG)"   # in infra/terraform/environments/$(ENV).tfvars'
