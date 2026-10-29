import { ROUTES, type Route } from "@jadwigo/contracts";

/**
 * The credential a route takes. `open`: none, and an attempt route is bound by its attempt id.
 * `supabase`: a signed-in adult's Supabase Auth token. `bank`: the bank's shared read token, which
 * `apps/api` checks itself, so the route is `auth: "none"` at the gateway.
 */
export type Credential = "open" | "supabase" | "bank";

export function credentialOf(route: Route): Credential {
  if (route.auth === "token") return "supabase";
  return route.tag === "bank" ? "bank" : "open";
}

/** One row of the Authentication guide's table. */
export interface AccessRow {
  readonly method: Route["method"];
  readonly path: string;
  readonly summary: string;
}

/** Every route that takes `credential`, in the order ROUTES lists them. */
export function routesTaking(
  credential: Credential,
  routes: Readonly<Record<string, Route>> = ROUTES,
): AccessRow[] {
  return Object.values(routes)
    .filter((route) => credentialOf(route) === credential)
    .map(({ method, path, summary }) => ({ method, path, summary }));
}
