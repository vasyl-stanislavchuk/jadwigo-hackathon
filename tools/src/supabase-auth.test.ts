// infra/supabase-auth/auth.sh (dl-e8ov.2.40, dl-e8ov.2.52) against a fake Management API on
// 127.0.0.1, with a stub security first on PATH and curl wrapped to log its argv, so nothing here
// reaches Supabase or the keychain. A secret shows only as set or missing: never in stdout, stderr
// or any argv. apply is refused under CLAUDECODE and while a keychain item is missing.
import { spawn, spawnSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
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
const REF = "jweuvslwntdimuwcvlzq";
const TOKEN = "sbp_stub_token_7f3a";
// Quotes and a backslash, so the curl config quoting is exercised too.
const SECRET = 'GOCSPX-stub"se\\cret-91c4';
const ITEM = "jadwigo-google-oauth-secret-dev";
const SETTINGS = {
  site_url: "http://127.0.0.1:5173",
  uri_allow_list: "http://127.0.0.1:*/**,http://localhost:*/**",
  mailer_otp_length: 6,
};
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
// How GET /config/auth shows a set secret: HMAC-SHA256 keyed by the project ref (dl-e8ov.2.84).
const hmacByRef = (s: string) => createHmac("sha256", REF).update(s).digest("hex");
const which = (tool: string) =>
  spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();

interface Request {
  readonly method: string;
  readonly url: string;
  readonly authorization: string;
  readonly body: string;
}

/**
 * The fake Management API: answers GET /projects/<ref>/config/auth with `live`, and a read-only
 * database query for to_regprocedure(<fn>) with whether <fn> is in `functions`; records every call.
 */
async function fakeApi(live: Record<string, unknown>, functions: readonly string[] = []) {
  const requests: Request[] = [];
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      requests.push({
        method: req.method ?? "",
        url: req.url ?? "",
        authorization: req.headers.authorization ?? "",
        body,
      });
      res.setHeader("Content-Type", "application/json");
      if (req.url === `/v1/projects/${REF}/database/query`) {
        const { query, parameters, read_only } = JSON.parse(body);
        const asked = read_only === true && query.includes("to_regprocedure($1)");
        res.end(JSON.stringify([{ present: asked && functions.includes(parameters[0]) }]));
        return;
      }
      res.end(req.method === "GET" ? JSON.stringify(live) : "{}");
    });
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  servers.push(server);
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/v1`, requests };
}

const servers: Server[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    await new Promise((done) => server.close(done));
  }
});

interface Stage {
  readonly script: string;
  readonly keychain: string;
  readonly log: string;
  readonly env: Record<string, string>;
}

/** auth.sh copied beside a dev.json of our own, with stub security and a logging curl on PATH. */
function stage(
  file: Record<string, unknown>,
  apiUrl: string,
  keychain: Record<string, string> = {},
) {
  const dir = mkdtempSync(join(tmpdir(), "supabase-auth-"));
  const bin = join(dir, "bin");
  const here = join(dir, "supabase-auth");
  const items = join(dir, "keychain");
  for (const d of [bin, here, items]) mkdirSync(d);
  const script = join(here, "auth.sh");
  copyFileSync(join(repo, "infra/supabase-auth/auth.sh"), script);
  chmodSync(script, 0o755);
  writeFileSync(join(here, "dev.json"), JSON.stringify({ ref: REF, ...file }));
  for (const [item, value] of Object.entries(keychain)) writeFileSync(join(items, item), value);
  const log = join(dir, "argv.log");
  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/bin/sh\necho "${name} $*" >> "${log}"\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  // security find-generic-password -a jadwigo -s <item> -w, as the keychain answers it.
  stub(
    "security",
    `f="${items}/$5"; [ -f "$f" ] || { echo "security: The specified item could not be found in the keychain." >&2; exit 44; }; cat "$f"; echo`,
  );
  stub("curl", `exec "${which("curl")}" "$@"`);
  const env: Record<string, string> = {
    PATH: `${bin}:${dirname(which("jq"))}:/usr/bin:/bin`,
    HOME: dir,
    SUPABASE_ACCESS_TOKEN: TOKEN,
    SUPABASE_API_URL: apiUrl,
  };
  return { script, keychain: items, log, env } satisfies Stage;
}

/** auth.sh run asynchronously, so the fake API in this process can answer it. */
function run(s: Stage, args: string[], env: Record<string, string> = {}) {
  return new Promise<{ status: number | null; stdout: string; stderr: string; argv: string }>(
    (done) => {
      const child = spawn(s.script, args, { env: { ...s.env, ...env } });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      child.stderr.on("data", (d: Buffer) => {
        stderr += d.toString();
      });
      child.on("close", (status) => {
        const argv = existsSync(s.log) ? readFileSync(s.log, "utf8") : "";
        done({ status, stdout, stderr, argv });
      });
    },
  );
}

const GOOGLE = {
  settings: {
    ...SETTINGS,
    external_google_enabled: false,
    external_google_client_id: "stub.apps.googleusercontent.com",
    external_google_email_optional: false,
  },
  secrets: { external_google_secret: ITEM },
};
const googleLive = (secret: string | null) => ({
  ...GOOGLE.settings,
  external_google_secret: secret,
  smtp_pass: null,
});

/** No secret, and no token, in anything the run printed or put in an argv. */
function expectNoSecret(out: { stdout: string; stderr: string; argv: string }) {
  for (const text of [out.stdout, out.stderr, out.argv]) {
    expect(text).not.toContain("se\\cret");
    expect(text).not.toContain("GOCSPX");
    expect(text).not.toContain(TOKEN);
  }
}

describe("auth.sh", () => {
  it("diff: in step exits 0", async () => {
    const api = await fakeApi({ ...SETTINGS, other_setting: true });
    const out = await run(stage({ settings: SETTINGS }, api.url), ["diff", "dev"]);
    expect(out.stdout).toBe(`dev (${REF}): in step\n`);
    expect(out.status).toBe(0);
    expect(api.requests).toEqual([
      {
        method: "GET",
        url: `/v1/projects/${REF}/config/auth`,
        authorization: `Bearer ${TOKEN}`,
        body: "",
      },
    ]);
    expectNoSecret(out);
  });

  it("diff: differing settings print have -> want and exit 2, sending no PATCH", async () => {
    const api = await fakeApi({
      site_url: "http://localhost:3000",
      uri_allow_list: "",
      mailer_otp_length: 8,
    });
    const out = await run(stage({ settings: SETTINGS }, api.url), ["diff", "dev"]);
    expect(out.stdout).toBe(
      [
        `dev (${REF}): would change`,
        `  site_url: "http://localhost:3000" -> "http://127.0.0.1:5173"`,
        `  uri_allow_list: "" -> "http://127.0.0.1:*/**,http://localhost:*/**"`,
        "  mailer_otp_length: 8 -> 6",
        "",
      ].join("\n"),
    );
    expect(out.status).toBe(2);
    expect(api.requests.map((r) => r.method)).toEqual(["GET"]);
  });

  it("diff: a secret not set in the project shows (not set) -> (set), never its value", async () => {
    const api = await fakeApi(googleLive(null));
    const out = await run(stage(GOOGLE, api.url, { [ITEM]: SECRET }), ["diff", "dev"]);
    expect(out.stdout).toBe(
      `dev (${REF}): would change\n  external_google_secret: (not set) -> (set)\n`,
    );
    expect(out.status).toBe(2);
    expect(out.argv).toContain(`security find-generic-password -a jadwigo -s ${ITEM} -w`);
    expectNoSecret(out);
  });

  it("diff: the project's HMAC of the keychain value, keyed by the ref, is in step; another differs", async () => {
    const same = await fakeApi(googleLive(hmacByRef(SECRET)));
    const inStep = await run(stage(GOOGLE, same.url, { [ITEM]: SECRET }), ["diff", "dev"]);
    expect(inStep.stdout).toBe(`dev (${REF}): in step\n`);
    expect(inStep.status).toBe(0);
    expectNoSecret(inStep);

    for (const live of [hmacByRef("an older secret"), sha256(SECRET)]) {
      const other = await fakeApi(googleLive(live));
      const differs = await run(stage(GOOGLE, other.url, { [ITEM]: SECRET }), ["diff", "dev"]);
      expect(differs.stdout).toContain("  external_google_secret: (another value) -> (set)");
      expect(differs.status).toBe(2);
      expectNoSecret(differs);
    }
  });

  it("diff: a missing keychain item says missing and exits 1", async () => {
    const api = await fakeApi(googleLive(null));
    const out = await run(stage(GOOGLE, api.url), ["diff", "dev"]);
    expect(out.stdout).toContain(`  external_google_secret: missing from the keychain (${ITEM})`);
    expect(out.status).toBe(1);
    expect(out.stderr).toBe("");
  });

  it("apply: refused under CLAUDECODE before any request", async () => {
    const api = await fakeApi(googleLive(null));
    const out = await run(stage(GOOGLE, api.url, { [ITEM]: SECRET }), ["apply", "dev"], {
      CLAUDECODE: "1",
    });
    expect(out.status).toBe(1);
    expect(out.stderr).toContain("the owner applies, from a terminal");
    expect(api.requests).toEqual([]);
  });

  it("apply: a missing keychain item refuses before anything is sent", async () => {
    const api = await fakeApi(googleLive(null));
    const out = await run(stage(GOOGLE, api.url), ["apply", "dev"]);
    expect(out.status).toBe(1);
    expect(out.stderr).toContain(`${ITEM} is missing; nothing sent`);
    expect(api.requests).toEqual([]);
  });

  it("apply: the PATCH carries the settings and the secret on curl's stdin, never in argv", async () => {
    const api = await fakeApi({ ...googleLive(null), site_url: "http://localhost:3000" });
    const out = await run(stage(GOOGLE, api.url, { [ITEM]: SECRET }), ["apply", "dev"]);
    expect(out.status, out.stderr).toBe(0);
    expect(out.stdout).toContain(`dev (${REF}): applied`);
    const patch = api.requests.find((r) => r.method === "PATCH");
    expect(patch?.authorization).toBe(`Bearer ${TOKEN}`);
    expect(JSON.parse(patch?.body ?? "{}")).toEqual({
      site_url: "http://127.0.0.1:5173",
      external_google_secret: SECRET,
    });
    expectNoSecret(out);
  });

  it("refuses a secret in settings and an email_optional that is not false", async () => {
    const api = await fakeApi(SETTINGS);
    for (const settings of [
      { ...SETTINGS, external_google_secret: "in-the-file" },
      { ...SETTINGS, external_facebook_email_optional: true },
    ]) {
      const out = await run(stage({ settings }, api.url), ["diff", "dev"]);
      expect(out.status).toBe(64);
      expect(out.stderr).toContain("an *_email_optional that is not false");
    }
    expect(api.requests).toEqual([]);
  });

  describe("the custom access token hook (dl-e8ov.2.67)", () => {
    const URI = "pg-functions://postgres/app/custom_access_token";
    const FN = "app.custom_access_token(jsonb)";
    const HOOK = {
      settings: {
        ...SETTINGS,
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: URI,
      },
    };
    const hookOff = {
      ...SETTINGS,
      hook_custom_access_token_enabled: false,
      hook_custom_access_token_uri: null,
    };
    const pushFirst = "make db-push ENV=dev first";

    it("diff shows the 2 hook settings when the function is in the project", async () => {
      const api = await fakeApi(hookOff, [FN]);
      const out = await run(stage(HOOK, api.url), ["diff", "dev"]);
      expect(out.stdout).toBe(
        [
          `dev (${REF}): would change`,
          "  hook_custom_access_token_enabled: false -> true",
          `  hook_custom_access_token_uri: null -> "${URI}"`,
          "",
        ].join("\n"),
      );
      expect(out.status).toBe(2);
      const query = api.requests.find((r) => r.url.endsWith("/database/query"));
      expect(JSON.parse(query?.body ?? "{}")).toEqual({
        query: "select pg_catalog.to_regprocedure($1) is not null as present",
        parameters: [FN],
        read_only: true,
      });
    });

    it("diff says the function is missing and exits 1 until it is pushed", async () => {
      const api = await fakeApi(hookOff);
      const out = await run(stage(HOOK, api.url), ["diff", "dev"]);
      expect(out.stdout).toContain(
        `  hook_custom_access_token_uri: ${FN} is not in the project; ${pushFirst}`,
      );
      expect(out.status).toBe(1);
    });

    it("apply sends nothing while the function is missing", async () => {
      const api = await fakeApi(hookOff);
      const out = await run(stage(HOOK, api.url), ["apply", "dev"]);
      expect(out.status).toBe(1);
      expect(out.stderr).toContain(`${FN} is not in the project; run ${pushFirst}`);
      expect(api.requests.map((r) => r.method)).toEqual(["POST"]);
    });

    it("apply switches the hook on once the function is there", async () => {
      const api = await fakeApi(hookOff, [FN]);
      const out = await run(stage(HOOK, api.url), ["apply", "dev"]);
      expect(out.status, out.stderr).toBe(0);
      const patch = api.requests.find((r) => r.method === "PATCH");
      expect(JSON.parse(patch?.body ?? "{}")).toEqual({
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: URI,
      });
    });

    it("the hook on with a uri that is not pg-functions://postgres/<schema>/<function> is refused", async () => {
      const api = await fakeApi(hookOff);
      const bad = {
        settings: { ...HOOK.settings, hook_custom_access_token_uri: "https://hook.invalid" },
      };
      const out = await run(stage(bad, api.url), ["diff", "dev"]);
      expect(out.status).toBe(64);
      expect(api.requests).toEqual([]);
    });

    it("the hook is on in dev.json and prod.json (dl-e8ov.2.92)", () => {
      const read = (env: string) =>
        JSON.parse(readFileSync(join(repo, `infra/supabase-auth/${env}.json`), "utf8")).settings;
      expect(read("dev")).toMatchObject(HOOK.settings);
      expect(read("prod")).toMatchObject({
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: HOOK.settings.hook_custom_access_token_uri,
      });
    });
  });

  it("Google (dl-e8ov.2.8) and Facebook (dl-e8ov.2.58) are on in dev.json and prod.json (dl-e8ov.2.92) with each project's keychain secrets", () => {
    const read = (env: string) =>
      JSON.parse(readFileSync(join(repo, `infra/supabase-auth/${env}.json`), "utf8"));
    const dev = read("dev");
    const prod = read("prod");
    for (const env of [dev, prod]) {
      expect(env.settings).toMatchObject({
        external_google_enabled: true,
        external_google_client_id: expect.stringMatching(/\.apps\.googleusercontent\.com$/),
        external_google_email_optional: false,
        external_facebook_enabled: true,
        external_facebook_client_id: expect.stringMatching(/^\d+$/),
        external_facebook_email_optional: false,
      });
    }
    expect(dev.secrets).toEqual({
      external_google_secret: "jadwigo-google-oauth-secret-dev",
      external_facebook_secret: "jadwigo-facebook-app-secret-dev",
    });
    expect(prod.secrets).toEqual({
      external_google_secret: "jadwigo-google-oauth-secret-prod",
      external_facebook_secret: "jadwigo-facebook-app-secret-prod",
    });
    // Each project has its own Google client; one Meta app serves both.
    expect(prod.settings.external_google_client_id).not.toBe(
      dev.settings.external_google_client_id,
    );
    expect(prod.settings.external_facebook_client_id).toBe(
      dev.settings.external_facebook_client_id,
    );
  });

  it("the committed env files name no secret value and keep email_optional off", () => {
    for (const env of ["dev", "prod"]) {
      const file = JSON.parse(readFileSync(join(repo, `infra/supabase-auth/${env}.json`), "utf8"));
      const keys = Object.keys(file.settings);
      expect(keys.filter((k) => k.endsWith("_secret") || k.endsWith("_secrets"))).toEqual([]);
      for (const k of keys.filter((k) => k.endsWith("_email_optional"))) {
        expect(file.settings[k]).toBe(false);
      }
    }
  });
});
