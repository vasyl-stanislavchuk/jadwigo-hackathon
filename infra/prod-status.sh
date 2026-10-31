#!/bin/sh
# What is live on prod, against origin/main (dl-5ssh.34.65). Read-only, so it runs from an agent's shell too.
# Each deploy writes the commit it shipped: version/api.txt and version/web.txt on app.<apex>,
# version.txt on the site and the docs, as "<sha> <UTC time>[ dirty]". For each service this prints that
# commit, or the last-modified date before the first stamped deploy, and how many commits on main touch
# the service's paths since: 0 means up to date. It changes nothing remote (its only write is the
# local `git fetch` of origin/main), and a failed probe prints "unknown".
# Env: JW_APP_URL, JW_SITE_URL, JW_DOCS_URL, JW_API_FUNCTION, JW_REF (default origin/main), JADWIGO_AWS_PROFILE (not AWS_PROFILE: an exported one must not win silently, as in aws.mk).
set -u
APP=${JW_APP_URL:-https://app.jadwigo.pl}
SITE=${JW_SITE_URL:-https://jadwigo.pl}
DOCS=${JW_DOCS_URL:-https://docs.jadwigo.pl}
FN=${JW_API_FUNCTION:-jadwigo-api-prod}
REF=${JW_REF:-origin/main}
behind=0

case $REF in origin/*) git fetch -q origin "${REF#origin/}" 2>/dev/null || echo "prod-status: no fetch; comparing to the local $REF" ;; esac
# Paths below are the repo's, wherever make or a shell started this.
cd "$(git rev-parse --show-toplevel)" || exit 1
# The profile is written once, in infra/aws.mk.
PROFILE=${JADWIGO_AWS_PROFILE:-$(sed -n 's/^AWS_PROFILE := *//p' infra/aws.mk)}
git rev-parse -q --verify "$REF^{commit}" >/dev/null || { echo "prod-status: no commit $REF"; exit 1; }

# The first line of a stamp file, or nothing.
stamp() { curl -fsS -m 10 "$1" 2>/dev/null | head -n 1; }
# A Last-Modified header, which git rev-list --since reads, or nothing.
modified() {
  curl -fsSI -m 10 "$1" 2>/dev/null | tr -d '\r' | sed -n 's/^[Ll]ast-[Mm]odified: *//p' | head -n 1
}
# The Lambda's LastModified, or nothing.
lambda_modified() {
  aws --profile "$PROFILE" --region eu-central-1 lambda get-function-configuration \
    --function-name "$FN" --query LastModified --output text 2>/dev/null
}

# row <service> <stamp> <fallback date> <path>...
row() {
  name=$1 st=$2 when=$3
  shift 3
  sha=${st%% *}
  if [ -n "$sha" ] && git cat-file -e "$sha^{commit}" 2>/dev/null; then
    live="$(git rev-parse --short "$sha") (${st#* })"
    n=$(git rev-list --count "$sha..$REF" -- "$@")
  elif [ -n "$when" ]; then
    live="unstamped, modified $when"
    n=$(git rev-list --count --since="$when" "$REF" -- "$@")
  else
    printf '%-5s %-56s %s\n' "$name" unknown "?"
    behind=1
    return
  fi
  [ "$n" -eq 0 ] || behind=1
  printf '%-5s %-56s %s\n' "$name" "$live" "$n"
}

printf '%-5s %-56s %s\n' service live "commits on $REF since"
row api "$(stamp "$APP/version/api.txt")" "$(lambda_modified)" \
  apps/api packages/contracts packages/core packages/lesson-import packages/store packages/config bun.lock
row web "$(stamp "$APP/version/web.txt")" "$(modified "$APP/")" \
  apps/web packages ':!packages/bank' ':!packages/testing' infra/web-build bun.lock
row site "$(stamp "$SITE/version.txt")" "$(modified "$SITE/")" \
  apps/site packages/ui packages/copy packages/config bun.lock
row docs "$(stamp "$DOCS/version.txt")" "$(modified "$DOCS/")" \
  apps/docs apps/cli packages ':!packages/bank' ':!packages/testing' bun.lock
echo
if [ "$behind" -eq 0 ]; then
  echo "prod-status: every service is up to date with $REF"
else
  echo "prod-status: behind or unknown. Migrations and Terraform are not shown: make db-push ENV=prod DRY_RUN=1, make -C infra plan"
  echo "Then the code: make -C infra deploy-all"
fi
