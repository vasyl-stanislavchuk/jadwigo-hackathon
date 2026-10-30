// A stand-in for Supabase Auth in the browser tests (dl-e8ov.2.38), so parent login runs end to end
// with no Supabase project and no mail. It makes an RS256 key for this run (never a Supabase key;
// nothing private is written anywhere) and serves, on 127.0.0.1:54321:
//
//   GET  /auth/v1/.well-known/jwks.json   the key's public half, which apps/api verifies tokens
//                                          against (AUTH_JWKS_URL); its tokens' iss is
//                                          <origin>/auth/v1, the value CI passes the api as
//                                          AUTH_ISSUER (dl-e8ov.2.68)
//   GET  /auth/v1/settings                the project's public settings: Google and Facebook on, as
//                                          /parent reads them before it shows their buttons
//                                          (dl-e8ov.2.83)
//   POST /auth/v1/otp                     "sends" a code: every code is 123456
//   POST /auth/v1/verify                  turns 123456 into a session whose access token is shaped
//                                          like Supabase's (iss, aud and role authenticated, sub,
//                                          email, exp), one sub per email for the run
//   GET  /auth/v1/authorize               Google or Facebook with no provider (dl-e8ov.2.51): sends
//                                          the tab straight back to redirect_to with a code, kept
//                                          with its PKCE challenge and the provider's email; with no
//                                          email set, back with Supabase's "no email" error instead
//   POST /auth/v1/token?grant_type=pkce   turns that code and its verifier into the same session as
//                                          /verify's, so an email gets one sub whichever way it
//                                          signed in
//   POST /auth/v1/test/provider           sets the email the next provider sign-in returns, or
//                                          none: { email: string | null }. The tests' switch, not
//                                          Supabase's
//
// The request shapes are supabase-js's (auth-js 2.118.0, GoTrueClient.js _getUrlForProvider and
// _exchangeCodeForSession), not Supabase's documentation.
//
// playwright.config.ts starts it for the `api` project. Its tokens mirror apps/api's own test
// signer (apps/api/src/testing/token.ts).
import { createHash, createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AUTH_ORIGIN, AUTH_PORT } from "./auth-origin.ts";

const ISSUER = `${AUTH_ORIGIN}/auth/v1`;
const CODE = "123456";
const KID = "jadwigo-e2e";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = {
  keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }],
};
const subs = new Map<string, string>();
/** The email the next provider sign-in returns, or null for a provider account with none. */
let providerEmail: string | null = "rodzic.google@example.com";
/** Each code /authorize gave out, until /token spends it. */
const codes = new Map<
  string,
  { challenge: string; method: string; email: string; provider: string }
>();
/** Supabase's own words when the provider gives no email (docs/research/social-sign-in.md). */
const NO_EMAIL = "Error getting user email from external provider";
const PROVIDERS = ["google", "facebook"];

const b64url = (part: object | Buffer): string =>
  (Buffer.isBuffer(part) ? part : Buffer.from(JSON.stringify(part))).toString("base64url");

function accessToken(sub: string, email: string, now: number): string {
  const signed = `${b64url({ alg: "RS256", typ: "JWT", kid: KID })}.${b64url({
    iss: ISSUER,
    aud: "authenticated",
    role: "authenticated",
    sub,
    email,
    iat: now,
    exp: now + 3600,
  })}`;
  return `${signed}.${b64url(createSign("RSA-SHA256").update(signed).sign(privateKey))}`;
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  });
  res.end(body === null ? "" : JSON.stringify(body));
}

/** A session for `email`, shaped like Supabase's /verify and /token answers. */
function session(email: string, provider: string): Record<string, unknown> {
  const sub = subs.get(email) ?? randomUUID();
  subs.set(email, sub);
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: accessToken(sub, email, now),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: randomUUID(),
    user: {
      id: sub,
      aud: "authenticated",
      role: "authenticated",
      email,
      app_metadata: { provider },
      user_metadata: {},
      created_at: new Date(now * 1000).toISOString(),
    },
  };
}

/** `to` with `params` added to its query. */
function back(to: string, params: Record<string, string>): string {
  const url = new URL(to);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url.href;
}

/** Whether `verifier` answers `challenge` (RFC 7636: S256, or plain). */
function answers(verifier: unknown, challenge: string, method: string): boolean {
  if (typeof verifier !== "string") return false;
  return method.toLowerCase() === "plain"
    ? verifier === challenge
    : createHash("sha256").update(verifier).digest("base64url") === challenge;
}

async function bodyOf(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", AUTH_ORIGIN);
  const path = url.pathname;
  if (req.method === "OPTIONS") return send(res, 204, null);
  if (req.method === "GET" && path === "/auth/v1/.well-known/jwks.json")
    return send(res, 200, jwks);
  if (req.method === "GET" && path === "/auth/v1/settings")
    return send(res, 200, {
      external: { email: true, google: true, facebook: true },
      disable_signup: false,
      mailer_autoconfirm: false,
    });
  if (req.method === "POST" && path === "/auth/v1/otp") {
    const { email } = await bodyOf(req);
    return typeof email === "string" ? send(res, 200, {}) : send(res, 400, { msg: "no email" });
  }
  if (req.method === "POST" && path === "/auth/v1/verify") {
    const { email, token } = await bodyOf(req);
    if (typeof email !== "string" || token !== CODE) {
      return send(res, 403, {
        code: 403,
        error_code: "otp_expired",
        msg: "Token has expired or is invalid",
      });
    }
    return send(res, 200, session(email, "email"));
  }
  if (req.method === "GET" && path === "/auth/v1/authorize") {
    const provider = url.searchParams.get("provider") ?? "";
    const to = url.searchParams.get("redirect_to");
    const challenge = url.searchParams.get("code_challenge");
    if (!PROVIDERS.includes(provider) || to === null || challenge === null)
      return send(res, 400, { msg: "provider, redirect_to and code_challenge are required" });
    let location: string;
    if (providerEmail === null) {
      location = back(to, {
        error: "server_error",
        error_code: "unexpected_failure",
        error_description: NO_EMAIL,
      });
    } else {
      const code = randomUUID();
      const method = url.searchParams.get("code_challenge_method") ?? "plain";
      codes.set(code, { challenge, method, email: providerEmail, provider });
      location = back(to, { code });
    }
    res.writeHead(302, { location });
    return res.end();
  }
  if (
    req.method === "POST" &&
    path === "/auth/v1/token" &&
    url.searchParams.get("grant_type") === "pkce"
  ) {
    const { auth_code, code_verifier } = await bodyOf(req);
    const code = typeof auth_code === "string" ? auth_code : "";
    const flow = codes.get(code);
    if (flow === undefined || !answers(code_verifier, flow.challenge, flow.method))
      return send(res, 400, {
        code: 400,
        error_code: "flow_state_not_found",
        msg: "invalid flow state, no valid flow state found",
      });
    codes.delete(code);
    return send(res, 200, session(flow.email, flow.provider));
  }
  if (req.method === "POST" && path === "/auth/v1/test/provider") {
    const { email } = await bodyOf(req);
    if (email !== null && typeof email !== "string") return send(res, 400, { msg: "email" });
    providerEmail = email;
    return send(res, 200, {});
  }
  return send(res, 404, { msg: `${req.method} ${path}` });
}).listen(AUTH_PORT, "127.0.0.1", () => process.stdout.write(`auth stand-in on ${AUTH_ORIGIN}\n`));
