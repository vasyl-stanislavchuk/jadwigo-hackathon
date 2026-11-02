import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { EventId, ID_PREFIXES, idOf, Uuid } from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";
import {
  acceptMessage,
  CONTRIBUTOR_MODEL,
  createVerbs,
  type EngineDeps,
  fixtureBank,
  InMemoryRunQueue,
} from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW } from "@jadwigo/testing";
import { afterEach, describe, expect, it } from "vitest";
import { createDevRunner, devBankConfig, listenOf, settingsLine } from "./dev.ts";
import { createRunnerHandler } from "./handler.ts";
import { createHost, type HostReport } from "./host.ts";
import { ProbeMuse, turnOf } from "./probe.ts";

/** One made-up pod's queued turn on the in-memory engine, with the scripted model. */
async function queuedTurn() {
  const now = () => FIXED_NOW;
  const store = new InMemoryStore({ now });
  const queue = new InMemoryRunQueue(now);
  const engine: EngineDeps = {
    store,
    muse: new ProbeMuse(),
    verbs: createVerbs({ bank: fixtureBank() }),
    queue,
    now,
  };
  const member = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const conversation = await store.createConversation(member.pod, {
    id: ConversationId.parse(idOf(ID_PREFIXES.conversation, crypto.randomUUID())),
    created_by: member.account,
    title: null,
  });
  const { run } = await acceptMessage(engine, {
    pod: member.pod,
    created_by: member.account,
    conversation_id: conversation.id,
    entry: {
      event_id: EventId.parse(crypto.randomUUID()),
      kind: "message",
      payload: { text: "A made-up lesson: subtracting across 10, grade 1." },
    },
  });
  const logged: string[] = [];
  const handler = createRunnerHandler(
    createHost(async () => ({ engine, max_steps: 20, warn: (l) => logged.push(l) })),
    (line) => logged.push(line),
  );
  return { store, queue, member, run, logged, handler };
}

/** The poke the api's localPoke sends, as the request the server hands the route. */
function poke(body: string, url = "/poke", method = "POST") {
  const req = Object.assign(Readable.from([Buffer.from(body)]), { url, method });
  const res = {
    status: 0,
    writeHead: (s: number) => ({
      end: () => {
        res.status = s;
      },
    }),
  };
  return { req: req as unknown as IncomingMessage, res, out: res as unknown as ServerResponse };
}

describe("the local step host (dl-uukj.47.14.2)", () => {
  it("drains a poked turn with the scripted model and logs the step it ran", async () => {
    const t = await queuedTurn();
    const runner = createDevRunner(t.handler, (l) => t.logged.push(l));
    const { req, res, out } = poke(JSON.stringify({ run_id: t.run.id, attempt: t.run.attempt }));

    await runner.onRequest(req, out);
    await runner.idle();

    expect(res.status).toBe(202);
    const events = await t.store.listRunEvents(t.member.pod, t.run.id, 0);
    expect(turnOf(events).ok).toBe(true);
    expect(events.map((e) => e.type)).toContain("lesson_revision");
    const line = JSON.parse(t.logged.at(-1) ?? "{}");
    expect(line).toMatchObject({
      runner: "drained",
      poked: t.run.id,
      steps: 2,
      outcomes: ["continue", "turn_complete"],
    });
    expect(await t.queue.read(60, 10)).toEqual([]);
  });

  it("drains once more, never beside itself, when woken mid-drain", async () => {
    let running = 0;
    let most = 0;
    let calls = 0;
    const runner = createDevRunner(
      async () => {
        calls += 1;
        running += 1;
        most = Math.max(most, running);
        await new Promise((resolve) => setImmediate(resolve));
        running -= 1;
        return {} as HostReport;
      },
      () => {},
    );
    runner.wake();
    runner.wake();
    runner.wake();
    await runner.idle();
    expect([calls, most]).toEqual([2, 1]);
  });

  it("answers 404 off /poke, and logs a failed drain by its name and code, never its message", async () => {
    const warned: string[] = [];
    const runner = createDevRunner(
      async () => {
        throw Object.assign(new Error("duplicate key value: (text)=(a row value)"), {
          code: "23505",
        });
      },
      (l) => warned.push(l),
    );
    const { req, res, out } = poke("{}", "/other");
    await runner.onRequest(req, out);
    expect(res.status).toBe(404);
    runner.wake();
    await runner.idle();
    expect(warned).toEqual(["dev: the drain failed: Error 23505"]);
  });

  it("listens where LOCAL_RUNNER_URL points, and refuses anything else", () => {
    expect(listenOf(["--listen", "unix:/tmp/jw/runner.sock"])).toEqual({
      path: "/tmp/jw/runner.sock",
    });
    expect(listenOf(["--listen", "http://127.0.0.1:4999"])).toEqual({ port: 4999 });
    expect(() => listenOf([])).toThrow(/--listen/);
    expect(() => listenOf(["--listen", "unix:runner.sock"])).toThrow(/absolute/);
    expect(() => listenOf(["--listen", "https://runner.example"])).toThrow(/--listen/);
  });

  it("logs prod's model settings and the cap, never the key", () => {
    const line = settingsLine({
      api_key: "mk-secret",
      lane_cap_usd: 0.5,
      tier: "contributor",
      private_model: null,
    });
    expect(JSON.parse(line)).toEqual({
      runner: "dev",
      tier: "contributor",
      models: { contributor: CONTRIBUTOR_MODEL, private: null },
      lane_cap_usd: 0.5,
      bank: "fixture",
    });
    expect(line).not.toContain("mk-secret");
  });

  it("names the bank's origin in its settings line, never the token", () => {
    const muse = {
      api_key: "mk",
      lane_cap_usd: 0.5,
      tier: "contributor",
      private_model: null,
    } as const;
    const line = settingsLine(muse, { base: "https://app.example.test/", token: "bank-secret" });
    expect(JSON.parse(line).bank).toBe("api https://app.example.test");
    expect(line).not.toContain("bank-secret");
  });
});

describe("the dev runner's bank", () => {
  const KEYS = ["JADWIGO_API_URL", "JADWIGO_BANK_READ_TOKEN", "BANK_READ_TOKEN_PARAM"] as const;
  const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  function env(values: Partial<Record<(typeof KEYS)[number], string>>) {
    for (const k of KEYS) {
      const v = values[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
  afterEach(() => {
    for (const k of KEYS) {
      const v = saved[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("draws from the fixture with no URL, and from the API with a URL and a token", async () => {
    env({});
    expect(await devBankConfig()).toBeUndefined();
    env({ JADWIGO_API_URL: "https://app.example.test", JADWIGO_BANK_READ_TOKEN: "t" });
    expect(await devBankConfig()).toEqual({ base: "https://app.example.test", token: "t" });
  });

  it("never reads a deployed SSM parameter for the token", async () => {
    env({
      JADWIGO_API_URL: "https://app.example.test",
      BANK_READ_TOKEN_PARAM: "/jadwigo/prod/bank-read-token",
    });
    await expect(devBankConfig()).rejects.toThrow("JADWIGO_BANK_READ_TOKEN");
  });
});
