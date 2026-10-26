# Thin on purpose: every target calls turbo, bun or md. The gate is `make check`.
.PHONY: check check-all dev skills drops

## check: lint, typecheck and test what changed since main (turbo --affected), uv's pytest
## included, then the repo-wide checks turbo cannot scope: knip, dependency-cruiser, no-bank, worklog,
## drops, research and workflows
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

## skills: link each AI workflow in workflows/<name>/ into .claude/skills (Claude Code) and
## .agents/skills (other agents). The links are committed; tools/src/check-workflows.ts checks them
skills:
	mkdir -p .claude/skills .agents/skills
	for d in workflows/*/; do n=$$(basename "$$d"); ln -sfn "../../workflows/$$n" ".claude/skills/$$n"; ln -sfn "../../workflows/$$n" ".agents/skills/$$n"; done

## drops: md drops check on every drop under docs/drops/
drops:
	for d in docs/drops/*/; do [ -d "$$d" ] && md drops check "$$d"; done; true
