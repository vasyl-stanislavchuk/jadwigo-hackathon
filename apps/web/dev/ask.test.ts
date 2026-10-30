import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendRow,
  asksFile,
  consumedFile,
  heartbeatFile,
  repliesFile,
} from "../../../tools/builder/drafts.ts";
import { admit, channelState, parseAsk, snapshot } from "./ask.ts";

const LOCAL = {
  method: "POST",
  remoteAddress: "127.0.0.1",
  headers: { host: "localhost:5173", origin: "http://localhost:5173", "x-builder": "1" },
};

describe("admit", () => {
  it("lets this machine's page write", () => {
    expect(admit(LOCAL)).toBeNull();
    expect(admit({ ...LOCAL, remoteAddress: "::ffff:127.0.0.1" })).toBeNull();
  });

  it("refuses a page from another origin", () => {
    const refused = admit({
      ...LOCAL,
      headers: { ...LOCAL.headers, origin: "https://evil.example" },
    });
    expect(refused?.status).toBe(403);
  });

  it("refuses another machine and a DNS-rebound Host", () => {
    expect(admit({ ...LOCAL, remoteAddress: "192.168.1.20" })?.status).toBe(403);
    expect(
      admit({ ...LOCAL, headers: { ...LOCAL.headers, host: "rebound.example:5173" } })?.status,
    ).toBe(403);
  });

  it("refuses a write without X-Builder: 1, and lets a read go without it", () => {
    const { "x-builder": _, ...plain } = LOCAL.headers;
    expect(admit({ ...LOCAL, headers: plain })?.status).toBe(400);
    expect(admit({ ...LOCAL, method: "GET", headers: plain })).toBeNull();
  });
});

describe("parseAsk", () => {
  it("stamps the ask and signs it as the owner", () => {
    const body = JSON.stringify({
      draft_id: "d1",
      step_id: "q2",
      intent: "question",
      text: " Why? ",
    });
    expect(parseAsk(body, new Date())).toEqual({
      ask_ts: new Date().toISOString(),
      draft_id: "d1",
      step_id: "q2",
      intent: "question",
      text: "Why?",
      author: "owner",
    });
  });

  it("refuses a path for a draft id, an unknown intent and an empty comment", () => {
    const base = { draft_id: "d1", step_id: "q2", intent: "change", text: "x" };
    const parse = (extra: object) => parseAsk(JSON.stringify({ ...base, ...extra }), new Date());
    expect(parse({ draft_id: "../d1" })).toHaveProperty("error");
    expect(parse({ intent: "delete" })).toHaveProperty("error");
    expect(parse({ text: "  " })).toHaveProperty("error");
    expect(parseAsk("not json", new Date())).toHaveProperty("error");
  });
});

describe("channelState", () => {
  const at = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
  const beat = { pid: 1, session_id: "s" };

  it("is live on a fresh heartbeat, gone on a stale one or none", () => {
    expect(channelState({ ...beat, at: at(4_000), loaded: true }, new Date())).toBe("live");
    expect(channelState({ ...beat, at: at(4_000), loaded: null }, new Date())).toBe("live");
    expect(channelState({ ...beat, at: at(20_000), loaded: true }, new Date())).toBe("gone");
    expect(channelState(null, new Date())).toBe("gone");
  });

  it("is not_loaded when the session lost the channel flag", () => {
    expect(channelState({ ...beat, at: at(1_000), loaded: false }, new Date())).toBe("not_loaded");
  });
});

describe("snapshot", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "jw-ask-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("reads asks, consumed and replies across drafts, and names the newest draft", () => {
    const ask = {
      ask_ts: "2026-10-30T09:00:00.000Z",
      draft_id: "d2",
      step_id: "q1",
      intent: "change",
      text: "Shorter, please.",
      author: "owner",
    };
    appendRow(asksFile(dir, "d2"), ask);
    appendRow(consumedFile(dir, "d2"), { ask_ts: ask.ask_ts, consumed_at: ask.ask_ts });
    appendRow(repliesFile(dir, "d2"), {
      ts: "2026-10-30T09:00:05.000Z",
      draft_id: "d2",
      in_reply_to: ask.ask_ts,
      kind: "done",
      text: "Shortened.",
    });
    writeFileSync(join(dir, "d1.json"), "{}");
    writeFileSync(join(dir, "d2.json"), "{}");
    writeFileSync(join(dir, "d2.check.json"), "{}");
    writeFileSync(join(dir, "session.json"), "{}");
    utimesSync(join(dir, "d1.json"), 1, 1);
    writeFileSync(
      heartbeatFile(dir),
      JSON.stringify({ at: new Date().toISOString(), pid: 1, session_id: "s", loaded: true }),
    );

    const payload = snapshot(dir, new Date());
    expect(payload.channel).toBe("live");
    expect(payload.newest_draft).toBe("d2");
    expect(payload.asks).toEqual([ask]);
    expect(payload.consumed).toEqual([ask.ask_ts]);
    expect(payload.replies.map((reply) => reply.text)).toEqual(["Shortened."]);
  });

  it("answers an empty page when the directory does not exist yet", () => {
    expect(snapshot(join(dir, "missing"), new Date())).toEqual({
      channel: "gone",
      newest_draft: null,
      asks: [],
      consumed: [],
      replies: [],
    });
  });
});
