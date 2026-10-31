/**
 * The draft watcher (dl-a38n.9, lane web): list JADWIGO_DRAFTS_DIR, watch it, and push a draft and
 * its check file to the page as the `builder:draft` custom HMR event. The directory comes from
 * src/config.ts, never from process.env here (lint/no-raw-process-env.grit).
 *
 * Each page says `builder:hello {draft_id}` on load, on a pick and on every reconnect, and gets its
 * draft back at once: the one it picked, else the newest. Any change in the directory (a draft, its
 * check, a new draft) sends every page its draft again, 100 ms after the last change, so a file
 * written in several chunks is read once. A file that does not parse yet comes as `error`, and the
 * page keeps what it drew last.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch } from "node:fs";
import { join } from "node:path";
import type { ViteDevServer, WebSocketClient } from "vite";
import { draftsDir } from "../src/config.ts";
import {
  BUILDER_DRAFT,
  BUILDER_HELLO,
  type DraftMessage,
  type DraftSummary,
  type HelloMessage,
  titleOf,
} from "../src/playground/lesson/draft.ts";
import { RENDER, readRender, render } from "./render.ts";

const DEBOUNCE_MS = 100;
const CHECK = ".check.json";
/** jw's publish file beside a draft (dl-a38n wave 3); the publish state reads it, never the list. */
const PUBLISH = ".publish.json";
/** WebSocket.CLOSING: a page that went away. */
const CLOSING = 2;

const draftPath = (dir: string, id: string): string => join(dir, `${id}.json`);
const checkPath = (dir: string, id: string): string => join(dir, `${id}${CHECK}`);
const publishPath = (dir: string, id: string): string => join(dir, `${id}${PUBLISH}`);

/** The file's JSON, null when it is not there, or the reason it does not parse. */
function readJson(path: string): { value: unknown } | { error: string } {
  if (!existsSync(path)) return { value: null };
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")) as unknown };
  } catch (e) {
    return { error: `${path.split("/").pop()}: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Every draft in `dir`, newest first: each `<draft_id>.json` but the check files. */
export function listDrafts(dir: string): DraftSummary[] {
  if (!existsSync(dir)) return [];
  return (
    readdirSync(dir)
      // jw writes `.<name>.part` and renames it into place, and keeps its own record under `.jw/`
      // (dl-a38n.16): neither is a draft, and the rename is the change the watcher sees.
      .filter(
        (name) =>
          name.endsWith(".json") &&
          !name.endsWith(CHECK) &&
          !name.endsWith(RENDER) &&
          !name.endsWith(PUBLISH) &&
          !name.startsWith("."),
      )
      .map((name) => {
        const draft_id = name.slice(0, -".json".length);
        const read = readJson(draftPath(dir, draft_id));
        return {
          draft_id,
          title: "value" in read ? titleOf(read.value) : "",
          mtime: statSync(draftPath(dir, draft_id)).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime || a.draft_id.localeCompare(b.draft_id))
  );
}

/** What a page that picked `pick` (null: the newest) is sent. */
export function draftMessage(dir: string, pick: string | null): DraftMessage {
  const drafts = listDrafts(dir);
  const shown = drafts.find((d) => d.draft_id === pick) ?? drafts[0];
  if (shown === undefined)
    return {
      dir,
      drafts,
      draft_id: null,
      draft: null,
      check: null,
      render: null,
      publish: null,
      error: null,
    };
  const draft = readJson(draftPath(dir, shown.draft_id));
  const check = readJson(checkPath(dir, shown.draft_id));
  return {
    dir,
    drafts,
    draft_id: shown.draft_id,
    draft: "value" in draft ? draft.value : null,
    check: "value" in check ? check.value : null,
    render: readRender(dir, shown.draft_id),
    // A publish file that does not parse is no publish: jw rewrites it whole on the next publish.
    publish: (() => {
      const read = readJson(publishPath(dir, shown.draft_id));
      return "value" in read ? read.value : null;
    })(),
    error: "error" in draft ? draft.error : "error" in check ? check.error : null,
  };
}

/** Watch `dir` (made if missing) and call `changed` once things settle; returns the stop. */
function watchDir(dir: string, changed: () => void, wait = DEBOUNCE_MS): () => void {
  mkdirSync(dir, { recursive: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(dir, () => {
    clearTimeout(timer);
    timer = setTimeout(changed, wait);
  });
  return () => {
    clearTimeout(timer);
    watcher.close();
  };
}

/** Called by the builder plugin. The render endpoint is added at once, before Vite's own 404; the
 * watcher starts when the server listens, so a server that never listens needs none. */
export function draftWatch(server: ViteDevServer, dir: string = draftsDir()): void {
  render(server, dir);
  server.httpServer?.once("listening", () => {
    const pages = new Map<WebSocketClient, string | null>();
    const send = (client: WebSocketClient, pick: string | null) =>
      client.send(BUILDER_DRAFT, draftMessage(dir, pick));
    server.ws.on(BUILDER_HELLO, (data: HelloMessage | undefined, client: WebSocketClient) => {
      const pick = data?.draft_id ?? null;
      pages.set(client, pick);
      send(client, pick);
    });
    const stop = watchDir(dir, () => {
      for (const [client, pick] of pages) {
        if (client.socket.readyState >= CLOSING) pages.delete(client);
        else send(client, pick);
      }
    });
    server.httpServer?.once("close", stop);
  });
}
