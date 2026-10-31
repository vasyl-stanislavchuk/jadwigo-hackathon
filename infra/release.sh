#!/bin/sh
# make release: origin/main to prod with one typed prod (dl-5ssh.34.67, decision bead dl-sh8m).
# The owner runs it from their own terminal; a merge still deploys nothing.
#   1. checks: a terminal and no agent, a clean checkout at origin/main, the AWS account
#   2. preview, writing nothing: the migrations prod lacks, a saved Terraform plan, prod-status
#   3. one question: type prod
#   4. the release, without stopping: migrations, jadwigo_api's login, the seed, the saved plan,
#      the api, a health check, the web, the site and the docs, then prod-status again
# It stops before the question when the plan destroys or replaces anything: apply that by hand
# (make -C infra plan apply). Every step is safe to rerun, so after a failure run it again.
set -eu
ACCOUNT=843109108289
APP=${JW_APP_URL:-https://app.jadwigo.pl}

say() { printf '\n== %s\n' "$*"; }
die() {
  echo "release: $*"
  exit 1
}

if [ -n "${CLAUDECODE:-}" ] || [ ! -t 0 ]; then
  die "run it from your own terminal, where it asks you to type prod once"
fi
cd "$(git rev-parse --show-toplevel)"
# terraform at the version mise pins, as infra/Makefile has it.
if command -v mise >/dev/null 2>&1; then PATH="$(mise bin-paths 2>/dev/null | tr '\n' ':')$PATH"; fi
PROFILE=$(sed -n 's/^AWS_PROFILE := *//p' infra/aws.mk)
TF="terraform -chdir=infra/terraform"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
plan="$work/release.tfplan"

say "1/4 checks"
git fetch -q origin main
[ -z "$(git status --porcelain)" ] || die "the checkout has local changes; release ships origin/main only"
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] ||
  die "HEAD is not origin/main. git switch main && git pull --rebase=merges, then run it again"
bun install --frozen-lockfile >/dev/null
got=$(aws --profile "$PROFILE" sts get-caller-identity --query Account --output text) ||
  die "AWS profile $PROFILE does not log in"
[ "$got" = "$ACCOUNT" ] || die "AWS profile $PROFILE is account $got, not $ACCOUNT"
echo "origin/main $(git rev-parse --short HEAD), AWS $PROFILE -> $ACCOUNT"

say "2/4 preview: nothing is written yet"
# The dry run passes the gate's terminal check like any other; the token only skips the typed word,
# and db-push stops after its dry run.
{
  JW_RELEASE_CONFIRMED=prod make -s db-push ENV=prod DRY_RUN=1
  echo $? >"$work/dry-run.rc"
} | tee "$work/migrations.txt"
[ "$(cat "$work/dry-run.rc" 2>/dev/null)" = 0 ] || die "the migrations dry run failed"
migrations=$(grep -cE '[0-9]{14}_[A-Za-z0-9_]+\.sql' "$work/migrations.txt" || true)

make -s -C infra init >/dev/null
set +e
AWS_PROFILE=$PROFILE $TF plan -input=false -lock-timeout=60s -var-file=environments/prod.tfvars \
  -detailed-exitcode -out="$plan" >"$work/plan.txt" 2>&1
rc=$?
set -e
case $rc in
  0) tf=none ;;
  2) tf=changes ;;
  *)
    cat "$work/plan.txt"
    die "terraform plan failed"
    ;;
esac
if [ "$tf" = changes ]; then
  grep -E '^  # |^Plan:' "$work/plan.txt" || true
  risky=$($TF show -json "$plan" |
    jq -r '.resource_changes[] | select(.change.actions | index("delete")) | .address')
  if [ -n "$risky" ]; then
    printf '%s\n' "$risky"
    die "the plan destroys or replaces the resources above. Review and apply it by hand (make -C infra plan, then apply), then run release again"
  fi
else
  echo "terraform: no changes"
fi

make -s -C infra prod-status || true

say "3/4 one question"
printf 'Release %s to prod: %s migration(s), terraform %s, the seed, then api, web, site and docs. Type prod to go on: ' \
  "$(git rev-parse --short HEAD)" "$migrations" "$tf"
read -r answer
[ "$answer" = prod ] || die "nothing done on prod"
export JW_RELEASE_CONFIRMED=prod

say "4/4 release"
if [ "$migrations" -gt 0 ]; then make -s db-push ENV=prod; else echo "migrations: none to push"; fi
make -s db-role ENV=prod
make -s db-seed ENV=prod
if [ "$tf" = changes ]; then AWS_PROFILE=$PROFILE $TF apply -input=false "$plan"; fi
make -s -C infra api-deploy
code=000
for _ in 1 2 3 4 5 6; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$APP/api/health" || true)
  [ "$code" = 200 ] && break
  sleep 5
done
[ "$code" = 200 ] || die "GET /api/health answers $code after the api deploy; the web, site and docs are not deployed. Fix the api, then run release again"
echo "GET /api/health -> 200"
make -s -C infra web-deploy site-deploy docs-deploy
make -s -C infra prod-status || true
echo
echo "Released $(git rev-parse --short HEAD)."
