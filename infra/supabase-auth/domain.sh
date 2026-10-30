#!/usr/bin/env bash
# Prod's Supabase custom domain, prod.json's custom_domain (dl-e8ov.2.65,
# jadwigo-platform/decisions/2026-10-30-prod-supabase-auth-runs-on-the-custom-domain-auth-jadwigo-pl-so),
# through the Management API. docs/runbooks/social-sign-in.md, "The custom domain", is the order.
#   domain.sh status     GET the domain's state and print the DNS records Supabase asks for, as the
#                        auth_domain_txt block for infra/terraform/environments/prod.tfvars. Read-only.
#   domain.sh create     start the domain on the project. It switches on the paid add-on. The owner's.
#   domain.sh reverify   ask Supabase to check the DNS records again. The owner's.
#   domain.sh activate   switch Auth onto the domain, once status is 4_origin_setup_completed. The owner's.
#   domain.sh issuer     sign in by email code through the domain and check the access token against
#                        the API Gateway authorizer: its iss, and an RS256 signature with a key the
#                        JWKS publishes. It sends an email. The owner's, after activate.
# The owner's commands refuse an agent's shell, as auth.sh apply does. The token, the email code and the
# access token reach curl on stdin, never argv, and are never printed. SUPABASE_API_URL and
# SUPABASE_AUTH_URL point the script at a fake (the test's).
# Bash 3.2, as macOS ships it.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
api="${SUPABASE_API_URL:-https://api.supabase.com/v1}"
file="$here/prod.json"
ref="$(jq -r .ref "$file")"
domain="$(jq -r '.custom_domain // empty' "$file")"
[ -n "$domain" ] || { echo "domain.sh: $file names no custom_domain" >&2; exit 64; }
auth="${SUPABASE_AUTH_URL:-https://$domain/auth/v1}"
# What the authorizer pins: jwt_issuer in infra/terraform/main.tf.
issuer="https://$ref.supabase.co/auth/v1"

cmd="${1:-}"
case "$cmd" in
  status) ;;
  create | reverify | activate | issuer)
    if [ -n "${CLAUDECODE:-}" ]; then
      echo "domain.sh $cmd: the owner runs it, from a terminal, not from an agent's shell" >&2
      exit 1
    fi
    ;;
  *) echo "usage: $0 status|create|reverify|activate|issuer" >&2; exit 64 ;;
esac

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "$HOME/.config/jadwigo/supabase.env" ]; then
  # shellcheck source=/dev/null
  SUPABASE_ACCESS_TOKEN="$(. "$HOME/.config/jadwigo/supabase.env" && printf %s "${SUPABASE_ACCESS_TOKEN:-}")"
fi
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "domain.sh: no SUPABASE_ACCESS_TOKEN in the environment or in ~/.config/jadwigo/supabase.env" >&2
  exit 1
fi

# A string in curl's config syntax: backslashes and double quotes escaped, then quoted.
config_quote() {
  local s="${1//\\/\\\\}"
  printf '"%s"' "${s//\"/\\\"}"
}

# curl with its config on stdin (-K -): each "Name: value" header given before --, then the body
# when there is one, so none of them is in any process listing. The rest are curl's arguments.
#   http [header ...] -- [body] -- curl-args...
http() {
  local config="" body
  while [ "$1" != -- ]; do config="${config}header = $(config_quote "$1")
"; shift; done
  shift
  body="$1"
  shift 2
  [ -z "$body" ] || config="${config}data-binary = $(config_quote "$body")
"
  printf %s "$config" | curl -sS --fail-with-body -K - -H "Content-Type: application/json" "$@"
}

supa() {
  local body="$1"
  shift
  http "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -- "$body" -- "$@"
}

status() {
  local state
  state="$(supa "" "$api/projects/$ref/custom-hostname")"
  printf %s "$state" | jq -r --arg ref "$ref" '
    "status: \(.status)",
    "hostname: \(.custom_hostname // .data.result.hostname // "none")",
    "ssl: \(.data.result.ssl.status // "none")",
    (.data.result.verification_errors // [] | .[] | "verification error: \(.)"),
    (.data.result.ssl.validation_errors // [] | .[] | "ssl error: \(.message)"),
    "",
    "DNS: the CNAME \(.custom_hostname // .data.result.hostname) -> \($ref).supabase.co (infra/terraform/auth_domain.tf), and in prod.tfvars:",
    "auth_domain_txt = {",
    ([.data.result.ownership_verification // empty | select(.name and .value) | {name, value}]
      + [.data.result.ssl.validation_records // [] | .[] | select(.txt_name and .txt_value) | {name: .txt_name, value: .txt_value}]
      | .[] | "  \(.name | tojson) = \(.value | tojson)"),
    "}"'
}

case "$cmd" in
  status)
    status
    ;;
  create)
    supa "$(jq -cn --arg d "$domain" '{custom_hostname: $d}')" -X POST \
      "$api/projects/$ref/custom-hostname/initialize" >/dev/null
    echo "$domain: created on $ref"
    status
    ;;
  reverify)
    supa "" -X POST "$api/projects/$ref/custom-hostname/reverify" >/dev/null
    status
    ;;
  activate)
    now="$(supa "" "$api/projects/$ref/custom-hostname" | jq -r .status)"
    if [ "$now" != 4_origin_setup_completed ]; then
      echo "domain.sh activate: status is $now, not 4_origin_setup_completed; run reverify until it is" >&2
      exit 1
    fi
    supa "" -X POST "$api/projects/$ref/custom-hostname/activate" >/dev/null
    echo "$domain: activated on $ref"
    status
    ;;
  issuer)
    # The publishable key a browser holds; the legacy anon key while the project has none.
    key="$(supa "" "$api/projects/$ref/api-keys" |
      jq -r '(map(select(.type == "publishable")) + map(select(.name == "anon"))) | .[0].api_key // empty')"
    [ -n "$key" ] || { echo "domain.sh issuer: $ref has no publishable or anon key" >&2; exit 1; }
    printf 'Your email, an account that already exists on %s: ' "$ref"
    read -r email
    http "apikey: $key" -- "$(printf %s "$email" | jq -Rc '{email: ., create_user: false}')" -- \
      -X POST "$auth/otp" >/dev/null
    printf 'The code from the email: '
    read -r code
    # The session stays in this variable; only the token's header and claims are read from it.
    # The email and the code reach jq on stdin, so neither is in an argv either.
    body="$(printf '%s\n%s\n' "$email" "$code" | jq -Rnc '[inputs] | {type: "email", email: .[0], token: .[1]}')"
    session="$(http "apikey: $key" -- "$body" -- -X POST "$auth/verify")"
    claims="$(printf %s "$session" | jq -c '.access_token | split(".") | map(gsub("-"; "+") | gsub("_"; "/")) |
      {header: (.[0] | @base64d | fromjson), payload: (.[1] | @base64d | fromjson)} |
      {iss: .payload.iss, alg: .header.alg, kid: .header.kid}')"
    jwks="$(curl -sS --fail-with-body "$auth/.well-known/jwks.json")"
    printf %s "$jwks" | jq -r --argjson c "$claims" --arg want "$issuer" '
      ([.keys[] | select(.kid == $c.kid)] | .[0]) as $key |
      "iss: \($c.iss)", "alg: \($c.alg)", "kid: \($c.kid)",
      "the authorizer pins: \($want)",
      "the JWKS key for that kid: \(if $key then "\($key.kty) \($key.alg // "")" else "none" end)"'
    if printf %s "$jwks" | jq -e --argjson c "$claims" --arg want "$issuer" '
        $c.iss == $want and $c.alg == "RS256" and any(.keys[]; .kid == $c.kid and .kty == "RSA")' >/dev/null; then
      echo "matches the authorizer: jwt_issuer stays as it is"
    else
      echo "DIFFERS: stop and tell the lead before any deploy. An iss other than the pinned one means" \
        "jwt_issuer in infra/terraform/main.tf and apps/api's AUTH_JWKS_URL change; an alg other than" \
        "RS256 means the authorizer refuses every token." >&2
      exit 1
    fi
    ;;
esac
