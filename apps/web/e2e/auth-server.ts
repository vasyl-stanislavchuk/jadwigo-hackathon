// A stand-in for Supabase Auth in the browser tests (dl-e8ov.2.38), so parent login runs end to end
// with no Supabase project and no mail. It makes an RS256 key for this run (never a Supabase key;
// nothing private is written anywhere) and serves, on 127.0.0.1:54321:
//
//   GET  /auth/v1/.well-known/jwks.json   the key's public half, which apps/api verifies tokens
//                                          against (AUTH_JWKS_URL); the issuer is /auth/v1, as
//                                          apps/api's issuerOf() derives it
//   POST /auth/v1/otp                     "sends" a code: every code is 123456
//   POST /auth/v1/verify                  turns 123456 into a session whose access token is shaped
//                                          like Supabase's (iss, aud and role authenticated, sub,
//                                          email, exp), one sub per email for the run
//
// playwright.config.ts starts it for the `api` project. Its tokens mirror apps/api's own test
// signer (apps/api/src/testing/token.ts).
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
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
  const path = new URL(req.url ?? "/", AUTH_ORIGIN).pathname;
  if (req.method === "OPTIONS") return send(res, 204, null);
  if (req.method === "GET" && path === "/auth/v1/.well-known/jwks.json")
    return send(res, 200, jwks);
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
    const sub = subs.get(email) ?? randomUUID();
    subs.set(email, sub);
    const now = Math.floor(Date.now() / 1000);
    return send(res, 200, {
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
        app_metadata: { provider: "email" },
        user_metadata: {},
        created_at: new Date(now * 1000).toISOString(),
      },
    });
  }
  return send(res, 404, { msg: `${req.method} ${path}` });
}).listen(AUTH_PORT, "127.0.0.1", () => process.stdout.write(`auth stand-in on ${AUTH_ORIGIN}\n`));
