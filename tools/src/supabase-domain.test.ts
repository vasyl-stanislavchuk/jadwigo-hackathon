// infra/supabase-auth/domain.sh (dl-e8ov.2.65) against a fake Management API and a fake Auth on
// 127.0.0.1, with curl wrapped to log its argv, so nothing here reaches Supabase. The owner's commands
// refuse CLAUDECODE; status prints the TXT records as prod.tfvars takes them; activate waits for
// 4_origin_setup_completed; issuer passes only an RS256 token whose iss is what the authorizer pins.
// No token, email code or access token shows in stdout, stderr or any argv.
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const REF = "xhzkmpainwzrfktxffjv";
const DOMAIN = "auth.jadwigo.pl";
const TOKEN = "sbp_stub_token_5d1e";
const CODE = "482913";
const ISSUER = `https://${REF}.supabase.co/auth/v1`;
const which = (tool: string) =>
  spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (header: object, payload: object) =>
  `${b64url(header)}.${b64url(payload)}.stub-signature`;

interface Request {
  readonly method: string;
  readonly url: string;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly body: string;
}

const HOSTNAME = (status: string) => ({
  status,
  custom_hostname: DOMAIN,
  data: {
    success: true,
    errors: [],
    messages: [],
    result: {
      id: "stub",
      hostname: DOMAIN,
      ssl: {
        status: "pending_validation",
        validation_records: [{ txt_name: `_acme-challenge.${DOMAIN}`, txt_value: "ssl-stub" }],
      },
      ownership_verification: {
        type: "txt",
        name: `_cf-custom-hostname.${DOMAIN}`,
        value: "own-stub",
      },
      verification_errors: [],
    },
  },
});

interface Fake {
  readonly status?: string;
  readonly accessToken?: string;
  readonly jwks?: object;
}

/** The fake Management API under /v1 and the fake Auth under /auth/v1, recording every call. */
async function fakeSupabase(fake: Fake = {}) {
  const requests: Request[] = [];
  const answer = (method: string, url: string): unknown => {
    if (url === `/v1/projects/${REF}/custom-hostname`)
      return HOSTNAME(fake.status ?? "2_initiated");
    if (url === `/v1/projects/${REF}/api-keys`)
      return [{ name: "default", type: "publishable", api_key: "sb_publishable_stub" }];
    if (url === "/auth/v1/verify")
      return { access_token: fake.accessToken ?? "", token_type: "bearer" };
    if (url === "/auth/v1/.well-known/jwks.json") return fake.jwks ?? { keys: [] };
    return method === "POST" ? {} : null;
  };
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      const method = req.method ?? "";
      const url = req.url ?? "";
      requests.push({ method, url, headers: req.headers, body });
      const out = answer(method, url);
      res.statusCode = out === null ? 404 : 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(out ?? { message: "not found" }));
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return { origin: `http://127.0.0.1:${port}`, requests };
}

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise((done) => server.close(done));
  }
});

/** domain.sh copied beside a prod.json naming the domain, with curl logging its argv; run async. */
function run(origin: string, args: string[], input = "", env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "supabase-domain-"));
  const bin = join(dir, "bin");
  const here = join(dir, "supabase-auth");
  for (const d of [bin, here]) mkdirSync(d);
  const script = join(here, "domain.sh");
  copyFileSync(join(repo, "infra/supabase-auth/domain.sh"), script);
  chmodSync(script, 0o755);
  writeFileSync(
    join(here, "prod.json"),
    JSON.stringify({ ref: REF, custom_domain: DOMAIN, settings: {} }),
  );
  const log = join(dir, "argv.log");
  writeFileSync(
    join(bin, "curl"),
    `#!/bin/sh\necho "curl $*" >> "${log}"\nexec "${which("curl")}" "$@"\n`,
  );
  chmodSync(join(bin, "curl"), 0o755);
  const childEnv = {
    PATH: `${bin}:${dirname(which("jq"))}:/usr/bin:/bin`,
    HOME: dir,
    SUPABASE_ACCESS_TOKEN: TOKEN,
    SUPABASE_API_URL: `${origin}/v1`,
    SUPABASE_AUTH_URL: `${origin}/auth/v1`,
    ...env,
  };
  return new Promise<{ status: number | null; stdout: string; stderr: string; argv: string }>(
    (done) => {
      const child = spawn(script, args, { env: childEnv });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });
      child.on("close", (status) => {
        done({ status, stdout, stderr, argv: existsSync(log) ? readFileSync(log, "utf8") : "" });
      });
      child.stdin.end(input);
    },
  );
}

/** Nothing that signs anyone in shows in what the run printed or put in an argv. */
function expectNothingSecret(out: { stdout: string; stderr: string; argv: string }, token = "") {
  for (const text of [out.stdout, out.stderr, out.argv]) {
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain(CODE);
    if (token) expect(text).not.toContain(token);
  }
}

const RSA_JWKS = {
  keys: [
    { kid: "rsa-1", kty: "RSA", alg: "RS256" },
    { kid: "ec-1", kty: "EC", alg: "ES256" },
  ],
};

describe("domain.sh", () => {
  it("status prints the state and the TXT records as prod.tfvars takes them", async () => {
    const fake = await fakeSupabase();
    const out = await run(fake.origin, ["status"]);
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout).toContain("status: 2_initiated");
    expect(out.stdout).toContain(`DNS: the CNAME ${DOMAIN} -> ${REF}.supabase.co`);
    expect(out.stdout).toContain(
      [
        "auth_domain_txt = {",
        `  "_cf-custom-hostname.${DOMAIN}" = "own-stub"`,
        `  "_acme-challenge.${DOMAIN}" = "ssl-stub"`,
        "}",
      ].join("\n"),
    );
    expect(fake.requests.map((r) => `${r.method} ${r.url}`)).toEqual([
      `GET /v1/projects/${REF}/custom-hostname`,
    ]);
    expect(fake.requests[0]?.headers["authorization"]).toBe(`Bearer ${TOKEN}`);
    expectNothingSecret(out);
  });

  for (const cmd of ["create", "reverify", "activate", "issuer"]) {
    it(`${cmd} is refused under CLAUDECODE before any request`, async () => {
      const fake = await fakeSupabase();
      const out = await run(fake.origin, [cmd], "", { CLAUDECODE: "1" });
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("the owner runs it, from a terminal");
      expect(fake.requests).toEqual([]);
    });
  }

  it("create starts the domain named in prod.json", async () => {
    const fake = await fakeSupabase();
    const out = await run(fake.origin, ["create"]);
    expect(out.status, out.stderr).toBe(0);
    const create = fake.requests.find((r) => r.url.endsWith("/custom-hostname/initialize"));
    expect(create?.method).toBe("POST");
    expect(JSON.parse(create?.body ?? "{}")).toEqual({ custom_hostname: DOMAIN });
    expect(out.stdout).toContain("auth_domain_txt = {");
    expectNothingSecret(out);
  });

  it("activate waits for 4_origin_setup_completed", async () => {
    const early = await fakeSupabase({ status: "3_challenge_verified" });
    const refused = await run(early.origin, ["activate"]);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("status is 3_challenge_verified");
    expect(early.requests.some((r) => r.url.endsWith("/activate"))).toBe(false);

    const ready = await fakeSupabase({ status: "4_origin_setup_completed" });
    const out = await run(ready.origin, ["activate"]);
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout).toContain(`${DOMAIN}: activated on ${REF}`);
    expect(ready.requests.filter((r) => r.url.endsWith("/activate")).map((r) => r.method)).toEqual([
      "POST",
    ]);
  });

  it("issuer passes an RS256 token with the pinned iss, keeping the code and the token out of sight", async () => {
    const accessToken = jwt(
      { alg: "RS256", kid: "rsa-1", typ: "JWT" },
      { iss: ISSUER, sub: "stub" },
    );
    const fake = await fakeSupabase({ accessToken, jwks: RSA_JWKS });
    const out = await run(fake.origin, ["issuer"], `owner@example.invalid\n${CODE}\n`);
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout).toContain(`iss: ${ISSUER}`);
    expect(out.stdout).toContain("alg: RS256");
    expect(out.stdout).toContain("the JWKS key for that kid: RSA RS256");
    expect(out.stdout).toContain("matches the authorizer");
    const otp = fake.requests.find((r) => r.url === "/auth/v1/otp");
    expect(otp?.headers["apikey"]).toBe("sb_publishable_stub");
    expect(JSON.parse(otp?.body ?? "{}")).toEqual({
      email: "owner@example.invalid",
      create_user: false,
    });
    const verify = fake.requests.find((r) => r.url === "/auth/v1/verify");
    expect(JSON.parse(verify?.body ?? "{}")).toEqual({
      type: "email",
      email: "owner@example.invalid",
      token: CODE,
    });
    expectNothingSecret(out, accessToken);
  });

  it("issuer stops on another iss or an ES256 signature", async () => {
    for (const [header, iss] of [
      [{ alg: "RS256", kid: "rsa-1" }, `https://${DOMAIN}/auth/v1`],
      [{ alg: "ES256", kid: "ec-1" }, ISSUER],
    ] as const) {
      const accessToken = jwt(header, { iss });
      const fake = await fakeSupabase({ accessToken, jwks: RSA_JWKS });
      const out = await run(fake.origin, ["issuer"], `owner@example.invalid\n${CODE}\n`);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain("DIFFERS: stop and tell the lead");
      expectNothingSecret(out, accessToken);
    }
  });

  it("the issuer domain.sh compares with is the one infra/terraform/main.tf pins", () => {
    const main = readFileSync(join(repo, "infra/terraform/main.tf"), "utf8");
    expect(main).toMatch(
      /jwt_issuer = "https:\/\/\$\{var\.supabase_ref\}\.supabase\.co\/auth\/v1"/,
    );
    const prod = JSON.parse(readFileSync(join(repo, "infra/supabase-auth/prod.json"), "utf8"));
    const tfvars = readFileSync(join(repo, "infra/terraform/environments/prod.tfvars"), "utf8");
    expect(tfvars).toContain(`auth_domain     = "${prod.custom_domain}"`);
    expect(tfvars).toContain(`supabase_ref = "${prod.ref}"`);
  });
});
