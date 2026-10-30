import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { JSONRPCNotification } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { askText, createServer, draftsWithAsks, pollOnce } from "./channel.ts";
import { type Ask, appendRow, asksFile, consumedFile, readRows, repliesFile } from "./drafts.ts";
import { channelLoaded, channelNames, type Proc } from "./flag.ts";

const ASK: Ask = {
  ask_ts: "2026-10-30T09:00:00.000Z",
  draft_id: "d-add-to-20",
  step_id: "q2",
  intent: "change",
  text: "Make the boost shorter.\nOne sentence is enough.",
  author: "owner",
};

let dir = "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "jw-builder-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** The server over a fake transport, with a client that records every channel message it hears. */
async function connected() {
  const server = createServer(dir);
  const client = new Client({ name: "test", version: "0" });
  const heard: JSONRPCNotification[] = [];
  client.fallbackNotificationHandler = async (n) => {
    heard.push(n as JSONRPCNotification);
  };
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return { server, client, heard };
}

/** Lets the in-memory transport hand queued messages to the client. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("pollOnce", () => {
  it("sends an ask as one channel message with the draft, step, intent, ask_ts and author", async () => {
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    const { server, heard } = await connected();

    expect(await pollOnce(dir, (n) => server.notification(n))).toBe(1);
    await settle();

    expect(heard).toHaveLength(1);
    expect(heard[0]?.method).toBe("notifications/claude/channel");
    expect(heard[0]?.params?.["meta"]).toEqual({
      draft_id: "d-add-to-20",
      step_id: "q2",
      intent: "change",
      ask_ts: ASK.ask_ts,
      author: "owner",
    });
    const content = String(heard[0]?.params?.["content"]);
    expect(content).toContain("Lesson comment (change) from owner on draft d-add-to-20");
    expect(content).toContain("Step: q2");
    expect(content).toContain("> One sentence is enough.");
    expect(content).toContain("reply tool");
  });

  it("consumes an ask after sending it, so a second run sends nothing", async () => {
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    const sent: string[] = [];
    const notify = async (n: { params: { meta: Record<string, string> } }) => {
      sent.push(n.params.meta["ask_ts"] ?? "");
    };

    expect(await pollOnce(dir, notify)).toBe(1);
    expect(await pollOnce(dir, notify)).toBe(0);

    expect(sent).toEqual([ASK.ask_ts]);
    expect(readRows(consumedFile(dir, ASK.draft_id))).toEqual([
      { ask_ts: ASK.ask_ts, consumed_at: new Date().toISOString() },
    ]);
  });

  it("leaves an ask unconsumed when sending it fails, so the next poll tries again", async () => {
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    await expect(
      pollOnce(dir, async () => {
        throw new Error("closed");
      }),
    ).rejects.toThrow("closed");
    expect(readRows(consumedFile(dir, ASK.draft_id))).toEqual([]);
    expect(await pollOnce(dir, async () => {})).toBe(1);
  });

  it("skips a torn last line and a file whose name is not a draft id", async () => {
    writeFileSync(asksFile(dir, ASK.draft_id), `${JSON.stringify(ASK)}\n{"ask_ts":"2026-10`);
    writeFileSync(join(dir, ".hidden.asks.jsonl"), `${JSON.stringify(ASK)}\n`);
    expect(draftsWithAsks(dir)).toEqual(["d-add-to-20"]);
    expect(await pollOnce(dir, async () => {})).toBe(1);
  });
});

describe("the reply tool", () => {
  it("appends one reply row under the ask it names", async () => {
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    const { client } = await connected();

    const tools = await client.listTools();
    expect(tools.tools.map((t) => t.name)).toEqual(["reply"]);

    const result = await client.callTool({
      name: "reply",
      arguments: {
        draft_id: ASK.draft_id,
        in_reply_to: ASK.ask_ts,
        kind: "progress",
        text: "Shortening the boost on q2.",
      },
    });
    expect(result.isError).toBeFalsy();
    expect(readFileSync(repliesFile(dir, ASK.draft_id), "utf8").trim().split("\n")).toHaveLength(1);
    expect(readRows(repliesFile(dir, ASK.draft_id))).toEqual([
      {
        ts: new Date().toISOString(),
        draft_id: ASK.draft_id,
        in_reply_to: ASK.ask_ts,
        kind: "progress",
        text: "Shortening the boost on q2.",
      },
    ]);
  });

  it("refuses an unknown ask, a bad kind and a draft id that is a path, writing nothing", async () => {
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    const { client } = await connected();
    const call = (args: Record<string, string>) =>
      client.callTool({
        name: "reply",
        arguments: { draft_id: ASK.draft_id, in_reply_to: ASK.ask_ts, text: "ok", ...args },
      });

    expect((await call({ in_reply_to: "2026-01-01T00:00:00.000Z" })).isError).toBe(true);
    expect((await call({ kind: "finished" })).isError).toBe(true);
    expect((await call({ draft_id: "../escape" })).isError).toBe(true);
    expect(readRows(repliesFile(dir, ASK.draft_id))).toEqual([]);
  });
});

describe("askText", () => {
  it("frames a question so the session answers rather than changes", () => {
    const text = askText({ ...ASK, intent: "question", text: "Why this set?" });
    expect(text.split("\n").slice(0, 3)).toEqual([
      "Lesson comment (question) from owner on draft d-add-to-20",
      "Step: q2",
      "> Why this set?",
    ]);
    expect(text).toContain("change nothing unless they ask");
  });
});

describe("the channel flag", () => {
  it("reads both spellings and comma lists", () => {
    expect(
      channelNames("claude --dangerously-load-development-channels=server:a,server:b --resume"),
    ).toEqual(new Set(["server:a", "server:b"]));
    expect(channelNames("claude --dangerously-load-development-channels server:a x")).toEqual(
      new Set(["server:a", "x"]),
    );
  });

  it("finds the claude above a wrapper and says whether it loaded jadwigo-builder", () => {
    const tree: Record<number, Proc> = {
      40: { ppid: 30, command: "bun /repo/tools/builder/channel.ts" },
      30: {
        ppid: 1,
        command:
          "/usr/local/bin/claude --session-id u --dangerously-load-development-channels=server:jadwigo-builder",
      },
      20: { ppid: 1, command: "claude --resume" },
    };
    const ps = (pid: number) => tree[pid] ?? null;
    expect(channelLoaded(40, ps)).toBe(true);
    expect(channelLoaded(20, ps)).toBe(false);
    expect(channelLoaded(99, ps)).toBe(null);
  });
});
