import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { JSONRPCNotification } from "@modelcontextprotocol/sdk/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askText,
  createServer,
  draftsWithAsks,
  pollOnce,
  reply,
  sessionTranscript,
} from "./channel.ts";
import {
  type Ask,
  appendRow,
  asksFile,
  consumedFile,
  readRows,
  repliesFile,
  sessionFile,
} from "./drafts.ts";
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

describe("the work frozen on an answer", () => {
  const row = (iso: string, id: string, name: string, input: object) =>
    JSON.stringify({
      type: "assistant",
      timestamp: iso,
      message: { content: [{ type: "tool_use", id, name, input }] },
    });

  it("carries what the session did since it took the ask, written when it answers", async () => {
    vi.setSystemTime(new Date("2026-10-30T09:00:01.000Z"));
    appendRow(asksFile(dir, ASK.draft_id), ASK);
    await pollOnce(dir, async () => {});
    const transcript = join(dir, "s1.jsonl");
    writeFileSync(
      transcript,
      [
        row("2026-10-30T08:59:00.000Z", "a", "Read", { file_path: "/x/before.ts" }),
        row("2026-10-30T09:00:02.000Z", "b", "Read", { file_path: "/x/lesson.json" }),
        row("2026-10-30T09:00:03.000Z", "c", "mcp__jadwigo__lesson_check", {}),
      ].join("\n"),
    );
    vi.setSystemTime(new Date("2026-10-30T09:00:09.000Z"));

    const progress = reply(
      dir,
      { draft_id: ASK.draft_id, in_reply_to: ASK.ask_ts, kind: "progress", text: "On q2." },
      () => transcript,
    );
    const done = reply(
      dir,
      { draft_id: ASK.draft_id, in_reply_to: ASK.ask_ts, text: "q2 is shorter." },
      () => transcript,
    );

    expect("row" in progress && progress.row.work).toBeUndefined();
    expect("row" in done && done.row.work).toEqual({
      steps: [
        { text: "Reading lesson.json", ok: true },
        { text: "Check: running", ok: true },
      ],
      calls: 2,
      failed: 0,
      read: ["lesson.json"],
      changed: [],
    });
    expect(readRows(repliesFile(dir, ASK.draft_id)).at(-1)?.["work"]).toBeDefined();
  });

  it("reads the transcript only of the session make builder named", () => {
    mkdirSync(dirname(sessionFile(dir)), { recursive: true });
    writeFileSync(
      sessionFile(dir),
      JSON.stringify({ session_id: "s1", started_at: "", cwd: "/x", transcript: "/t/s1.jsonl" }),
    );
    expect(sessionTranscript(dir, "s1")).toBe("/t/s1.jsonl");
    expect(sessionTranscript(dir, "s2")).toBeNull();
    expect(sessionTranscript(dir, "")).toBeNull();
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
