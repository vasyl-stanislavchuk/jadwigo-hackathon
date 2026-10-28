// Tokens shaped like Supabase Auth's, signed with an RS256 key made for this test run: never a
// Supabase key, and nothing private is committed (docs/research/parent-login.md).
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { type Authenticate, type Jwk, jwksAuth } from "../auth.ts";

export const TEST_ISSUER = "https://jadwigo-test.supabase.invalid/auth/v1";
const KID = "jadwigo-test";

function keyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { privateKey, jwk: { ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256" } };
}

const TEST_KEY = keyPair();
/** The public half, as a JWKS lists it. */
export const TEST_JWKS: readonly Jwk[] = [TEST_KEY.jwk];

/** How the route tests authenticate: the test key's JWKS and issuer. */
export const testAuth: Authenticate = jwksAuth(async () => TEST_JWKS, { issuer: TEST_ISSUER });

export interface TokenClaims {
  readonly sub?: string;
  readonly email?: string;
  readonly aud?: string;
  readonly iss?: string;
  /** Seconds from now. */
  readonly expiresIn?: number;
  readonly alg?: string;
  readonly kid?: string;
}

/** A signed token. `other: true` signs with a key the JWKS does not hold. */
export function signToken(claims: TokenClaims = {}, other = false): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: claims.alg ?? "RS256", typ: "JWT", kid: claims.kid ?? KID };
  const payload = {
    iss: claims.iss ?? TEST_ISSUER,
    aud: claims.aud ?? "authenticated",
    role: "authenticated",
    sub: claims.sub ?? randomUUID(),
    email: claims.email ?? "parent@example.com",
    iat: now,
    exp: now + (claims.expiresIn ?? 3600),
  };
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
  const signed = `${encode(header)}.${encode(payload)}`;
  const key = other ? keyPair().privateKey : TEST_KEY.privateKey;
  const signature = createSign("RSA-SHA256").update(signed).sign(key).toString("base64url");
  return `${signed}.${signature}`;
}

/** The Authorization header for a token. */
export function bearerOf(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}
