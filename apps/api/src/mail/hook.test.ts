import { randomBytes } from "node:crypto";
import type { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { AUTH_EMAIL_HOOK_PATH, LIMITS } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { AUTH_EMAIL_FROM, handleSendEmail, lambdaMail, type MailDeps, secretsOf } from "./hook.ts";

// Keys made per run, never committed (apps/api/AGENTS.md). Supabase shows a secret as v1,whsec_<base64>.
const KEY = randomBytes(32).toString("base64");
const OTHER_KEY = randomBytes(32).toString("base64");
const SECRET = `v1,whsec_${KEY}`;
const OTHER_PROJECT = `v1,whsec_${OTHER_KEY}`;

const ADDRESS = "parent@example.com";
const NEW_ADDRESS = "parent.new@example.com";

function payload(
  type: string,
  extra: Record<string, unknown> = {},
  user: Record<string, unknown> = {},
) {
  return JSON.stringify({
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      email: ADDRESS,
      user_metadata: {},
      ...user,
    },
    email_data: {
      token: "123456",
      token_hash: "hash",
      token_new: "",
      token_hash_new: "",
      redirect_to: "https://app.jadwigo.pl/parent",
      site_url: "https://app.jadwigo.pl",
      email_action_type: type,
      ...extra,
    },
  });
}

/** Standard Webhooks headers for `raw`, signed with `key` at the pinned clock. */
function signedHeaders(raw: string, key = KEY): Headers {
  const id = "msg_test";
  const at = new Date();
  return new Headers({
    "content-type": "application/json",
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
    "webhook-signature": new Webhook(key).sign(id, at, raw),
  });
}

function fakeMail(secrets: string | undefined = SECRET) {
  const sent: SendEmailCommand[] = [];
  const logs: string[] = [];
  const deps: MailDeps = {
    readSecrets: async () => secrets,
    client: {
      send: async (command) => {
        sent.push(command);
        return { MessageId: `ses-${sent.length}` };
      },
    },
    log: (line) => void logs.push(line),
  };
  return { deps, sent, logs };
}

describe("the Send Email Hook's signature (Standard Webhooks)", () => {
  it.each([
    ["no signature headers", (_raw: string) => new Headers({ "content-type": "application/json" })],
    ["another project's key", (raw: string) => signedHeaders(raw, OTHER_KEY)],
    [
      "a body changed after signing",
      (raw: string) => signedHeaders(raw.replace("123456", "654321")),
    ],
    [
      "a forged signature",
      (raw: string) => {
        const headers = signedHeaders(raw);
        headers.set("webhook-signature", `v1,${randomBytes(32).toString("base64")}`);
        return headers;
      },
    ],
  ])("refuses %s with 401 and sends nothing", async (_, headersFor) => {
    const { deps, sent } = fakeMail();
    const raw = payload("signup");
    const reply = await handleSendEmail(raw, headersFor(raw), deps);
    expect(reply.status).toBe(401);
    expect(reply.body).toEqual({ error: { http_code: 401, message: expect.any(String) } });
    expect(sent).toHaveLength(0);
  });

  it("refuses everything with 401 while no secret is set", async () => {
    for (const secrets of [undefined, "", "  "]) {
      const { deps, sent } = fakeMail();
      const unset: MailDeps = { ...deps, readSecrets: async () => secrets };
      const raw = payload("signup");
      expect((await handleSendEmail(raw, signedHeaders(raw), unset)).status).toBe(401);
      expect(sent).toHaveLength(0);
    }
  });

  it("refuses a signature older than 5 minutes", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload("signup");
    const at = new Date(Date.now() - 6 * 60 * 1000);
    const headers = new Headers({
      "webhook-id": "msg_old",
      "webhook-timestamp": String(Math.floor(at.getTime() / 1000)),
      "webhook-signature": new Webhook(KEY).sign("msg_old", at, raw),
    });
    expect((await handleSendEmail(raw, headers, deps)).status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("accepts either project's secret when the parameter holds both", async () => {
    const { deps, sent } = fakeMail(`${OTHER_PROJECT} ${SECRET}`);
    const raw = payload("signup");
    expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(200);
    expect(sent).toHaveLength(1);
  });

  it("answers 500 and sends nothing when the secret cannot be read", async () => {
    const { deps, sent } = fakeMail();
    const failing: MailDeps = { ...deps, readSecrets: () => Promise.reject(new Error("ssm down")) };
    const raw = payload("signup");
    expect((await handleSendEmail(raw, signedHeaders(raw), failing)).status).toBe(500);
    expect(sent).toHaveLength(0);
  });
});

describe("secretsOf", () => {
  it("strips v1, and whsec_ and splits on spaces", () => {
    expect(secretsOf(` v1,whsec_abc  whsec_def\nghi `)).toEqual(["abc", "def", "ghi"]);
    expect(secretsOf(undefined)).toEqual([]);
  });
});

describe("the Send Email Hook's mail", () => {
  it("sends a signup in Polish from no-reply@jadwigo.pl with the code, and answers 200 {}", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload("signup");
    const reply = await handleSendEmail(raw, signedHeaders(raw), deps);
    expect(reply).toEqual({ status: 200, body: {} });
    expect(sent).toHaveLength(1);
    const input = sent[0]?.input;
    expect(input?.FromEmailAddress).toBe(AUTH_EMAIL_FROM);
    expect(AUTH_EMAIL_FROM).toBe("Jadwigo <no-reply@jadwigo.pl>");
    expect(input?.Destination?.ToAddresses).toEqual([ADDRESS]);
    expect(input?.Content?.Simple?.Subject?.Data).toBe("Twój kod do Jadwigo");
    expect(input?.Content?.Simple?.Body?.Html?.Data).toContain("123456");
    expect(input?.Content?.Simple?.Body?.Text?.Data).toContain("123456");
  });

  it("sends in English when the page put en in the user's metadata", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload("magiclink", {}, { user_metadata: { language: "en" } });
    expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(200);
    expect(sent[0]?.input.Content?.Simple?.Subject?.Data).toBe("Your Jadwigo sign-in code");
  });

  it.each(["signup", "magiclink", "reauthentication", "recovery"])(
    "sends %s as one mail to the user",
    async (type) => {
      const { deps, sent } = fakeMail();
      const raw = payload(type);
      expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(200);
      expect(sent.map((c) => c.input.Destination?.ToAddresses)).toEqual([[ADDRESS]]);
    },
  );

  it("sends a secure email change as 2 mails: token to the current address, token_new to the new one", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload(
      "email_change",
      { token: "111111", token_new: "222222" },
      { new_email: NEW_ADDRESS },
    );
    expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(200);
    expect(sent.map((c) => c.input.Destination?.ToAddresses?.[0])).toEqual([ADDRESS, NEW_ADDRESS]);
    expect(sent[0]?.input.Content?.Simple?.Body?.Text?.Data).toContain("111111");
    expect(sent[1]?.input.Content?.Simple?.Body?.Text?.Data).toContain("222222");
  });

  it("sends an email change with one token as one mail to the new address", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload(
      "email_change",
      { token: "", token_new: "333333" },
      { new_email: NEW_ADDRESS },
    );
    expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(200);
    expect(sent.map((c) => c.input.Destination?.ToAddresses?.[0])).toEqual([NEW_ADDRESS]);
    expect(sent[0]?.input.Content?.Simple?.Body?.Text?.Data).toContain("333333");
  });

  it.each(["invite", "email", "password_changed_notification", ""])(
    "refuses the kind %j with 400 and sends nothing",
    async (type) => {
      const { deps, sent } = fakeMail();
      const raw = payload(type);
      const reply = await handleSendEmail(raw, signedHeaders(raw), deps);
      expect(reply.status).toBe(400);
      expect(sent).toHaveLength(0);
    },
  );

  // A signed body that is not JSON never gets this far: the library's verify parses it, so it is 401.
  it("refuses a signed body that is not a hook payload, or carries no 6-digit code", async () => {
    for (const raw of [
      "{}",

      payload("signup", { token: "" }),
      payload("signup", { token: "12ab56" }),
    ]) {
      const { deps, sent } = fakeMail();
      expect((await handleSendEmail(raw, signedHeaders(raw), deps)).status).toBe(400);
      expect(sent).toHaveLength(0);
    }
  });

  it("logs the kind, the language and SES's id, never the address or the code", async () => {
    const { deps, logs } = fakeMail();
    const raw = payload("signup");
    await handleSendEmail(raw, signedHeaders(raw), deps);
    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0] ?? "")).toEqual({
      level: "INFO",
      message: "auth mail sent",
      action: "signup",
      language: "pl",
      message_id: "ses-1",
    });
    for (const line of logs) {
      expect(line).not.toContain("example.com");
      expect(line).not.toContain("123456");
    }
  });

  it("answers 500 when SES refuses, logging no address", async () => {
    const { deps, logs } = fakeMail();
    const refusing: MailDeps = {
      ...deps,
      client: {
        send: () => Promise.reject(Object.assign(new Error(ADDRESS), { name: "MessageRejected" })),
      },
    };
    const raw = payload("signup");
    const reply = await handleSendEmail(raw, signedHeaders(raw), refusing);
    expect(reply.status).toBe(500);
    expect(logs.join("\n")).toContain("MessageRejected");
    expect(logs.join("\n")).not.toContain("example.com");
  });
});

describe(`POST ${AUTH_EMAIL_HOOK_PATH} on the router`, () => {
  async function post(mail: MailDeps | undefined, raw: string, headers: Headers) {
    const app = createApp(new InMemoryStore(), { mail });
    const reply = (await app.resolve(
      {
        version: "2.0",
        routeKey: "$default",
        rawPath: AUTH_EMAIL_HOOK_PATH,
        rawQueryString: "",
        headers: Object.fromEntries(headers),
        requestContext: { http: { method: "POST", path: AUTH_EMAIL_HOOK_PATH }, stage: "$default" },
        body: raw,
        isBase64Encoded: false,
      },
      {} as Parameters<typeof app.resolve>[1],
    )) as { statusCode: number; body?: string };
    return { status: reply.statusCode, body: reply.body ? JSON.parse(reply.body) : null };
  }

  it("verifies the raw body the router hands it and sends", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload("signup");
    expect(await post(deps, raw, signedHeaders(raw))).toEqual({ status: 200, body: {} });
    expect(sent).toHaveLength(1);
  });

  it("is 401 unsigned, sending nothing", async () => {
    const { deps, sent } = fakeMail();
    const reply = await post(
      deps,
      payload("signup"),
      new Headers({ "content-type": "application/json" }),
    );
    expect(reply.status).toBe(401);
    expect(sent).toHaveLength(0);
  });

  it("is 400 past the body limit", async () => {
    const { deps, sent } = fakeMail();
    const raw = payload("signup", { padding: "x".repeat(LIMITS.bodyBytes) });
    expect((await post(deps, raw, signedHeaders(raw))).status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("is NotFound while the hook is not wired", async () => {
    const raw = payload("signup");
    const reply = await post(undefined, raw, signedHeaders(raw));
    expect(reply.status).toBe(404);
  });
});

describe("lambdaMail", () => {
  it("is not wired without the parameter's name", () => {
    expect(lambdaMail(undefined, async () => SECRET)).toBeUndefined();
  });

  it("reads the secret once, and again after a failed read", async () => {
    let reads = 0;
    const read = async (name: string) => {
      reads += 1;
      expect(name).toBe("/jadwigo/prod/send-email-hook-secret");
      if (reads === 1) throw new Error("ssm down");
      return SECRET;
    };
    const mail = lambdaMail("/jadwigo/prod/send-email-hook-secret", read, {
      send: async () => ({}),
    });
    await expect(mail?.readSecrets()).rejects.toThrow("ssm down");
    expect(await mail?.readSecrets()).toBe(SECRET);
    expect(await mail?.readSecrets()).toBe(SECRET);
    expect(reads).toBe(2);
  });
});
