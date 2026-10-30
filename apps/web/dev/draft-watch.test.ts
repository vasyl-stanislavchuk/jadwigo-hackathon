import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LESSON_FILES } from "@jadwigo/testing";
import type { ViteDevServer } from "vite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { draftsDir } from "../src/config.ts";
import { BUILDER_DRAFT, BUILDER_HELLO, type DraftMessage } from "../src/playground/lesson/draft.ts";
import { draftMessage, draftWatch, listDrafts } from "./draft-watch.ts";

const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "jw-drafts-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

/** Write `name` into the drafts dir, changed `at` seconds since the epoch. */
function put(name: string, value: unknown, at?: number): void {
  const path = join(dir, name);
  writeFileSync(path, typeof value === "string" ? value : JSON.stringify(value));
  if (at !== undefined) utimesSync(path, at, at);
}

describe("draftsDir", () => {
  it("is JADWIGO_DRAFTS_DIR, else jw's default under the home directory", () => {
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: "/srv/drafts", HOME: "/home/x" })).toBe("/srv/drafts");
    expect(draftsDir({ JADWIGO_DRAFTS_DIR: "~/d", HOME: "/home/x" })).toBe("/home/x/d");
    expect(draftsDir({ HOME: "/home/x" })).toBe("/home/x/.local/state/jadwigo/drafts");
  });
});

describe("listDrafts and draftMessage", () => {
  it("lists the drafts newest first with their titles, and not the check files", () => {
    put("old.json", { title: "Old", language: "en" }, 1_000);
    put("new.json", equalGroups, 2_000);
    put("new.check.json", { ok: true, findings: [] }, 3_000);
    put("new.asks.jsonl", "", 3_000);
    expect(listDrafts(dir)).toEqual([
      { draft_id: "new", title: "Równe grupy", mtime: 2_000_000 },
      { draft_id: "old", title: "Old", mtime: 1_000_000 },
    ]);
  });

  it("sends the newest draft with its check, or the one the page picked", () => {
    put("old.json", { title: "Old", language: "en" }, 1_000);
    put("new.json", equalGroups, 2_000);
    put("new.check.json", { ok: true, findings: [] });
    expect(draftMessage(dir, null)).toMatchObject({
      dir,
      draft_id: "new",
      draft: equalGroups,
      check: { ok: true, findings: [] },
      error: null,
    });
    expect(draftMessage(dir, "old")).toMatchObject({ draft_id: "old", check: null, error: null });
    expect(draftMessage(dir, "gone").draft_id).toBe("new");
  });

  it("names a half-written file instead of throwing, and an empty dir sends no draft", () => {
    expect(draftMessage(dir, null)).toEqual({
      dir,
      drafts: [],
      draft_id: null,
      draft: null,
      check: null,
      error: null,
    });
    put("x.json", '{"title": "Hal');
    const message = draftMessage(dir, null);
    expect(message.draft).toBeNull();
    expect(message.error).toMatch(/^x\.json: /);
  });
});

describe("draftWatch", () => {
  /** A dev server with an HMR channel and an http server that has not listened yet. */
  function fakeServer() {
    const httpServer = new EventEmitter();
    const hello: { listener?: (data: unknown, client: unknown) => void } = {};
    const ws = {
      on(event: string, listener: (data: unknown, client: unknown) => void) {
        if (event === BUILDER_HELLO) hello.listener = listener;
      },
    };
    const sent: DraftMessage[] = [];
    const page = {
      socket: { readyState: 1 },
      send: (event: string, payload: DraftMessage) => {
        if (event === BUILDER_DRAFT) sent.push(payload);
      },
    };
    const server = { httpServer, ws } as unknown as ViteDevServer;
    return { server, httpServer, hello, page, sent };
  }

  it("does nothing until the server listens", () => {
    const { server, hello } = fakeServer();
    draftWatch(server, dir);
    expect(hello.listener).toBeUndefined();
  });

  it("answers a hello at once, and sends the draft again after a change", async () => {
    const { server, httpServer, hello, page, sent } = fakeServer();
    draftWatch(server, dir);
    httpServer.emit("listening");
    try {
      hello.listener?.({ draft_id: null }, page);
      expect(sent).toHaveLength(1);
      expect(sent[0]?.draft_id).toBeNull();

      // The OS may start delivering events a moment after the watch begins, so the draft is
      // written again until the page hears of it.
      await vi.waitFor(
        () => {
          put("x.json", equalGroups);
          expect(sent.at(-1)?.draft_id).toBe("x");
        },
        { timeout: 10_000, interval: 250 },
      );
      expect(sent.at(-1)?.draft).toEqual(equalGroups);
    } finally {
      httpServer.emit("close");
    }
  });
});
