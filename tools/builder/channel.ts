// `jadwigo-builder` (dl-a38n.2): a Claude Code channel that carries a comment pinned to a lesson step
// from the builder page into the running session, and the session's answer back to the page.
// The page appends an ask to JADWIGO_DRAFTS_DIR/<draft_id>.asks.jsonl. Every 5 seconds, or at once
// when that directory changes, this server sends each ask nobody has consumed as a
// notifications/claude/channel message, then marks it in <draft_id>.consumed.jsonl. The one tool,
// reply, appends the answer to <draft_id>.replies.jsonl. It reads and writes files only.
// The mechanism is md's md-inbox channel (medallion-dev-cli integrations/md-inbox), ported.
// Channels are a research preview: the session must start with
// --dangerously-load-development-channels=server:jadwigo-builder. README.md here is the install.
// Run: bun tools/builder/channel.ts (Claude Code starts it; it speaks MCP on stdio)
import { existsSync, mkdirSync, readdirSync, watch, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Request,
  type Result,
} from "@modelcontextprotocol/sdk/types.js";
import { builderSession, draftsDir } from "./config.ts";
import {
  ASKS_SUFFIX,
  type Ask,
  appendRow,
  consumedFile,
  consumedTs,
  type Heartbeat,
  heartbeatFile,
  type Intent,
  isDraftId,
  REPLY_KINDS,
  type Reply,
  type ReplyKind,
  readAsks,
  repliesFile,
} from "./drafts.ts";
import { CHANNELS_FLAG, channelLoaded, psProc, SERVER_NAME } from "./flag.ts";

const CHANNEL_METHOD = "notifications/claude/channel";
const POLL_MS = 5_000;
// The page's append wakes the loop, so an ask reaches the turn in about a second, not up to five.
const WAKE_DEBOUNCE_MS = 50;

type ChannelNotification = {
  method: typeof CHANNEL_METHOD;
  params: { content: string; meta: Record<string, string> };
};

type Notify = (notification: ChannelNotification) => Promise<void>;

// What each intent asks of the session. A comment never edits the lesson file: every change goes
// through the jadwigo MCP, so the draft keeps one writer and the page shows who changed what.
const INTENT_LINES: Record<Intent, string> = {
  change:
    "They want this step changed. Make the change through the jadwigo MCP (lesson_check with the " +
    "edited draft, fixing what it lists), never by editing the draft file, then reply.",
  question:
    "They are asking, not asking for a change. Answer from the draft, the bank and this repo's " +
    "docs, and change nothing unless they ask.",
  note: "They are telling you something to keep in mind. Change something only if it asks for it.",
};

const REPLY_GUIDE =
  "Answer with the reply tool, draft_id and in_reply_to set to this ask: kind=progress in a few " +
  "words when you start, kind=done when it lands or is answered, kind=question when you need them " +
  "to decide. An answer that ends by asking them to choose is a question, not done: the page shows " +
  "done as finished. Open with the news in one sentence, not with 'On it:' or 'Done:'; the page " +
  "labels each kind. Text a child reads stays short and kind.";

/** The turn's text for one ask: who, which step, their words quoted, then what to do and how to answer. */
export function askText(ask: Ask): string {
  const who = ask.author || "the owner";
  return [
    `Lesson comment (${ask.intent}) from ${who} on draft ${ask.draft_id}`,
    `Step: ${ask.step_id || "the whole lesson"}`,
    ...ask.text.split("\n").map((line) => `> ${line}`),
    "",
    INTENT_LINES[ask.intent],
    REPLY_GUIDE,
  ].join("\n");
}

/** Meta keys are identifiers, so the tag reads `draft_id="…" step_id="q2" intent="change" …`. */
export function metaFor(ask: Ask): Record<string, string> {
  return {
    draft_id: ask.draft_id,
    step_id: ask.step_id,
    intent: ask.intent,
    ask_ts: ask.ask_ts,
    author: ask.author,
  };
}

/** Every draft with an asks file, by its id. */
export function draftsWithAsks(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(ASKS_SUFFIX))
    .map((name) => name.slice(0, -ASKS_SUFFIX.length))
    .filter(isDraftId)
    .sort();
}

/**
 * One poll: send every ask nobody has consumed, oldest first, and consume each after it is sent.
 * An ask whose send throws stays unconsumed, so the next poll sends it again. Returns how many went.
 */
export async function pollOnce(dir: string, notify: Notify): Promise<number> {
  let sent = 0;
  for (const draftId of draftsWithAsks(dir)) {
    const consumed = consumedTs(dir, draftId);
    for (const ask of readAsks(dir, draftId)) {
      if (consumed.has(ask.ask_ts)) continue;
      await notify({
        method: CHANNEL_METHOD,
        params: { content: askText(ask), meta: metaFor(ask) },
      });
      appendRow(consumedFile(dir, draftId), {
        ask_ts: ask.ask_ts,
        consumed_at: new Date().toISOString(),
      });
      consumed.add(ask.ask_ts);
      sent += 1;
    }
  }
  return sent;
}

export type ReplyArgs = {
  draft_id?: unknown;
  in_reply_to?: unknown;
  kind?: unknown;
  text?: unknown;
};

/**
 * The reply tool: one row on the draft's replies file, or the reason it was refused. A reply names
 * an ask the page sent, so an answer always sits under the comment it answers.
 */
export function reply(dir: string, args: ReplyArgs): { ok: true; row: Reply } | { error: string } {
  const draftId = typeof args.draft_id === "string" ? args.draft_id.trim() : "";
  const inReplyTo = typeof args.in_reply_to === "string" ? args.in_reply_to.trim() : "";
  const text = typeof args.text === "string" ? args.text : "";
  const kind = args.kind === undefined ? "done" : args.kind;
  if (!isDraftId(draftId)) return { error: `draft_id is not a draft id: ${String(args.draft_id)}` };
  if (!inReplyTo) return { error: "in_reply_to needs the ask_ts from the channel tag" };
  if (!text.trim()) return { error: "text is empty" };
  if (typeof kind !== "string" || !(REPLY_KINDS as readonly string[]).includes(kind)) {
    return { error: `kind is one of ${REPLY_KINDS.join(", ")}, not ${String(kind)}` };
  }
  if (!readAsks(dir, draftId).some((ask) => ask.ask_ts === inReplyTo)) {
    return {
      error: `draft ${draftId} has no ask ${inReplyTo}; pass the ask_ts from the channel tag`,
    };
  }
  const row: Reply = {
    ts: new Date().toISOString(),
    draft_id: draftId,
    in_reply_to: inReplyTo,
    kind: kind as ReplyKind,
    text,
  };
  appendRow(repliesFile(dir, draftId), row);
  return { ok: true, row };
}

const INSTRUCTIONS = [
  'A comment pinned to a step on the lesson builder page arrives as a <channel source="jadwigo-builder"> line.',
  "The tag carries draft_id, step_id (the step it is pinned to), intent (change, question or note), ask_ts and author.",
  "Act on it through the jadwigo MCP, never by editing the draft file, and answer with the reply tool,",
  "passing draft_id and ask_ts as in_reply_to: kind progress when you start, question when they must decide,",
  "done when it lands or is answered, note for something they should know. The page shows the reply under the comment.",
].join(" ");

export function createServer(dir: string): Server<Request, ChannelNotification, Result> {
  const server = new Server<Request, ChannelNotification, Result>(
    { name: SERVER_NAME, version: "0.1.0" },
    {
      capabilities: { experimental: { "claude/channel": {} }, tools: {} },
      instructions: INSTRUCTIONS,
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "reply",
        description:
          "Answer a comment from the lesson builder page; it shows under that comment. " +
          "draft_id and in_reply_to (the ask_ts) come from the channel tag. kind: progress in a " +
          "few words when you start, done when it lands or is answered, question when they must " +
          "decide (an answer that ends by asking them to choose is a question), note for anything " +
          "they should know or to correct an earlier reply. Omitted, it is done.",
        inputSchema: {
          type: "object",
          properties: {
            draft_id: { type: "string", description: "The draft_id from the channel tag." },
            in_reply_to: { type: "string", description: "The ask_ts from the channel tag." },
            kind: { type: "string", enum: [...REPLY_KINDS] },
            text: { type: "string", description: "The answer, in markdown." },
          },
          required: ["draft_id", "in_reply_to", "text"],
        },
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name !== "reply") {
      return {
        content: [{ type: "text", text: `unknown tool: ${request.params.name}` }],
        isError: true,
      };
    }
    const result = reply(dir, (request.params.arguments ?? {}) as ReplyArgs);
    if ("error" in result) {
      return { content: [{ type: "text", text: result.error }], isError: true };
    }
    return { content: [{ type: "text", text: `replied (${result.row.kind})` }] };
  });
  return server;
}

/**
 * A sleep that a change to the drafts directory cuts short. The poll stays the floor: a watch that
 * never fires, or a directory that does not exist yet, still polls every POLL_MS.
 */
function wakeOnAsks(dir: string): () => Promise<void> {
  let wake: (() => void) | null = null;
  let pending = false;
  if (existsSync(dir)) {
    try {
      watch(dir, (_event, name) => {
        if (name && !name.endsWith(ASKS_SUFFIX)) return;
        pending = true;
        const w = wake;
        if (w) setTimeout(w, WAKE_DEBOUNCE_MS);
      });
    } catch (error) {
      console.error(`${SERVER_NAME}: cannot watch ${dir}, polling only: ${error}`);
    }
  }
  return () =>
    new Promise<void>((resolve) => {
      if (pending) {
        pending = false;
        resolve();
        return;
      }
      const timer = setTimeout(done, POLL_MS);
      function done() {
        clearTimeout(timer);
        wake = null;
        pending = false;
        resolve();
      }
      wake = done;
    });
}

async function main() {
  const dir = draftsDir();
  const loaded = channelLoaded(process.ppid, psProc);
  if (loaded === false) {
    console.error(
      `${SERVER_NAME}: this claude was started without ${CHANNELS_FLAG}=server:${SERVER_NAME}, so it ` +
        "would drop every comment. Nothing is sent or consumed; start the session with make builder.",
    );
  }
  const server = createServer(dir);
  await server.connect(new StdioServerTransport());
  const sleep = wakeOnAsks(dir);
  for (;;) {
    try {
      // Every claude on this machine starts this server, since it is registered for the user. One
      // without the flag says so only when make builder started it; any other stays silent, so
      // it never overwrites the builder session's heartbeat.
      const session = builderSession();
      if (loaded !== false || session) {
        writeHeartbeat(dir, {
          at: new Date().toISOString(),
          pid: process.pid,
          session_id: session,
          loaded,
        });
      }
      if (loaded !== false) await pollOnce(dir, (n) => server.notification(n));
    } catch (error) {
      // A failed poll is a poll; the next is at most 5 seconds away.
      console.error(`${SERVER_NAME}: poll failed: ${error}`);
    }
    await sleep();
  }
}

function writeHeartbeat(dir: string, beat: Heartbeat) {
  const path = heartbeatFile(dir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(beat)}\n`);
}

if (import.meta.main) {
  await main();
}
