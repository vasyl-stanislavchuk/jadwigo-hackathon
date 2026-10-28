#!/usr/bin/env bash
# Supabase Auth settings as code (dl-e8ov.2.40): <env>.json beside this script holds a project's ref
# and the settings we own; the rest of the project's auth config is left as Supabase has it.
#   auth.sh diff [prod|dev ...]    GET each project's auth config and print what would change. Exits 2
#                                  when something differs, 0 when nothing does. Read-only.
#   auth.sh apply [prod|dev ...]   PATCH the differing settings. The owner runs it, from a terminal.
# With no env named, both. The Management API token is SUPABASE_ACCESS_TOKEN, else read from
# ~/.config/jadwigo/supabase.env; it goes to curl on stdin, never in argv, and is never printed.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
api="https://api.supabase.com/v1"

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

# curl with the token as a header read from stdin (-K -), so it is in no process listing.
supa() {
  printf 'header = "Authorization: Bearer %s"\n' "$SUPABASE_ACCESS_TOKEN" |
    curl -sS --fail-with-body -K - -H "Content-Type: application/json" "$@"
}

status=0
for env in "$@"; do
  file="$here/$env.json"
  [ -f "$file" ] || { echo "auth.sh: no $file" >&2; exit 64; }
  ref="$(jq -r .ref "$file")"
  want="$(jq -c .settings "$file")"
  have="$(supa "$api/projects/$ref/config/auth" | jq -c --argjson want "$want" 'with_entries(select(.key | in($want)))')"
  # The settings whose live value differs from the file, as the PATCH body.
  patch="$(jq -cn --argjson want "$want" --argjson have "$have" '$want | with_entries(select(.value != $have[.key]))')"

  if [ "$patch" = "{}" ]; then
    echo "$env ($ref): in step"
    continue
  fi
  echo "$env ($ref): would change"
  jq -rn --argjson patch "$patch" --argjson have "$have" \
    '$patch | to_entries[] | "  \(.key): \($have[.key] | tojson) -> \(.value | tojson)"'

  if [ "$mode" = apply ]; then
    supa -X PATCH --data "$patch" "$api/projects/$ref/config/auth" >/dev/null
    echo "$env ($ref): applied"
  else
    status=2
  fi
done
exit "$status"
