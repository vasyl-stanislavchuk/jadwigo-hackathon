#!/bin/sh
# The step-host probe (dl-z5ja.5): one chat turn's steps on a host, measured. `make step-probe-local`
# runs `local`; the owner runs `make step-probe HOST=lambda|edge ENV=dev CONFIRM=dev`, which sets the
# variables below and calls this. Each mode seeds a made-up pod and one parent message as jadwigo_api
# (the API's path: the first step goes to agent_step), invokes the host twice (cold, then warm, a new
# message each time), and prints the comparison row from what the host answered and the run's log.
# The model is scripted (apps/runner/src/probe.ts): no paid call anywhere.
#
#   local   the Lambda bundle in this machine's Node, then the Edge bundle in Deno 2.1 with its
#           network limited to the local Postgres. DATABASE_URL: a localhost jadwigo* database.
#   lambda  uploads the bundle to the probe root's function (infra/terraform/probes/step-host, which
#           the owner applied), publishes a version, moves `live` to it, invokes `live` twice.
#           Needs API_URL, API_PASSWORD, RUNNER_URL, AWS_PROFILE.
#   edge    sets the RUNNER_DATABASE_URL secret, deploys supabase/functions/agent-step, POSTs to it
#           twice. Needs API_URL, API_PASSWORD, RUNNER_URL, SUPABASE_REF, SUPABASE_ACCESS_TOKEN.
#
# Secrets go through files of mode 600 that are removed at once, never a command line.
set -eu

host=${1:-}
root=$(cd "$(dirname "$0")/../../.." && pwd)
cli="$root/apps/runner/src/probe-cli.ts"
lambda_bundle="$root/apps/runner/dist/probe-lambda.mjs"
edge_bundle="$root/supabase/functions/agent-step/probe.bundle.mjs"
out="${TMPDIR:-/tmp}/jadwigo-step-probe"
mkdir -p "$out" && chmod 700 "$out"
umask 077
# Deno, the Edge runtime's major and minor, for the local dry run only. Not pinned in mise.toml: no
# target but this one runs Deno.
DENO_VERSION=2.1.4

# bun's seed and report, as jadwigo_api, under env -i: PATH, HOME, the URL and the password only.
api() {
  env -i PATH="$PATH" HOME="$HOME" USER="${USER:-}" PGPASSWORD="${API_PASSWORD:-}" DATABASE_URL="$API_URL" bun "$cli" "$@"
}

bytes() { wc -c < "$1" | tr -d ' '; }

ms_of() { awk -v s="$1" 'BEGIN { printf "%d", s * 1000 }'; }

# The probe file the report reads: host, bundle, secrets in words, and the invokes.
write_probe() { # host bundle note secrets invokes.json
  jq -n --arg host "$1" --argjson bytes "$(bytes "$2")" --arg note "$3" --arg secrets "$4" \
    --arg commit "$(git -C "$root" rev-parse HEAD)" --slurpfile invokes "$5" \
    '{host: $host, commit: $commit, bundle_bytes: $bytes, bundle_note: $note, secrets: $secrets, invokes: $invokes[0]}' \
    > "$out/$1.json"
  api report "$out/$1.json"
}

# One invoke as the report reads it: the seeded run, the round trip, Lambda's REPORT numbers, the reply.
invoke_json() { # seeded.json client_ms init_ms billed_ms reply.json
  jq -n --slurpfile seed "$1" --argjson client "$2" --argjson init "$3" --argjson billed "$4" \
    --slurpfile reply "$5" \
    '$seed[0] + {client_ms: $client, init_ms: $init, billed_ms: $billed,
      reply: (if $reply[0].errorMessage then {error: $reply[0].errorMessage} else $reply[0] end)}'
}

LAMBDA_NOTE="bun build, the api's command; nothing changed in our packages"
EDGE_NOTE="bun build plus a banner for the Node globals Deno lacks (Buffer, process, global); Deno runs it through its Node layer"
LAMBDA_SECRETS="SSM SecureString read once per cold start; the role reads only its own parameter; state holds a placeholder"
EDGE_SECRETS="Supabase secret RUNNER_DATABASE_URL; every function in the project reads every secret"

# The local dry run's driver, the same code in Node and in Deno: import the bundle (its load is the
# cold start here), then twice: seed through bun, invoke, time it.
DRIVER='
import process from "node:process";
import { spawnSync } from "node:child_process";
const env = process.env;
const t0 = performance.now();
const mod = await import(env.PROBE_BUNDLE);
const load = Math.round(performance.now() - t0);
const invoke = env.PROBE_KIND === "lambda"
  ? () => mod.handler({})
  : async () => (await mod.probeFetch(new Request("http://edge.invalid/", { method: "POST" }))).json();
const invokes = [];
for (let i = 0; i < 2; i++) {
  const seeded = spawnSync("bun", [env.PROBE_CLI, "seed"], {
    encoding: "utf8",
    env: { PATH: env.PATH, HOME: env.HOME, USER: env.USER ?? "", DATABASE_URL: env.PROBE_API_URL },
  });
  if (seeded.status !== 0) throw new Error(seeded.stderr);
  const t = performance.now();
  const reply = await invoke();
  invokes.push({ ...JSON.parse(seeded.stdout), client_ms: Math.round(performance.now() - t),
    init_ms: i === 0 ? load : null, billed_ms: null, reply });
}
process.stdout.write(JSON.stringify(invokes));
process.exit(0);
'

case "$host" in
local)
  : "${DATABASE_URL:?DATABASE_URL: a localhost jadwigo* database}"
  API_URL=$DATABASE_URL
  # Deno resolves no name without --allow-sys's resolver, so it reaches Postgres by address.
  runner_url=$(printf '%s' "$DATABASE_URL" | sed 's|//localhost|//127.0.0.1|')
  psql "$DATABASE_URL" -qAtc "select pgmq.purge_queue('agent_step')" >/dev/null
  echo "step-probe local: the Lambda bundle in Node $(node --version)" >&2
  printf '%s' "$DRIVER" | env PROBE_KIND=lambda PROBE_BUNDLE="$lambda_bundle" PROBE_CLI="$cli" \
    PROBE_API_URL="$API_URL" DATABASE_URL="$runner_url" node --input-type=module - > "$out/local-lambda.invokes.json"
  write_probe local-lambda "$lambda_bundle" "$LAMBDA_NOTE" "a local URL" "$out/local-lambda.invokes.json"
  psql "$DATABASE_URL" -qAtc "select pgmq.purge_queue('agent_step')" >/dev/null
  echo "step-probe local: the Edge bundle in Deno $DENO_VERSION, its network limited to Postgres" >&2
  pg_hostport=$(printf '%s' "$runner_url" | sed -E 's|^[a-z]+://([^@/]*@)?([^/]+)/.*|\2|')
  printf '%s' "$DRIVER" | env PROBE_KIND=edge PROBE_BUNDLE="$edge_bundle" PROBE_CLI="$cli" \
    PROBE_API_URL="$API_URL" RUNNER_DATABASE_URL="$runner_url" \
    mise exec "deno@$DENO_VERSION" -- deno run --quiet --no-prompt --allow-env --allow-read --allow-sys \
    --allow-run=bun --allow-net="$pg_hostport" - > "$out/local-edge.invokes.json"
  write_probe local-edge "$edge_bundle" "$EDGE_NOTE" "a local URL" "$out/local-edge.invokes.json"
  ;;

lambda)
  : "${API_URL:?}" "${API_PASSWORD:?}" "${RUNNER_URL:?}" "${AWS_PROFILE:?}"
  tf="terraform -chdir=$root/infra/terraform/probes/step-host"
  $tf init -input=false >/dev/null
  fn=$($tf output -raw function_name)
  param=$($tf output -raw database_url_param)
  jq -n --arg n "$param" --arg v "$RUNNER_URL" '{Name: $n, Value: $v, Type: "SecureString", Overwrite: true}' > "$out/ssm.json"
  aws ssm put-parameter --cli-input-json "file://$out/ssm.json" >/dev/null && rm -f "$out/ssm.json"
  rm -f "$out/ssm.json"
  # The boot check: the bundle loads and names its handler before anything is uploaded.
  node --input-type=module -e "const m = await import('$lambda_bundle'); if (typeof m.handler !== 'function') process.exit(1);"
  rm -f "$out/probe-lambda.zip" && zip -qj "$out/probe-lambda.zip" "$lambda_bundle"
  version=$(aws lambda update-function-code --function-name "$fn" --zip-file "fileb://$out/probe-lambda.zip" \
    --architectures arm64 --publish --query Version --output text)
  aws lambda wait function-updated-v2 --function-name "$fn"
  aws lambda update-alias --function-name "$fn" --name live --function-version "$version" >/dev/null
  echo "step-probe lambda: $fn version $version is live; zip $(bytes "$out/probe-lambda.zip") bytes" >&2
  : > "$out/lambda.lines"
  for i in 1 2; do
    api seed > "$out/seed$i.json"
    t0=$(node -p 'Date.now()')
    aws lambda invoke --function-name "$fn" --qualifier live --log-type Tail \
      --cli-binary-format raw-in-base64-out --payload '{}' "$out/reply$i.json" \
      --query LogResult --output text | base64 --decode > "$out/log$i.txt"
    t1=$(node -p 'Date.now()')
    init=$(sed -n 's/.*Init Duration: \([0-9.]*\) ms.*/\1/p' "$out/log$i.txt")
    billed=$(sed -n 's/.*Billed Duration: \([0-9]*\) ms.*/\1/p' "$out/log$i.txt")
    init_ms=null && [ -z "$init" ] || init_ms=$(printf '%.0f' "$init")
    invoke_json "$out/seed$i.json" "$((t1 - t0))" "$init_ms" "${billed:-null}" "$out/reply$i.json" \
      >> "$out/lambda.lines"
    grep REPORT "$out/log$i.txt" >&2 || true
  done
  jq -s . "$out/lambda.lines" > "$out/lambda.invokes.json"
  write_probe lambda "$lambda_bundle" "$LAMBDA_NOTE" "$LAMBDA_SECRETS" "$out/lambda.invokes.json"
  echo "step-probe lambda: rollback is aws lambda update-alias --function-name $fn --name live --function-version <previous>" >&2
  ;;

edge)
  : "${API_URL:?}" "${API_PASSWORD:?}" "${RUNNER_URL:?}" "${SUPABASE_REF:?}" "${SUPABASE_ACCESS_TOKEN:?}"
  # The boot check: the bundle loads (in Node; Deno is the deploy's) and names its fetch handler.
  node --input-type=module -e "const m = await import('$edge_bundle'); if (typeof m.probeFetch !== 'function') process.exit(1);"
  printf 'RUNNER_DATABASE_URL=%s\n' "$RUNNER_URL" > "$out/edge.env"
  supabase secrets set --env-file "$out/edge.env" --project-ref "$SUPABASE_REF" >/dev/null && rm -f "$out/edge.env"
  rm -f "$out/edge.env"
  (cd "$root" && supabase functions deploy agent-step --use-api --project-ref "$SUPABASE_REF")
  echo "step-probe edge: agent-step deployed from $(git -C "$root" rev-parse HEAD)" >&2
  anon=$(supabase projects api-keys --project-ref "$SUPABASE_REF" -o json | jq -r '.[] | select(.name == "anon") | .api_key')
  : > "$out/edge.lines"
  for i in 1 2; do
    api seed > "$out/seed$i.json"
    printf 'header = "Authorization: Bearer %s"\n' "$anon" > "$out/curl.conf"
    total=$(curl -sS -K "$out/curl.conf" -X POST -o "$out/reply$i.json" -w '%{time_total}' \
      "https://$SUPABASE_REF.supabase.co/functions/v1/agent-step")
    rm -f "$out/curl.conf"
    invoke_json "$out/seed$i.json" "$(ms_of "$total")" null null "$out/reply$i.json" >> "$out/edge.lines"
  done
  jq -s . "$out/edge.lines" > "$out/edge.invokes.json"
  write_probe edge "$edge_bundle" "$EDGE_NOTE" "$EDGE_SECRETS" "$out/edge.invokes.json"
  echo "step-probe edge: CPU time per invocation is in the dashboard, Edge Functions > agent-step > Logs (Deno answers no cpuUsage)" >&2
  ;;

*)
  echo "usage: step-probe.sh local | lambda | edge" >&2
  exit 1
  ;;
esac
echo "step-probe $host: the probe files are in $out" >&2
