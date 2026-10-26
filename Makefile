# Thin on purpose: every target calls turbo, bun or md. The gate is `make check`.
.PHONY: check check-all dev skills drops

## check: lint, typecheck and test what changed since main (turbo --affected), uv's pytest
## included, then the repo-wide checks turbo cannot scope: knip, dependency-cruiser, no-bank, worklog
check:
	bunx turbo run lint typecheck test --affected
	bun run lint:repo

## check-all: the same on every package
check-all:
	bunx turbo run lint typecheck test
	bun run lint:repo

## dev: every app's dev server (ports from md's environment, tools/src/ports.ts)
dev:
	bunx turbo run dev

## skills: link the AI workflows in workflows/ into .claude/commands
skills:
	mkdir -p .claude/commands
	for f in workflows/*.md; do [ -e "$$f" ] && ln -sf "../../$$f" .claude/commands/; done; true

## drops: md drops check on every drop under docs/drops/
drops:
	for d in docs/drops/*/; do [ -d "$$d" ] && md drops check "$$d"; done; true
