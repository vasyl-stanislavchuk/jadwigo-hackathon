#!/usr/bin/env bash
# Supabase Auth settings as code (dl-e8ov.2.40): <env>.json beside this script holds a project's ref
# and the settings we own; the rest of the project's auth config is left as Supabase has it.
#   auth.sh diff [prod|dev ...]    GET each project's auth config and print what would change. Exits 2
#                                  when something differs, 1 when a keychain item is missing, 0 when
#                                  nothing differs. Read-only.
#   auth.sh apply [prod|dev ...]   PATCH the differing settings. The owner runs it, from a terminal.
# With no env named, both. The Management API token is SUPABASE_ACCESS_TOKEN, else read from
# ~/.config/jadwigo/supabase.env; it goes to curl on stdin, never in argv, and is never printed.
# SUPABASE_API_URL points the script at another Management API (the test's fake).
#
# Secrets (dl-e8ov.2.52): <env>.json's "secrets" names a macOS keychain item (account jadwigo) for
# each secret setting, for example "external_google_secret": "jadwigo-google-oauth-secret-dev". The
# value is read when needed, reaches curl on stdin inside the PATCH body, and is never printed: the
# diff shows a secret as (not set), (another value), (set) or missing. A *_secret key in "settings"
# is refused, and so is an *_email_optional that is not false: a sign-in with no email stays refused.
# Bash 3.2, as macOS ships it.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
api="${SUPABASE_API_URL:-https://api.supabase.com/v1}"

mode="${1:-}"
case "$mode" in
  diff | apply) shift ;;
  *) echo "usage: $0 diff|apply [prod|dev ...]" >&2; exit 64 ;;
esac
[ $# -gt 0 ] || set -- prod dev

if [ "$mode" = apply ] && [ -n "${CLAUDECODE:-}" ]; then
  echo "auth.sh apply: the owner applies, from a terminal, not from an agent's shell" >&2
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ] && [ -f "$HOME/.config/jadwigo/supabase.env" ]; then
  # shellcheck source=/dev/null
  SUPABASE_ACCESS_TOKEN="$(. "$HOME/.config/jadwigo/supabase.env" && printf %s "${SUPABASE_ACCESS_TOKEN:-}")"
fi
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "auth.sh: no SUPABASE_ACCESS_TOKEN in the environment or in ~/.config/jadwigo/supabase.env" >&2
  exit 1
fi

# A string in curl's config syntax: backslashes and double quotes escaped, then quoted.
config_quote() {
  local s="${1//\\/\\\\}"
  printf '"%s"' "${s//\"/\\\"}"
}

# curl with its config on stdin (-K -): the token as a header and, when supa_body is set, the request
# body. Neither is in any process listing.
supa_body=""
supa() {
  {
    printf 'header = "Authorization: Bearer %s"\n' "$SUPABASE_ACCESS_TOKEN"
    [ -z "$supa_body" ] || printf 'data-binary = %s\n' "$(config_quote "$supa_body")"
  } | curl -sS --fail-with-body -K - -H "Content-Type: application/json" "$@"
}

# A keychain item's value on stdout; non-zero when the item is absent.
keychain() {
  security find-generic-password -a jadwigo -s "$1" -w 2>/dev/null
}

sha256() {
  if command -v shasum >/dev/null; then shasum -a 256; else sha256sum; fi | cut -d ' ' -f 1
}

# "<key><TAB><keychain item>" for each secret an env file names.
secrets_of() {
  jq -r '(.secrets // {}) | to_entries[] | "\(.key)\t\(.value)"' "$1"
}

tab="$(printf '\t')"

for env in "$@"; do
  file="$here/$env.json"
  [ -f "$file" ] || { echo "auth.sh: no $file" >&2; exit 64; }
  if ! jq -e '(.settings | keys | map(select(endswith("_secret") or endswith("_secrets"))) == [])
      and ([.settings | to_entries[] | select(.key | endswith("_email_optional")) | .value] | all(. == false))' \
    "$file" >/dev/null; then
    echo "auth.sh: $file has a secret in settings or an *_email_optional that is not false" >&2
    exit 64
  fi
done

# apply sends nothing to any project while a keychain item it names is missing.
if [ "$mode" = apply ]; then
  for env in "$@"; do
    while IFS="$tab" read -r key item; do
      keychain "$item" >/dev/null || {
        echo "auth.sh apply: $env: $key's keychain item $item is missing; nothing sent" >&2
        exit 1
      }
    done < <(secrets_of "$here/$env.json")
  done
fi

status=0
missing=0
for env in "$@"; do
  file="$here/$env.json"
  ref="$(jq -r .ref "$file")"
  want="$(jq -c .settings "$file")"
  # The live config holds every setting, so it stays in this variable and reaches jq only on stdin.
  live="$(supa "$api/projects/$ref/config/auth")"
  have="$(printf %s "$live" | jq -c --argjson want "$want" 'with_entries(select(.key | in($want)))')"
  # The settings whose live value differs from the file, as the PATCH body.
  patch="$(jq -cn --argjson want "$want" --argjson have "$have" '$want | with_entries(select(.value != $have[.key]))')"
  lines="$(jq -rn --argjson patch "$patch" --argjson have "$have" \
    '$patch | to_entries[] | "  \(.key): \($have[.key] | tojson) -> \(.value | tojson)"')"

  # Secrets. GET /config/auth answers null for a secret never set, and for one that is set the
  # SHA-256 hex of the value (what the supabase CLI's config push compares against). So null differs,
  # a hash equal to the keychain value's is in step, and another hash differs. Anything else can't be
  # compared and counts as in step, so a secret never makes every diff exit 2 forever.
  secret_objects=""
  env_missing=0
  while IFS="$tab" read -r key item; do
    if ! value="$(keychain "$item")"; then
      lines="${lines:+$lines
}  $key: missing from the keychain ($item)"
      env_missing=1
      continue
    fi
    live_secret="$(printf %s "$live" | jq -r --arg k "$key" '.[$k] // "" | ltrimstr("hash:")')"
    if [ -z "$live_secret" ]; then
      shown="(not set)"
    elif [ "$live_secret" = "$(printf %s "$value" | sha256)" ] || [ "$live_secret" = "$value" ]; then
      continue
    elif printf %s "$live_secret" | grep -Eq '^[0-9a-f]{64}$'; then
      shown="(another value)"
    else
      continue
    fi
    lines="${lines:+$lines
}  $key: $shown -> (set)"
    secret_objects="$secret_objects$(printf %s "$value" | jq -Rsc --arg k "$key" '{($k): .}')
"
  done < <(secrets_of "$file")

  if [ -z "$lines" ]; then
    echo "$env ($ref): in step"
    continue
  fi
  echo "$env ($ref): would change"
  printf '%s\n' "$lines"

  if [ "$env_missing" = 1 ]; then
    missing=1
  elif [ "$mode" = apply ]; then
    # The settings and the secrets as one body, merged on stdin and sent on curl's stdin.
    supa_body="$(printf '%s\n%s' "$patch" "$secret_objects" | jq -cs add)"
    supa -X PATCH "$api/projects/$ref/config/auth" >/dev/null
    supa_body=""
    echo "$env ($ref): applied"
  else
    status=2
  fi
done
[ "$missing" = 0 ] || exit 1
exit "$status"
