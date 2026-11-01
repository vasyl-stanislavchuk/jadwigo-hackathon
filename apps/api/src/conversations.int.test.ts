// The conversation routes on PostgresStore, against the database `make migrate` built from the
// DATABASE_URL in .env.local. Each step joins the request's unit (dl-z5ja.67): the routes are given
// a queue that refuses every send, so a step that reached pgmq went through PgmqRunQueue.joining.
// Steps are counted by run id in the queue's tables from a 2nd store, as jadwigo_runner, on its own
// connection, so a count sees only what has committed.
import { randomUUID } from "node:crypto";
import {
  type Conversation,
  type ConversationRuns,
  type ErrorEnvelope,
  LIMITS,
  type Me,
  type RunAccepted,
  type RunId,
} from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it, vi } from "vitest";
import { databaseUrl } from "./config.ts";
import { pathOf, seeded } from "./testing/client.ts";
import { conversationSuite } from "./testing/conversations.suite.ts";
import { bearerOf, signToken } from "./testing/token.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
const store = createPostgresStore(url);
const runner = createPostgresStore(url, { role: "jadwigo_runner" });
afterAll(async () => {
  await store.close();
  await runner.close();
});

/** Committed steps for a run, waiting or taken, read on the runner's own connection. */
async function stepsFor(run: RunId): Promise<number> {
  return runner.unit(async () => {
    const { rows } = await runner.unitSql().query<{ n: number }>(
      `select count(*)::int as n from (
         select message from pgmq.q_agent_step union all select message from pgmq.a_agent_step
       ) steps where message->>'run_id' = $1`,
      [run],
    );
    return rows[0]?.n ?? 0;
  });
}

const refusing = (what: string) => () =>
  Promise.reject(new Error(`${what}: the step joins the unit`));
const joinedOnly = {
  send: refusing("send"),
  read: refusing("read"),
  archive: refusing("archive"),
  deadLetters: refusing("deadLetters"),
};

conversationSuite(
  "PostgresStore",
  () => store,
  () => ({ queue: joinedOnly, stepsFor }),
  {
    units: true,
  },
);

/** A parent with an account and a conversation, on routes whose steps must join the unit. */
async function family() {
  const s = seeded(store, { queue: joinedOnly });
  const headers = bearerOf(signToken({ sub: randomUUID() }));
  const call = <T>(method: string, path: string, body?: unknown) =>
    s.call<T>(method, path, body, headers);
  expect((await call<Me>("POST", pathOf("createAccount", {}), { language: "pl" })).status).toBe(
    201,
  );
  const conversation = (
    await call<Conversation>("POST", pathOf("createConversation", {}), { event_id: randomUUID() })
  ).body;
  const say = (text: string) =>
    call<RunAccepted>("POST", pathOf("postMessage", { id: conversation.id }), {
      event_id: randomUUID(),
      text,
    });
  const runs = async () =>
    (await call<ConversationRuns>("GET", pathOf("listConversationRuns", { id: conversation.id })))
      .body.runs;
  return { say, runs };
}

/** Runs `during` at the end of the next outermost unit, after its work and before its commit. */
function atUnitEnd(during: (result: unknown) => Promise<void>): () => void {
  const unit = store.unit.bind(store);
  let depth = 0;
  store.unit = async <T>(work: () => Promise<T>): Promise<T> =>
    unit(async () => {
      depth += 1;
      try {
        const result = await work();
        if (depth === 1) await during(result);
        return result;
      } finally {
        depth -= 1;
      }
    });
  return () => {
    store.unit = unit;
  };
}

describe("a message's step and its unit on PostgresStore (dl-z5ja.67)", () => {
  it("is not there before the unit commits, and is there once after it", async () => {
    const f = await family();
    let inside: number | undefined;
    const restore = atUnitEnd(async (result) => {
      const run = (result as RunAccepted | undefined)?.run;
      if (run !== undefined) inside = await stepsFor(run.id);
    });
    let sent: Awaited<ReturnType<typeof f.say>>;
    try {
      sent = await f.say("Hi");
    } finally {
      restore();
    }
    expect(sent.status).toBe(201);
    expect(inside).toBe(0);
    expect(await stepsFor(sent.body.run.id)).toBe(1);
  });

  it("is gone with its run when the unit rolls back", async () => {
    const f = await family();
    let run: RunId | undefined;
    const restore = atUnitEnd(async (result) => {
      run = (result as RunAccepted | undefined)?.run.id;
      throw new Error("planted failure before the commit");
    });
    let reply: Awaited<ReturnType<typeof f.say>>;
    try {
      reply = await f.say("Hi");
    } finally {
      restore();
    }
    expect(reply.status).toBe(500);
    expect(run).toBeDefined();
    expect(await stepsFor(run as RunId)).toBe(0);
    expect(await f.runs()).toEqual([]);
  });

  // The pod's advisory lock: new messages of one pod are counted one after the other.
  it("lets exactly one of 5 concurrent new messages at 9 in a minute through", async () => {
    const f = await family();
    for (let n = 1; n < LIMITS.messagesPerMinute; n++)
      expect((await f.say(`Message ${n}`)).status).toBe(201);
    // A barrier on the count: a read waits until 5 have come, or 1 s. Without the lock
    // all 5 read 9 at once; with it only one reads at a time, and the others wait on the lock.
    const read = store.messageUsage.bind(store);
    let arrived = 0;
    const usage = vi.spyOn(store, "messageUsage").mockImplementation(async (...args) => {
      arrived += 1;
      // Only the first 5 reads wait: unlocked, those are the 5 requests' first counts.
      const until = Date.now() + 1000;
      if (arrived <= 5)
        while (arrived < 5 && Date.now() < until) await new Promise((r) => setTimeout(r, 10));
      return read(...args);
    });
    let all: Awaited<ReturnType<typeof f.say>>[];
    try {
      all = await Promise.all([1, 2, 3, 4, 5].map((n) => f.say(`The 10th, try ${n}`)));
    } finally {
      usage.mockRestore();
    }
    expect(all.map((r) => r.status).sort()).toEqual([201, 429, 429, 429, 429]);
    for (const refused of all.filter((r) => r.status === 429))
      expect((refused.body as unknown as ErrorEnvelope).error.type).toBe("MessageLimit");
  });
});
