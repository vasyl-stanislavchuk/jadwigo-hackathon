#!/usr/bin/env bash
# Applies the Realtime probe's setup.sql or cleanup.sql (dl-z5ja.6) to jadwigo-dev, and to nothing
# else: JW_DEV_DATABASE_URL must name the dev project's ref (infra/supabase-auth/dev.json).
#   supabase/probes/realtime/apply.sh setup | cleanup
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
step=${1:-}
case "$step" in setup | cleanup) ;; *) echo "usage: $0 setup|cleanup" >&2; exit 2 ;; esac
url=${JW_DEV_DATABASE_URL:-}
[ -n "$url" ] || { echo "JW_DEV_DATABASE_URL is unset: jadwigo-dev's connection string" >&2; exit 2; }
ref=$(jq -r .ref "$here/../../../infra/supabase-auth/dev.json")
case "$url" in *"$ref"*) ;; *) echo "JW_DEV_DATABASE_URL does not name jadwigo-dev ($ref); refusing" >&2; exit 2 ;; esac
exec psql "$url" -X -q -v ON_ERROR_STOP=1 -f "$here/$step.sql"
