# shellcheck shell=bash
# Shared by the numbered scripts in infra/bootstrap: the account, the profile, and the refusal to run
# from an agent's shell. These scripts change IAM, which is the owner's (AGENTS.md, one-way doors).
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ACCOUNT=843109108289
# The profile infra/aws.mk pins; a command line still wins (AWS_PROFILE=other ./00-oidc.sh).
PROFILE="${AWS_PROFILE:-$(sed -n 's/^AWS_PROFILE := //p' "$HERE/../aws.mk")}"
AWS=(aws --profile "$PROFILE" --output text)

step() { printf '\n==> %s\n' "$*"; }

if [ -n "${CLAUDECODE:-}" ]; then
  echo "$(basename "$0"): the owner runs this, from a terminal, not from an agent's shell" >&2
  exit 1
fi

got=$("${AWS[@]}" sts get-caller-identity --query Account)
if [ "$got" != "$ACCOUNT" ]; then
  echo "$(basename "$0"): profile $PROFILE is account $got, not $ACCOUNT" >&2
  exit 1
fi
