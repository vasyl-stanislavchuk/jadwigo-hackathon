// What a request costs in database round trips on PostgresStore (dl-e8ov.2.32.40). Every statement
// is one round trip; from a laptop to jadwigo-dev through the pooler one is about 37 ms.
import type { AttemptAnswerResult, AttemptSnapshot } from "@jadwigo/contracts";
import { createPostgresStore } from "@jadwigo/store";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { pathOf, seeded, start, tryAt } from "./testing/client.ts";

const url = databaseUrl();
if (url === undefined) throw new Error("DATABASE_URL is unset: see .env.example");
let trips = 0;
const store = createPostgresStore(url, {
  onQuery: (text) => {
    trips += 1;
    if (process.env["SHOW_SQL"])
      process.stdout.write(`${text.replace(/\s+/g, " ").slice(0, 110)}\n`);
  },
});
afterAll(() => store.close());

async function counted<T>(request: () => Promise<T>): Promise<{ reply: T; trips: number }> {
  const before = trips;
  const reply = await request();
  return { reply, trips: trips - before };
}

describe("round trips per request on PostgresStore", () => {
  it("is one transaction each, the published version read once per process", async () => {
    const s = seeded(store);
    const assignment = await s.assign("equalGroups");
    const started = await counted(() => start(s, assignment));
    const { id } = started.reply;
    // A 2nd read, with the version already read once in this process.
    await s.call("GET", pathOf("getAttempt", { id }));
    const read = await counted(() => s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id })));
    const first = read.reply.body.questions[0];
    if (first === undefined) throw new Error("no first question");
    const right = await counted(() => tryAt(s, id, first, true));
    expect((right.reply.body as AttemptAnswerResult).next).not.toBeNull();
    const refused = await counted(() => s.call("POST", pathOf("answer", { id }), {}));
    expect(refused.reply.status).toBe(400);
    const counts = {
      start: started.trips,
      getAttempt: read.trips,
      rightAnswer: right.trips,
      refusedAnswer: refused.trips,
    };
    // Before dl-e8ov.2.32.40: start 28, getAttempt 30, rightAnswer 65, refusedAnswer 16.
    expect(counts).toEqual({ start: 13, getAttempt: 6, rightAnswer: 14, refusedAnswer: 6 });
  });
});
