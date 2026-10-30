import { generateKeyPairSync, randomUUID } from "node:crypto";
import { ErrorType, ROUTES } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW } from "@jadwigo/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.ts";
import {
  gatewayClaims,
  type Jwk,
  jwksAuth,
  jwksUrlAuth,
  lambdaAuth,
  signedOut,
  verifyToken,
} from "./auth.ts";
import { bearerOf, signToken, TEST_ISSUER, TEST_JWKS, testAuth } from "./testing/token.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

/** A public key the test key is not, as a JWKS lists it. */
function otherKey(type: "rsa" | "ec", kid: string, alg: string): Jwk {
  const { publicKey } =
    type === "rsa"
      ? generateKeyPairSync("rsa", { modulusLength: 2048 })
      : generateKeyPairSync("ec", { namedCurve: "P-256" });
  return { ...publicKey.export({ format: "jwk" }), kid, alg };
}

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
    ["a token with no exp", () => signToken({ expiresIn: null })],
    ["a token whose nbf is 2 min ahead", () => signToken({ notBeforeIn: 120 })],
    ["the custom domain's issuer", () => signToken({ iss: "https://auth.jadwigo.pl/auth/v1" })],
    ["an empty issuer", () => signToken({ iss: "" })],
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

  it("allows 30 s of clock skew on exp and nbf", () => {
    expect(verify(signToken({ expiresIn: -20 }))).toBeDefined();
    expect(verify(signToken({ notBeforeIn: 20 }))).toBeDefined();
  });

  it("takes a token with no kid only from a JWKS of one key", () => {
    const token = signToken({ kid: null });
    expect(verify(token)).toBeDefined();
    const two = [...TEST_JWKS, otherKey("rsa", "second", "RS256")];
    expect(verifyToken(token, two, { issuer: TEST_ISSUER, now: Date.now() })).toBeUndefined();
  });

  it("verifies with an RS256 key only, in a JWKS that also lists an ES256 key as Supabase's does", () => {
    const ec = otherKey("ec", "ec-key", "ES256");
    const jwks = [ec, ...TEST_JWKS];
    const check = (token: string) =>
      verifyToken(token, jwks, { issuer: TEST_ISSUER, now: Date.now() });
    expect(check(signToken())).toBeDefined();
    expect(check(signToken({ kid: "ec-key" }))).toBeUndefined();
    expect(check(signToken({ alg: "ES256", kid: "ec-key" }))).toBeUndefined();
    const [key] = TEST_JWKS;
    const relabelled = [{ ...key, alg: "RS512" }];
    expect(
      verifyToken(signToken(), relabelled, { issuer: TEST_ISSUER, now: Date.now() }),
    ).toBeUndefined();
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

  it("reads the scheme in any case, and refuses a header that is not one token", async () => {
    const sub = randomUUID();
    const token = signToken({ sub });
    expect(await testAuth(request({ authorization: `bearer ${token}` }), {})).toMatchObject({
      sub,
    });
    for (const authorization of ["Bearer", "Bearer ", "Bearer a b", `Bearer ${token} ${token}`]) {
      expect(await testAuth(request({ authorization }), {})).toBeUndefined();
    }
  });

  it("loads the keys once while they verify", async () => {
    let loads = 0;
    const auth = jwksAuth(
      async () => {
        loads += 1;
        return TEST_JWKS;
      },
      { issuer: TEST_ISSUER },
    );
    await auth(request(bearerOf(signToken())), {});
    await auth(request(bearerOf(signToken())), {});
    expect(loads).toBe(1);
  });

  it("reloads for an unknown kid at most once a minute, and never for a bad token with a known one", async () => {
    let loads = 0;
    const auth = jwksAuth(
      async () => {
        loads += 1;
        return TEST_JWKS;
      },
      { issuer: TEST_ISSUER },
    );
    await auth(request(bearerOf(signToken())), {});
    vi.setSystemTime(FIXED_NOW.getTime() + 120_000);
    expect(await auth(request(bearerOf(signToken({}, true))), {})).toBeUndefined();
    expect(await auth(request(bearerOf("not-a-token")), {})).toBeUndefined();
    expect(loads).toBe(1);
    expect(await auth(request(bearerOf(signToken({ kid: "rotated" }))), {})).toBeUndefined();
    expect(await auth(request(bearerOf(signToken({ kid: "rotated" }))), {})).toBeUndefined();
    expect(loads).toBe(2);
    vi.setSystemTime(FIXED_NOW.getTime() + 181_000);
    await auth(request(bearerOf(signToken({ kid: "rotated" }))), {});
    expect(loads).toBe(3);
  });

  it("refuses the token when the JWKS cannot be read, logs why, and tries again after 5 s", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let fail = true;
    let loads = 0;
    const auth = jwksAuth(
      async () => {
        loads += 1;
        if (fail) throw new Error("the JWKS at https://ref.supabase.co answered 503");
        return TEST_JWKS;
      },
      { issuer: TEST_ISSUER },
    );
    const sub = randomUUID();
    expect(await auth(request(bearerOf(signToken({ sub }))), {})).toBeUndefined();
    expect(JSON.parse(String(log.mock.calls[0]?.[0]))).toMatchObject({
      level: "ERROR",
      message: "JWKS read failed",
      error: "the JWKS at https://ref.supabase.co answered 503",
    });
    fail = false;
    expect(await auth(request(bearerOf(signToken({ sub }))), {})).toBeUndefined();
    expect(loads).toBe(1);
    vi.setSystemTime(FIXED_NOW.getTime() + 5_000);
    expect(await auth(request(bearerOf(signToken({ sub }))), {})).toMatchObject({ sub });
    expect(loads).toBe(2);
  });

  it("answers a token route 401 NotSignedIn, never 500, when the JWKS cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const authenticate = jwksAuth(
      async () => {
        throw new Error("connect ECONNREFUSED");
      },
      { issuer: TEST_ISSUER },
    );
    const app = createApp(new InMemoryStore(), { authenticate });
    const path = ROUTES.getMe.path;
    const reply = (await app.resolve(
      {
        version: "2.0",
        routeKey: "$default",
        rawPath: path,
        rawQueryString: "",
        headers: bearerOf(signToken()),
        requestContext: { http: { method: ROUTES.getMe.method, path }, stage: "$default" },
        isBase64Encoded: false,
      },
      {} as Parameters<ReturnType<typeof createApp>["resolve"]>[1],
    )) as { statusCode: number; body: string };
    expect(reply.statusCode).toBe(401);
    expect(JSON.parse(reply.body)).toMatchObject({ error: { type: ErrorType.enum.NotSignedIn } });
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
    expect(await lambdaAuth(signedOut)(request(), event({ sub }))).toEqual({ sub, email: null });
  });

  it("accepts no bearer token at all without an authorizer or AUTH_JWKS_URL, the test key's included", async () => {
    const auth = lambdaAuth(jwksUrlAuth(undefined, TEST_ISSUER, async () => TEST_JWKS));
    expect(await auth(request(bearerOf(signToken())), {})).toBeUndefined();
    expect(await auth(request(bearerOf(signToken())), event({ sub: "admin" }))).toBeUndefined();
  });
});

describe("jwksUrlAuth", () => {
  const url = "https://ref.supabase.co/auth/v1/.well-known/jwks.json";

  it("verifies against the URL's keys and the issuer it is given", async () => {
    const sub = randomUUID();
    const auth = jwksUrlAuth(url, TEST_ISSUER, async (at) => (at === url ? TEST_JWKS : []));
    expect(await auth(request(bearerOf(signToken({ sub }))), {})).toMatchObject({ sub });
    const iss = "https://ref.supabase.co/auth/v1";
    expect(await auth(request(bearerOf(signToken({ iss }))), {})).toBeUndefined();
  });

  it("fails closed on a JWKS URL with no issuer, never reading one off the URL, and logs why", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const load = vi.fn(async () => TEST_JWKS);
    const auth = jwksUrlAuth(url, undefined, load);
    const token = signToken({ iss: "https://ref.supabase.co/auth/v1" });
    expect(await auth(request(bearerOf(token)), {})).toBeUndefined();
    expect(load).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0]?.[0])).toContain("AUTH_ISSUER");
  });

  it("refuses the token, rather than throwing, when the fetch fails", async () => {
    // Unit tests refuse the network, so the real fetch fails as an unreachable Supabase would.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = jwksUrlAuth(url, TEST_ISSUER);
    expect(await auth(request(bearerOf(signToken())), {})).toBeUndefined();
  });
});
