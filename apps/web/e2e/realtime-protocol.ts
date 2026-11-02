// The parts of make dev-all's Realtime stand-in (e2e/realtime-server.ts) that need no socket and
// no database, so a unit test holds them (dl-uukj.47.14.1): the WebSocket frames (RFC 6455) and
// the Phoenix channel protocol supabase-js speaks to Supabase Realtime (realtime-js 2.118.0,
// serializer vsn 2.0.0's JSON arrays and vsn 1.0.0's objects).
//
// Only what the run channel uses (apps/web/src/playground/chat/realtime.ts): the heartbeat, a
// private channel's join, checked as Realtime checks it, its leave, a new access token, and the
// broadcasts the database sends. No presence, no postgres_changes, no broadcast from a browser.
import { createHash } from "node:crypto";

/** The 4 opcodes the stand-in reads or writes. */
export const OPCODE = { text: 1, binary: 2, close: 8, ping: 9, pong: 10 } as const;

/** The Sec-WebSocket-Accept answer to a client's Sec-WebSocket-Key. */
export function acceptKey(key: string): string {
  return createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
}

/** One server frame: final, unmasked, as a server always sends. */
export function encodeFrame(opcode: number, payload: Buffer | string): Buffer {
  const body = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  let header: Buffer;
  if (body.length < 126) {
    header = Buffer.from([0x80 | opcode, body.length]);
  } else if (body.length < 0x10000) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  return Buffer.concat([header, body]);
}

/** A whole message: a data frame with its fragments joined, or a control frame. */
export interface Message {
  opcode: number;
  payload: Buffer;
}

/**
 * Reads a client's frames as the bytes arrive, in any chunking: unmasks them and joins a
 * fragmented message. A control frame may arrive between fragments and is returned at once.
 */
export class FrameReader {
  private pending = Buffer.alloc(0);
  private fragments: Buffer[] = [];
  private fragmentOpcode = 0;

  push(chunk: Buffer): Message[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const out: Message[] = [];
    for (;;) {
      const frame = this.next();
      if (frame === undefined) return out;
      const { fin, opcode, payload } = frame;
      if (opcode >= OPCODE.close) {
        out.push({ opcode, payload });
      } else if (opcode !== 0 && fin) {
        out.push({ opcode, payload });
      } else {
        if (opcode !== 0) this.fragmentOpcode = opcode;
        this.fragments.push(payload);
        if (fin) {
          out.push({ opcode: this.fragmentOpcode, payload: Buffer.concat(this.fragments) });
          this.fragments = [];
        }
      }
    }
  }

  private next(): { fin: boolean; opcode: number; payload: Buffer } | undefined {
    const bytes = this.pending;
    if (bytes.length < 2) return undefined;
    const first = bytes[0] ?? 0;
    const second = bytes[1] ?? 0;
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (bytes.length < 4) return undefined;
      length = bytes.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) {
      if (bytes.length < 10) return undefined;
      length = Number(bytes.readBigUInt64BE(2));
      offset = 10;
    }
    const masked = (second & 0x80) !== 0;
    const mask = masked ? bytes.subarray(offset, offset + 4) : undefined;
    if (masked) offset += 4;
    if (bytes.length < offset + length) return undefined;
    const payload = Buffer.from(bytes.subarray(offset, offset + length));
    if (mask !== undefined) {
      for (let i = 0; i < payload.length; i++) payload[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0);
    }
    this.pending = bytes.subarray(offset + length);
    return { fin: (first & 0x80) !== 0, opcode: first & 0x0f, payload };
  }
}

/** A Phoenix message, as both serializer versions carry it. */
export interface PhoenixMessage {
  join_ref: string | null;
  ref: string | null;
  topic: string;
  event: string;
  payload: Record<string, unknown>;
}

/** The serializer a socket asked for in its `vsn` query parameter: 2.0.0 unless it named 1.0.0. */
export type Vsn = "1.0.0" | "2.0.0";

export function vsnOf(query: URLSearchParams): Vsn {
  return query.get("vsn") === "1.0.0" ? "1.0.0" : "2.0.0";
}

/** A text frame's message, or undefined for one that is neither serializer's shape. */
export function decodeMessage(text: string): PhoenixMessage | undefined {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return undefined;
  }
  const fields = Array.isArray(raw)
    ? { join_ref: raw[0], ref: raw[1], topic: raw[2], event: raw[3], payload: raw[4] }
    : (raw as Record<string, unknown> | null);
  if (fields === null || typeof fields !== "object") return undefined;
  const { join_ref, ref, topic, event, payload } = fields;
  if (typeof topic !== "string" || typeof event !== "string") return undefined;
  return {
    join_ref: typeof join_ref === "string" ? join_ref : null,
    ref: typeof ref === "string" ? ref : null,
    topic,
    event,
    payload:
      payload !== null && typeof payload === "object" ? (payload as Record<string, unknown>) : {},
  };
}

function encodeMessage(message: PhoenixMessage, vsn: Vsn): string {
  const { join_ref, ref, topic, event, payload } = message;
  return JSON.stringify(
    vsn === "2.0.0"
      ? [join_ref, ref, topic, event, payload]
      : { join_ref, ref, topic, event, payload },
  );
}

/** supabase-js names a channel `realtime:<topic>`; the database's topic is the part after it. */
const CHANNEL_PREFIX = "realtime:";

/** The database's topic for a run's channel, `run:<run id>` (the run_event trigger). */
const RUN_TOPIC_PREFIX = "run:";

/**
 * Whether a token may join a private topic: null when it may, else the reason the join is refused
 * with. The server checks the token and Realtime's select policy on realtime.messages.
 */
export type JoinCheck = (topic: string, token: string | null) => Promise<string | null>;

/** One browser's connection, as the hub writes to it. */
export interface HubSocket {
  readonly vsn: Vsn;
  send(text: string): void;
}

const ok = (response: Record<string, unknown> = {}) => ({ status: "ok", response });

/**
 * The channels each socket joined, and the replies and broadcasts it is owed. A private join is
 * checked at join, as Realtime does; a public one (none in this app) needs no check.
 */
export class RealtimeHub {
  private readonly sockets = new Map<HubSocket, { token: string | null; joined: Set<string> }>();

  constructor(private readonly check: JoinCheck) {}

  open(socket: HubSocket): void {
    this.sockets.set(socket, { token: null, joined: new Set() });
  }

  close(socket: HubSocket): void {
    this.sockets.delete(socket);
  }

  /** How many sockets are on a channel: the topic as supabase-js names it. */
  listeners(channel: string): number {
    let count = 0;
    for (const { joined } of this.sockets.values()) if (joined.has(channel)) count++;
    return count;
  }

  async receive(socket: HubSocket, text: string): Promise<void> {
    const state = this.sockets.get(socket);
    const message = decodeMessage(text);
    if (state === undefined || message === undefined) return;
    const reply = (payload: Record<string, unknown>) =>
      socket.send(
        encodeMessage(
          {
            join_ref: message.join_ref,
            ref: message.ref,
            topic: message.topic,
            event: "phx_reply",
            payload,
          },
          socket.vsn,
        ),
      );
    const token =
      typeof message.payload["access_token"] === "string" ? message.payload["access_token"] : null;
    switch (message.event) {
      case "heartbeat":
        return reply(ok());
      case "phx_join": {
        if (token !== null) state.token = token;
        const config = message.payload["config"] as { private?: unknown } | undefined;
        const topic = message.topic.startsWith(CHANNEL_PREFIX)
          ? message.topic.slice(CHANNEL_PREFIX.length)
          : message.topic;
        // A run's topic is private on Supabase: the database sends its broadcasts with private
        // true, which a public channel never receives. Here a public join on it is refused.
        if (config?.private !== true && topic.startsWith(RUN_TOPIC_PREFIX))
          return reply({
            status: "error",
            response: {
              reason: `Unauthorized: ${topic} is a private channel: join it with private: true`,
            },
          });
        if (config?.private === true) {
          const refused = await this.check(topic, state.token);
          if (refused !== null) return reply({ status: "error", response: { reason: refused } });
        }
        // A socket closed while the check ran joins nothing.
        if (!this.sockets.has(socket)) return;
        state.joined.add(message.topic);
        return reply(ok());
      }
      case "access_token":
        if (token !== null) state.token = token;
        return;
      case "phx_leave":
        state.joined.delete(message.topic);
        return reply(ok());
      default:
        return reply(ok());
    }
  }

  /**
   * Sends a broadcast the database made (realtime.send) to every socket on its topic, as Realtime
   * does: event `broadcast`, no refs. Returns how many sockets it reached.
   */
  broadcast(topic: string, event: string, payload: unknown): number {
    const channel = `${CHANNEL_PREFIX}${topic}`;
    let sent = 0;
    for (const [socket, { joined }] of this.sockets) {
      if (!joined.has(channel)) continue;
      socket.send(
        encodeMessage(
          {
            join_ref: null,
            ref: null,
            topic: channel,
            event: "broadcast",
            payload: { type: "broadcast", event, payload },
          },
          socket.vsn,
        ),
      );
      sent++;
    }
    return sent;
  }
}
