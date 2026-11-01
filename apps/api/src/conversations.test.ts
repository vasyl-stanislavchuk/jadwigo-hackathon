// The conversation routes on InMemoryStore, with a queue that keeps what was sent.
import { randomUUID } from "node:crypto";
import { type Conversation, type Me, ROUTES, type RunStepInput } from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { pathOf, seeded } from "./testing/client.ts";
import { conversationSuite } from "./testing/conversations.suite.ts";
import { bearerOf, signToken } from "./testing/token.ts";

conversationSuite(
  "InMemoryStore",
  () => new InMemoryStore(),
  () => {
    const queue = new InMemoryRunQueue(() => new Date());
    const sent: RunStepInput[] = [];
    return {
      queue: {
        send: (message, delay_s) => {
          sent.push(message);
          return queue.send(message, delay_s);
        },
        read: (vt_s, qty) => queue.read(vt_s, qty),
        archive: (msg_id) => queue.archive(msg_id),
        deadLetters: () => queue.deadLetters(),
      },
      stepsFor: async (run) => sent.filter((m) => m.run_id === run).length,
    };
  },
);

// The lead's rule on dl-z5ja.21: a step is sent only after its unit has committed, and a unit that
// fails sends nothing. InMemoryStore's unit is wrapped to say when it is open and to fail its end.
describe("a message's step and its unit", () => {
  async function setUp() {
    const store = new InMemoryStore();
    const state = { open: 0, failCommit: false };
    const unit = store.unit.bind(store);
    store.unit = async <T>(work: () => Promise<T>): Promise<T> =>
      unit(async () => {
        state.open += 1;
        try {
          const result = await work();
          if (state.failCommit && state.open === 1) throw new Error("planted commit failure");
          return result;
        } finally {
          state.open -= 1;
        }
      });
    const sends: { run_id: string; inUnit: boolean }[] = [];
    const queue = new InMemoryRunQueue(() => new Date());
    const s = seeded(store, {
      queue: {
        send: (message, delay_s) => {
          sends.push({ run_id: message.run_id, inUnit: state.open > 0 });
          return queue.send(message, delay_s);
        },
        read: (vt_s, qty) => queue.read(vt_s, qty),
        archive: (msg_id) => queue.archive(msg_id),
        deadLetters: () => queue.deadLetters(),
      },
    });
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    expect(
      (await s.call<Me>("POST", pathOf("createAccount", {}), { language: "pl" }, headers)).status,
    ).toBe(201);
    const made = await s.call<Conversation>(
      "POST",
      pathOf("createConversation", {}),
      { event_id: randomUUID() },
      headers,
    );
    const say = () =>
      s.call(
        ROUTES.postMessage.method,
        pathOf("postMessage", { id: made.body.id }),
        { event_id: randomUUID(), text: "Hi" },
        headers,
      );
    return { state, sends, say };
  }

  it("sends the step after the unit has ended, never inside it", async () => {
    const { sends, say } = await setUp();
    expect((await say()).status).toBe(201);
    expect(sends).toHaveLength(1);
    expect(sends[0]?.inUnit).toBe(false);
  });

  it("sends nothing when the unit fails at its end", async () => {
    const { state, sends, say } = await setUp();
    state.failCommit = true;
    expect((await say()).status).toBe(500);
    expect(sends).toEqual([]);
  });
});
