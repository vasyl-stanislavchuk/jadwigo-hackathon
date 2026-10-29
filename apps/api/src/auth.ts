import { createPublicKey, type JsonWebKey, verify } from "node:crypto";
import { Uuid } from "@jadwigo/contracts";

/**
 * Who a token route's caller is, from a verified Supabase Auth token (docs/research/parent-login.md).
 * `sub` is the Supabase Auth user, the key of `account`.
 */
export interface Claims {
  readonly sub: Uuid;
  readonly email: string | null;
}

/** The caller's verified claims, or undefined for no token or one that fails verification. */
export type Authenticate = (req: Request, event: unknown) => Promise<Claims | undefined>;

/** A public key of a JWKS, as Supabase publishes it. */
export type Jwk = JsonWebKey & { readonly kid?: string };

/** Supabase's tokens for a signed-in user carry this audience. */
const AUDIENCE = "authenticated";
/** Clock skew allowed on `exp` and `nbf`, in seconds. */
const LEEWAY_S = 30;

/** No token is ever accepted: a server with no way to verify one. */
export const signedOut: Authenticate = async () => undefined;

/** The bearer token in the request's Authorization header. */
function bearer(req: Request): string | undefined {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}

function decodeJson(part: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** The claims a verified token or the gateway's authorizer carries, when `sub` is a uuid. */
function claimsOf(payload: Record<string, unknown>): Claims | undefined {
  const sub = Uuid.safeParse(payload["sub"]);
  if (!sub.success) return undefined;
  const email = payload["email"];
  return { sub: sub.data, email: typeof email === "string" && email !== "" ? email : null };
}

/**
 * Verifies an RS256 token against `keys`: its signature by the key its `kid` names, `exp` and
 * `nbf` against `now`, the `authenticated` audience, and `issuer` when one is given. Anything
 * else, `alg: none` and HS256 included, is refused.
 */
export function verifyToken(
  token: string,
  keys: readonly Jwk[],
  options: { readonly issuer?: string | undefined; readonly now: number },
): Claims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [head, body, signature] = parts as [string, string, string];
  const header = decodeJson(head);
  const payload = decodeJson(body);
  if (!header || !payload || header["alg"] !== "RS256") return undefined;
  const kid = header["kid"];
  const key = keys.find(
    (k) => k.kty === "RSA" && (kid === undefined ? keys.length === 1 : k.kid === kid),
  );
  if (!key) return undefined;
  let valid = false;
  try {
    valid = verify(
      "RSA-SHA256",
      Buffer.from(`${head}.${body}`),
      createPublicKey({ key: key, format: "jwk" }),
      Buffer.from(signature, "base64url"),
    );
  } catch {
    return undefined;
  }
  if (!valid) return undefined;
  const now = options.now / 1000;
  const exp = payload["exp"];
  const nbf = payload["nbf"];
  if (typeof exp !== "number" || exp + LEEWAY_S < now) return undefined;
  if (typeof nbf === "number" && nbf - LEEWAY_S > now) return undefined;
  const aud = payload["aud"];
  if (!(aud === AUDIENCE || (Array.isArray(aud) && aud.includes(AUDIENCE)))) return undefined;
  if (options.issuer !== undefined && payload["iss"] !== options.issuer) return undefined;
  return claimsOf(payload);
}

/**
 * Verifies the bearer token against a JWKS that `load` reads. The keys are kept; a token whose
 * `kid` they lack reloads them, at most once a minute, so a rotated key is picked up.
 */
export function jwksAuth(
  load: () => Promise<readonly Jwk[]>,
  options: { readonly issuer?: string | undefined } = {},
): Authenticate {
  let keys: readonly Jwk[] | undefined;
  let loadedAt = Number.NEGATIVE_INFINITY;
  const reload = async () => {
    keys = await load();
    loadedAt = Date.now();
    return keys;
  };
  return async (req) => {
    const token = bearer(req);
    if (token === undefined) return undefined;
    const now = Date.now();
    const verifyWith = (with_: readonly Jwk[]) =>
      verifyToken(token, with_, { issuer: options.issuer, now });
    const claims = verifyWith(keys ?? (await reload()));
    if (claims || now - loadedAt < 60_000) return claims;
    return verifyWith(await reload());
  };
}

/** The keys at a JWKS URL. */
export async function fetchJwks(url: string): Promise<readonly Jwk[]> {
  const reply = await fetch(url);
  if (!reply.ok) throw new Error(`the JWKS at ${url} answered ${reply.status}`);
  const body = (await reply.json()) as { keys?: unknown };
  return Array.isArray(body.keys) ? (body.keys as Jwk[]) : [];
}

/**
 * Supabase's issuer for a JWKS URL it publishes: `https://<ref>.supabase.co/auth/v1` for
 * `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`. Undefined for any other shape.
 */
export function issuerOf(jwksUrl: string): string | undefined {
  const suffix = "/.well-known/jwks.json";
  return jwksUrl.endsWith(suffix) ? jwksUrl.slice(0, -suffix.length) : undefined;
}

/**
 * The claims API Gateway's JWT authorizer verified, from an HTTP API (payload 2.0) event. Only the
 * gateway writes `requestContext`, so a caller cannot forge them; with no authorizer on the route
 * there are none.
 */
export function gatewayClaims(event: unknown): Claims | undefined {
  const claims = (
    event as { requestContext?: { authorizer?: { jwt?: { claims?: unknown } } } } | null
  )?.requestContext?.authorizer?.jwt?.claims;
  if (claims === null || typeof claims !== "object") return undefined;
  return claimsOf(claims as Record<string, unknown>);
}

/**
 * The Lambda's: the gateway authorizer's claims, else, when `AUTH_JWKS_URL` is set, the bearer
 * token verified against it. Never a test key: with neither, every token route is 401.
 */
export function lambdaAuth(jwksUrl: string | undefined): Authenticate {
  const fromJwks =
    jwksUrl === undefined
      ? signedOut
      : jwksAuth(() => fetchJwks(jwksUrl), { issuer: issuerOf(jwksUrl) });
  return async (req, event) => gatewayClaims(event) ?? fromJwks(req, event);
}
