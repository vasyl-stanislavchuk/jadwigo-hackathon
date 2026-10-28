// The HTTP API's route keys in infra/terraform/main.tf match ROUTES in packages/contracts (dl-5ssh.50).
// A route in ROUTES with no Terraform route still answers through $default, but at the stage default
// throttle instead of its own 10/20 (jadwigo-platform/decisions/2026-10-28-the-app-s-http-api-stage-
// throttles-every-route-but-health-at-10); a Terraform route ROUTES dropped is a stale throttle.
// Both files are read as text: tools imports nothing of ours. Run: bun tools/src/check-infra-routes.ts
import { readFileSync } from "node:fs";

const CONTRACTS = "packages/contracts/src/routes.ts";
const TERRAFORM = "infra/terraform/main.tf";

/** "<METHOD> <path>" for every ROUTES entry: each names its method, then its path. */
export function contractRoutes(source: string): string[] {
  const keys = [...source.matchAll(/\bmethod:\s*"([A-Z]+)",\s*path:\s*"([^"]+)"/g)];
  return keys.map(([, method, path]) => `${method} ${path}`);
}

/** Every quoted "<METHOD> /<path>" route key in the Terraform file, comment lines left out. */
export function terraformRoutes(source: string): string[] {
  const code = source.replace(/^\s*(#|\/\/).*$/gm, "");
  return [...code.matchAll(/"((?:GET|POST|PUT|PATCH|DELETE) \/[^"]*)"/g)].map(
    ([, key]) => key ?? "",
  );
}

export function compareRoutes(contracts: string, terraform: string): string[] {
  const want = new Set(contractRoutes(contracts));
  const have = new Set(terraformRoutes(terraform));
  const problems: string[] = [];
  if (want.size === 0)
    problems.push(`${CONTRACTS}: no routes found; has the ROUTES shape changed?`);
  for (const key of want)
    if (!have.has(key)) problems.push(`"${key}" is in ROUTES but has no route in ${TERRAFORM}`);
  for (const key of have)
    if (!want.has(key)) problems.push(`"${key}" is routed in ${TERRAFORM} but is not in ROUTES`);
  return problems;
}

if (import.meta.main) {
  const problems = compareRoutes(readFileSync(CONTRACTS, "utf8"), readFileSync(TERRAFORM, "utf8"));
  for (const p of problems) console.error(`infra routes: ${p}`);
  if (problems.length > 0) {
    console.error(
      "infra routes: add or drop the key in module app's routes in main.tf, or in ROUTES.",
    );
    process.exit(1);
  }
}
