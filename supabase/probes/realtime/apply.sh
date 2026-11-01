#!/usr/bin/env bash
# Applies the Realtime probe's setup.sql or cleanup.sql (dl-z5ja.6) to jadwigo-dev, and to nothing
# else: the URL must name the dev project's ref (infra/supabase-auth/dev.json). It is
# JW_DEV_DATABASE_URL, else SUPABASE_DB_URL_DEV in ~/.config/jadwigo/supabase.env (the Makefile's
# SUPABASE_SECRETS, which must be mode 600).
#   supabase/probes/realtime/apply.sh setup | cleanup
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
step=${1:-}
case "$step" in setup | cleanup) ;; *) echo "usage: $0 setup|cleanup" >&2; exit 2 ;; esac
url=${JW_DEV_DATABASE_URL:-}
secrets="$HOME/.config/jadwigo/supabase.env"
if [ -z "$url" ] && [ -f "$secrets" ]; then
  [ "$(stat -f %Lp "$secrets")" = 600 ] || { echo "run chmod 600 $secrets first" >&2; exit 2; }
  url=$(set -a; . "$secrets"; printf %s "${SUPABASE_DB_URL_DEV:-}")
fi
[ -n "$url" ] || { echo "JW_DEV_DATABASE_URL is unset, and so is SUPABASE_DB_URL_DEV in $secrets" >&2; exit 2; }
ref=$(jq -r .ref "$here/../../../infra/supabase-auth/dev.json")
case "$url" in *"$ref"*) ;; *) echo "the database URL does not name jadwigo-dev ($ref); refusing" >&2; exit 2 ;; esac
exec psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$here/$step.sql"
