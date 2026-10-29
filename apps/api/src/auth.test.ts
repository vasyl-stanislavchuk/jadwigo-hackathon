import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { gatewayClaims, issuerOf, jwksAuth, lambdaAuth, verifyToken } from "./auth.ts";
import { bearerOf, signToken, TEST_ISSUER, TEST_JWKS, testAuth } from "./testing/token.ts";

const verify = (token: string) =>
  verifyToken(token, TEST_JWKS, { issuer: TEST_ISSUER, now: Date.now() });

function request(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/v1/me", { headers });
}

describe("verifyToken", () => {
  it("takes a Supabase-shaped RS256 token and gives its sub and email", () => {
    const sub = randomUUID();
    expect(verify(signToken({ sub, email: "a@example.com" }))).toEqual({
      sub,
      email: "a@example.com",
    });
  });

  it.each([
    ["an expired token", () => signToken({ expiresIn: -120 })],
    ["another audience", () => signToken({ aud: "anon" })],
    ["another issuer", () => signToken({ iss: "https://elsewhere.supabase.co/auth/v1" })],
    ["a sub that is not a uuid", () => signToken({ sub: "admin" })],
    ["a key the JWKS lacks", () => signToken({}, true)],
    ["an unknown kid", () => signToken({ kid: "other" })],
    ["alg HS256", () => signToken({ alg: "HS256" })],
    ["alg none", () => `${signToken({ alg: "none" }).split(".").slice(0, 2).join(".")}.`],
    ["a tampered payload", () => tamper(signToken())],
    ["not a token", () => "not-a-token"],
  ])("refuses %s", (_what, token) => {
    // Signed inside the test, on the pinned clock.
    expect(verify(token())).toBeUndefined();
  });

  it("allows 30 s of clock skew on exp", () => {
    expect(verify(signToken({ expiresIn: -20 }))).toBeDefined();
  });
});

function tamper(token: string): string {
  const [head, , signature] = token.split(".");
  const payload = Buffer.from(
    JSON.stringify({ sub: randomUUID(), aud: "authenticated", iss: TEST_ISSUER, exp: 9e9 }),
  ).toString("base64url");
  return `${head}.${payload}.${signature}`;
}

describe("jwksAuth", () => {
  it("reads the bearer token, and nothing without one", async () => {
    const sub = randomUUID();
    expect(await testAuth(request(bearerOf(signToken({ sub }))), {})).toMatchObject({ sub });
    expect(await testAuth(request(), {})).toBeUndefined();
    expect(await testAuth(request({ authorization: "Basic abc" }), {})).toBeUndefined();
  });

  it("loads the keys once while they verify", async () => {
    let loads = 0;
    const auth = jwksAuth(async () => {
      loads += 1;
      return TEST_JWKS;
    });
    await auth(request(bearerOf(signToken())), {});
    await auth(request(bearerOf(signToken())), {});
    expect(loads).toBe(1);
  });
});

describe("the Lambda's authentication", () => {
  const event = (claims: unknown) => ({ requestContext: { authorizer: { jwt: { claims } } } });

  it("takes the claims API Gateway's authorizer verified", async () => {
    const sub = randomUUID();
    expect(gatewayClaims(event({ sub, email: "a@example.com" }))).toEqual({
      sub,
      email: "a@example.com",
    });
    expect(await lambdaAuth(undefined)(request(), event({ sub }))).toEqual({ sub, email: null });
  });

  it("accepts no bearer token at all without an authorizer or AUTH_JWKS_URL, the test key's included", async () => {
    const auth = lambdaAuth(undefined);
    expect(await auth(request(bearerOf(signToken())), {})).toBeUndefined();
    expect(await auth(request(bearerOf(signToken())), event({ sub: "admin" }))).toBeUndefined();
  });

  it("names Supabase's issuer from its JWKS URL", () => {
    expect(issuerOf("https://ref.supabase.co/auth/v1/.well-known/jwks.json")).toBe(
      "https://ref.supabase.co/auth/v1",
    );
    expect(issuerOf("https://example.com/keys")).toBeUndefined();
  });
});
