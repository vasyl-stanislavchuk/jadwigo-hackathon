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
export type Jwk = JsonWebKey & { readonly kid?: string; readonly alg?: string };

/** Supabase's tokens for a signed-in user carry this audience. */
const AUDIENCE = "authenticated";
/** Clock skew allowed on `exp` and `nbf`, in seconds. */
const LEEWAY_S = 30;
/** The JWKS is read again at most this often for a token whose `kid` it lacks: a rotated key. */
const RELOAD_MS = 60_000;
/** After a failed read of the JWKS, the next token may try again this soon. */
const RETRY_MS = 5_000;
/** A JWKS read that takes longer has failed. */
const FETCH_TIMEOUT_MS = 3_000;

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
 * The RSA key in `keys` a token's `kid` names, or the only key when it names none. A key whose
 * `alg` is not RS256 never verifies one: Supabase's JWKS also lists an ES256 key, and the projects
 * sign with RS256 (decision `2026-10-27-jadwigo-s-supabase-projects-are-recreated-in-frankfurt-and-sign`).
 */
function signingKey(keys: readonly Jwk[], kid: unknown): Jwk | undefined {
  const key =
    kid === undefined ? (keys.length === 1 ? keys[0] : undefined) : keys.find((k) => k.kid === kid);
  return key?.kty === "RSA" && (key.alg === undefined || key.alg === "RS256") ? key : undefined;
}

/**
 * Verifies an RS256 token against `keys`: its signature by the key its `kid` names, `exp` and
 * `nbf` against `now`, the `authenticated` audience, and `issuer`, exactly. Anything else, `alg:
 * none`, HS256 and ES256 included, is refused.
 */
export function verifyToken(
  token: string,
  keys: readonly Jwk[],
  options: { readonly issuer: string; readonly now: number },
): Claims | undefined {
  const parts = token.split(".");
  if (parts.length !== 3) return undefined;
  const [head, body, signature] = parts as [string, string, string];
  const header = decodeJson(head);
  const payload = decodeJson(body);
  if (!header || !payload || header["alg"] !== "RS256") return undefined;
  const key = signingKey(keys, header["kid"]);
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
  if (payload["iss"] !== options.issuer) return undefined;
  return claimsOf(payload);
}

/** Whether the token's header names a `kid` that `keys` lack, as after Supabase rotates its key. */
function namesUnknownKid(token: string, keys: readonly Jwk[]): boolean {
  const kid = decodeJson(token.split(".")[0] ?? "")?.["kid"];
  return typeof kid === "string" && !keys.some((k) => k.kid === kid);
}

/**
 * Verifies the bearer token against a JWKS that `load` reads, and its `iss` against `issuer`. The
 * keys are kept; a token whose `kid` they lack reloads them, at most once a minute, so a rotated
 * key is picked up and a forged `kid` cannot make every request a fetch. A failed read is logged
 * and refuses the token (401, never 500); the next token tries again after 5 s.
 */
export function jwksAuth(
  load: () => Promise<readonly Jwk[]>,
  options: { readonly issuer: string },
): Authenticate {
  let keys: readonly Jwk[] | undefined;
  let nextLoadAt = Number.NEGATIVE_INFINITY;
  let loading: Promise<void> | undefined;
  const reload = (): Promise<void> => {
    if (loading === undefined) {
      loading = load()
        .then(
          (loaded) => {
            keys = loaded;
            nextLoadAt = Date.now() + RELOAD_MS;
          },
          (error: unknown) => {
            nextLoadAt = Date.now() + RETRY_MS;
            logJwksFailure(error);
          },
        )
        .finally(() => {
          loading = undefined;
        });
    }
    return loading;
  };
  return async (req) => {
    const token = bearer(req);
    if (token === undefined) return undefined;
    const stale = keys === undefined || namesUnknownKid(token, keys);
    if (stale && Date.now() >= nextLoadAt) await reload();
    if (keys === undefined) return undefined;
    return verifyToken(token, keys, { issuer: options.issuer, now: Date.now() });
  };
}

/** One JSON line at level ERROR: a failed JWKS read answers 401, so only the log tells why. */
function logJwksFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: "ERROR", message: "JWKS read failed", error: message }));
}

/** The keys at a JWKS URL. A read slower than 3 s fails. */
async function fetchJwks(url: string): Promise<readonly Jwk[]> {
  const reply = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!reply.ok) throw new Error(`the JWKS at ${url} answered ${reply.status}`);
  const body = (await reply.json()) as { keys?: unknown };
  return Array.isArray(body.keys) ? (body.keys as Jwk[]) : [];
}

/**
 * Bearer tokens verified against the JWKS at `jwksUrl`, carrying exactly `issuer`. Both are
 * settings (`AUTH_JWKS_URL`, `AUTH_ISSUER`): the issuer is never read off the URL, since Auth on a
 * custom domain may not match it. With either unset no token verifies, and a URL with no issuer
 * logs why.
 */
export function jwksUrlAuth(
  jwksUrl: string | undefined,
  issuer: string | undefined,
  load: (url: string) => Promise<readonly Jwk[]> = fetchJwks,
): Authenticate {
  if (jwksUrl === undefined) return signedOut;
  if (issuer === undefined) {
    console.error(
      JSON.stringify({
        level: "ERROR",
        message: "AUTH_JWKS_URL is set without AUTH_ISSUER: every token route answers 401",
      }),
    );
    return signedOut;
  }
  return jwksAuth(() => load(jwksUrl), { issuer });
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
 * The Lambda's: the gateway authorizer's claims, else the bearer token verified as `fromJwks`
 * does (`jwksUrlAuth`). Never a test key: with neither, every token route is 401.
 */
export function lambdaAuth(fromJwks: Authenticate): Authenticate {
  return async (req, event) => gatewayClaims(event) ?? fromJwks(req, event);
}
