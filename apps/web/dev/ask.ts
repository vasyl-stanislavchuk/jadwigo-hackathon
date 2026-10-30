/**
 * The ask endpoint (dl-a38n.13, lane bridge): `POST /@builder/ask` takes a comment pinned to a step
 * and appends it to JADWIGO_DRAFTS_DIR/<draft_id>.asks.jsonl, where the jadwigo-builder channel
 * (tools/builder/channel.ts) picks it up for the session. `GET /@builder/asks` answers every ask,
 * which ones the channel consumed, every reply and whether the channel is live; the same comes over
 * HMR as `builder:asks` whenever one of those files changes.
 *
 * Only this machine is answered: a loopback socket, a localhost Host (a DNS-rebound page cannot set
 * it), a loopback Origin when there is one, and `X-Builder: 1` on a write, which a cross-site form
 * cannot send. A body over 64 KB and more than 1 ask per 2 seconds are refused. md's annotate gate
 * (templates/vite_config_md.mts:728-763) is the model.
 */
import { existsSync, readdirSync, readFileSync, statSync, watch } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { ViteDevServer } from "vite";
import {
  type Ask,
  appendRow,
  asksFile,
  consumedFile,
  type Heartbeat,
  heartbeatFile,
  isDraftId,
  type Reply,
  readAsks,
  readRows,
  repliesFile,
} from "../../../tools/builder/drafts.ts";
import { draftsDir } from "../src/config.ts";

const ASK_PATH = "/@builder/ask";
const ASKS_PATH = "/@builder/asks";
const ASKS_EVENT = "builder:asks";
const WRITE_HEADER = "x-builder";
const BODY_MAX = 64 * 1024;
const ASK_EVERY_MS = 2_000;
// The channel rewrites its heartbeat at least every 5 seconds; 3 missed beats is a channel gone.
const STALE_MS = 15_000;
// No file changes when a heartbeat goes stale, so the state is looked at again on this beat.
const RECHECK_MS = 5_000;
const INTENTS = new Set(["change", "question", "note"]);
// The page sends no name: the one person at this machine's builder is its owner.
const AUTHOR = "owner";

/** live: a session hears comments. not_loaded: make builder's session lost the flag. gone: none. */
type Channel = "live" | "not_loaded" | "gone";

/** What the page reads, over GET and HMR alike (src/playground/lesson/comments/threads.ts). */
type AsksPayload = {
  channel: Channel;
  newest_draft: string | null;
  asks: Ask[];
  consumed: string[];
  replies: Reply[];
};

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function loopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  return address === "::1" || address.startsWith("127.") || address.startsWith("::ffff:127.");
}

function loopbackHost(host: string | undefined): boolean {
  if (!host) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}

// Absent on a same-origin GET; otherwise it must be this machine's page.
function loopbackOrigin(origin: string | undefined): boolean {
  if (origin === undefined) return true;
  try {
    const url = new URL(origin);
    return (
      (url.protocol === "http:" || url.protocol === "https:") && LOOPBACK_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}

/** The request as the gate reads it, so a test needs no socket. */
type GateRequest = {
  method: string | undefined;
  remoteAddress: string | undefined;
  headers: Record<string, string | string[] | undefined>;
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** null when the request may go on, else the status and the reason. */
export function admit(req: GateRequest): { status: number; error: string } | null {
  if (
    !loopbackAddress(req.remoteAddress) ||
    !loopbackHost(one(req.headers["host"])) ||
    !loopbackOrigin(one(req.headers["origin"]))
  ) {
    return { status: 403, error: "the lesson builder only answers this machine" };
  }
  if (req.method !== "GET" && one(req.headers[WRITE_HEADER]) !== "1") {
    return { status: 400, error: "missing the X-Builder: 1 header" };
  }
  return null;
}

/** The ask the page posted, stamped and signed, or why it was refused. */
export function parseAsk(body: string, now: Date): Ask | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return { error: "the body is not JSON" };
  }
  if (!raw || typeof raw !== "object") return { error: "the body is not an object" };
  const fields = raw as Record<string, unknown>;
  const draftId = typeof fields["draft_id"] === "string" ? fields["draft_id"] : "";
  const stepId = typeof fields["step_id"] === "string" ? fields["step_id"] : "";
  const intent = typeof fields["intent"] === "string" ? fields["intent"] : "";
  const text = typeof fields["text"] === "string" ? fields["text"].trim() : "";
  if (!isDraftId(draftId)) return { error: "draft_id is not a draft id" };
  if (stepId.length > 64 || /[\s"]/.test(stepId)) return { error: "step_id is not a step id" };
  if (!INTENTS.has(intent)) return { error: "intent is change, question or note" };
  if (!text) return { error: "the comment is empty" };
  return {
    ask_ts: now.toISOString(),
    draft_id: draftId,
    step_id: stepId,
    intent: intent as Ask["intent"],
    text,
    author: AUTHOR,
  };
}

/** Whether a session hears comments, from the channel's heartbeat. */
export function channelState(beat: Heartbeat | null, now: Date): Channel {
  if (!beat) return "gone";
  const at = Date.parse(beat.at);
  if (!Number.isFinite(at) || now.getTime() - at > STALE_MS) return "gone";
  return beat.loaded === false ? "not_loaded" : "live";
}

function readHeartbeat(dir: string): Heartbeat | null {
  try {
    const beat: unknown = JSON.parse(readFileSync(heartbeatFile(dir), "utf8"));
    return beat && typeof beat === "object" ? (beat as Heartbeat) : null;
  } catch {
    return null;
  }
}

// <draft_id>.json; a check, heartbeat or session file has a dot or a reserved name before .json.
const DRAFT_FILE = /^([^.]+)\.json$/;
const NOT_DRAFTS = new Set(["session"]);

/** The draft jw wrote last, by the file's modification time. */
function newestDraft(dir: string): string | null {
  let best: { id: string; at: number } | null = null;
  for (const name of readdirSync(dir)) {
    const id = DRAFT_FILE.exec(name)?.[1];
    if (!id || NOT_DRAFTS.has(id) || !isDraftId(id)) continue;
    const at = statSync(join(dir, name)).mtimeMs;
    if (!best || at > best.at) best = { id, at };
  }
  return best?.id ?? null;
}

const ASKS = ".asks.jsonl";

/** Everything the page shows about comments, read fresh from the directory. */
export function snapshot(dir: string, now: Date): AsksPayload {
  const payload: AsksPayload = {
    channel: channelState(existsSync(dir) ? readHeartbeat(dir) : null, now),
    newest_draft: null,
    asks: [],
    consumed: [],
    replies: [],
  };
  if (!existsSync(dir)) return payload;
  payload.newest_draft = newestDraft(dir);
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(ASKS)) continue;
    const draftId = name.slice(0, -ASKS.length);
    if (!isDraftId(draftId)) continue;
    payload.asks.push(...readAsks(dir, draftId));
    for (const row of readRows(consumedFile(dir, draftId))) {
      if (typeof row["ask_ts"] === "string") payload.consumed.push(row["ask_ts"]);
    }
    for (const row of readRows(repliesFile(dir, draftId))) {
      if (typeof row["in_reply_to"] === "string" && typeof row["text"] === "string") {
        payload.replies.push(row as Reply);
      }
    }
  }
  return payload;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

// Over the cap, the rest is drained rather than the socket cut, so the page reads the 413.
function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= BODY_MAX) chunks.push(chunk);
    });
    req.on("end", () => done(size > BODY_MAX ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => done(null));
  });
}

function gateOf(req: IncomingMessage): GateRequest {
  return { method: req.method, remoteAddress: req.socket.remoteAddress, headers: req.headers };
}

export function ask(server: ViteDevServer): void {
  const dir = draftsDir();
  let lastAsk = 0;
  let lastSent = "";

  const push = () => {
    const payload = snapshot(dir, new Date());
    const text = JSON.stringify(payload);
    if (text === lastSent) return;
    lastSent = text;
    server.ws.send({ type: "custom", event: ASKS_EVENT, data: payload });
  };

  server.middlewares.use(ASKS_PATH, (req, res) => {
    const refused = admit({ ...gateOf(req), method: "GET" });
    if (refused) return sendJson(res, refused.status, { error: refused.error });
    sendJson(res, 200, snapshot(dir, new Date()));
  });

  server.middlewares.use(ASK_PATH, async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "POST a comment here" });
    const refused = admit(gateOf(req));
    if (refused) return sendJson(res, refused.status, { error: refused.error });
    const now = Date.now();
    if (now - lastAsk < ASK_EVERY_MS) {
      return sendJson(res, 429, {
        error: "one comment every 2 seconds; send it again in a moment",
      });
    }
    const body = await readBody(req);
    if (body === null) return sendJson(res, 413, { error: "a comment is at most 64 KB" });
    const parsed = parseAsk(body, new Date(now));
    if ("error" in parsed) return sendJson(res, 400, parsed);
    lastAsk = now;
    appendRow(asksFile(dir, parsed.draft_id), parsed);
    sendJson(res, 200, { ask: parsed });
    push();
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const soon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(push, 50);
  };
  try {
    if (existsSync(dir)) watch(dir, soon);
  } catch (error) {
    server.config.logger.warn(`[builder] cannot watch ${dir}, rechecking every 5 s: ${error}`);
  }
  const recheck = setInterval(push, RECHECK_MS);
  recheck.unref();
  server.httpServer?.on("close", () => clearInterval(recheck));
}
