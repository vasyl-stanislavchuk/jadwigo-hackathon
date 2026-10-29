// The HTTP API's route keys in infra/terraform/main.tf match ROUTES in packages/contracts (dl-5ssh.50),
// and the routes ROUTES marks auth "token" are exactly module app's token_routes, the ones the JWT
// authorizer guards (dl-5ssh.7). A route in ROUTES with no Terraform route still answers through
// $default, but at the stage default throttle instead of its own 10/20 (jadwigo-platform/decisions/
// 2026-10-28-the-app-s-http-api-stage-throttles-every-route-but-health-at-10); a token route outside
// token_routes reaches the Lambda with no token checked at the gateway.
// Both files are read as text: tools imports nothing of ours. Run: bun tools/src/check-infra-routes.ts
import { readFileSync } from "node:fs";

const CONTRACTS = "packages/contracts/src/routes.ts";
const TERRAFORM = "infra/terraform/main.tf";

export interface ContractRoute {
  readonly key: string;
  readonly auth: "none" | "token";
}

/** Each ROUTES entry as "<METHOD> <path>" and its auth; an entry that names no auth is "none". */
export function contractRoutes(source: string): ContractRoute[] {
  const entries = [...source.matchAll(/\n {2}\w+: \{([\s\S]*?)\n {2}\},/g)];
  return entries.flatMap(([, body = ""]) => {
    const key = body.match(/\bmethod:\s*"([A-Z]+)",\s*path:\s*"([^"]+)"/);
    if (!key) return [];
    const auth = body.match(/\bauth:\s*"(none|token)"/)?.[1] === "token" ? "token" : "none";
    return [{ key: `${key[1]} ${key[2]}`, auth }];
  });
}

const ROUTE_KEY = /"((?:GET|POST|PUT|PATCH|DELETE) \/[^"]*)"/g;
const uncommented = (source: string) => source.replace(/^\s*(#|\/\/).*$/gm, "");

/** The route keys in one list of module app (`routes` or `token_routes`), comment lines left out. */
function listKeys(source: string, name: "routes" | "token_routes"): string[] {
  // \b keeps "routes" from matching inside "token_routes": "_" and "r" are both word characters.
  const list = uncommented(source).match(new RegExp(`\\b${name}\\s*=\\s*\\[([^\\]]*)\\]`))?.[1];
  return [...(list ?? "").matchAll(ROUTE_KEY)].map(([, key]) => key ?? "");
}

/** The route keys in module app's routes list: a key only in token_routes is not routed. */
export function terraformRoutes(source: string): string[] {
  return listKeys(source, "routes");
}

/** The route keys in module app's token_routes list. */
export function terraformTokenRoutes(source: string): string[] {
  return listKeys(source, "token_routes");
}

export function compareRoutes(contracts: string, terraform: string): string[] {
  const routes = contractRoutes(contracts);
  const want = new Set(routes.map((r) => r.key));
  const wantToken = new Set(routes.filter((r) => r.auth === "token").map((r) => r.key));
  const have = new Set(terraformRoutes(terraform));
  const haveToken = new Set(terraformTokenRoutes(terraform));
  const problems: string[] = [];
  if (want.size === 0)
    problems.push(`${CONTRACTS}: no routes found; has the ROUTES shape changed?`);
  for (const key of want)
    if (!have.has(key)) problems.push(`"${key}" is in ROUTES but has no route in ${TERRAFORM}`);
  for (const key of have)
    if (!want.has(key)) problems.push(`"${key}" is routed in ${TERRAFORM} but is not in ROUTES`);
  for (const key of wantToken)
    if (have.has(key) && !haveToken.has(key))
      problems.push(
        `"${key}" has auth "token" in ROUTES but is not in token_routes in ${TERRAFORM}`,
      );
  for (const key of haveToken)
    if (want.has(key) && !wantToken.has(key))
      problems.push(`"${key}" is in token_routes in ${TERRAFORM} but has auth "none" in ROUTES`);
  return problems;
}

if (import.meta.main) {
  const problems = compareRoutes(readFileSync(CONTRACTS, "utf8"), readFileSync(TERRAFORM, "utf8"));
  for (const p of problems) console.error(`infra routes: ${p}`);
  if (problems.length > 0) {
    console.error(
      "infra routes: module app's routes and token_routes in main.tf follow ROUTES and its auth.",
    );
    process.exit(1);
  }
}
