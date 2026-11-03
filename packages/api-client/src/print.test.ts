import { ConversationId, type PrintStatus } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { createClient, waitForPrint } from "./client.ts";

const CONVERSATION = ConversationId.parse("cnv_0ectzj2evqb95a3v1v6wewjzy3");
const ID = "a".repeat(64);
const pending: PrintStatus = { status: "pending", print_id: ID };
const ready: PrintStatus = {
  status: "ready",
  print_id: ID,
  url: "https://bucket.test/p.pdf",
  expires_at: "2026-11-03T12:05:00.000Z",
};

/** A client whose server answers each request with the next reply, and records what was asked. */
function scripted(replies: PrintStatus[]) {
  const asked: string[] = [];
  const client = createClient({
    base: "https://api.test",
    token: async () => "t",
    fetch: async (url, init) => {
      asked.push(`${init?.method} ${String(url)}`);
      return new Response(JSON.stringify(replies.shift()), { status: 200 });
    },
  });
  return { client, asked };
}

describe("printing a lesson (dl-1eieq.8.4)", () => {
  it("starts the print, asks about it once a second, and answers it ready", async () => {
    const { client, asked } = scripted([pending, pending, ready]);
    const waits: number[] = [];
    const status = await waitForPrint(client, CONVERSATION, { revision: 2 }, async (ms) => {
      waits.push(ms);
    });
    expect(status).toEqual(ready);
    expect(asked).toEqual([
      `POST https://api.test/api/v1/conversations/${CONVERSATION}/prints`,
      `GET https://api.test/api/v1/prints/${ID}`,
      `GET https://api.test/api/v1/prints/${ID}`,
    ]);
    expect(waits).toEqual([1000, 1000]);
  });

  it("answers a print made before at once", async () => {
    const { client, asked } = scripted([ready]);
    expect(await waitForPrint(client, CONVERSATION, {}, async () => {})).toEqual(ready);
    expect(asked).toHaveLength(1);
  });

  it("gives up after 45 asks and answers the last pending", async () => {
    const { client, asked } = scripted(Array.from({ length: 50 }, () => pending));
    expect(await waitForPrint(client, CONVERSATION, {}, async () => {})).toEqual(pending);
    expect(asked).toHaveLength(46);
  });
});
