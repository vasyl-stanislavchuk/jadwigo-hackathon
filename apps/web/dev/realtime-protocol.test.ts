import { describe, expect, it } from "vitest";
import {
  acceptKey,
  decodeMessage,
  encodeFrame,
  FrameReader,
  type HubSocket,
  OPCODE,
  RealtimeHub,
  type Vsn,
} from "../e2e/realtime-protocol.ts";

/** A client frame: masked, as a browser sends it. */
function clientFrame(opcode: number, text: string, fin = true): Buffer {
  const body = Buffer.from(text, "utf8");
  const mask = Buffer.from([1, 2, 3, 4]);
  const masked = Buffer.from(body.map((byte, i) => byte ^ (mask[i % 4] ?? 0)));
  const length =
    body.length < 126
      ? Buffer.from([0x80 | body.length])
      : Buffer.from([0x80 | 126, body.length >> 8, body.length & 0xff]);
  return Buffer.concat([Buffer.from([(fin ? 0x80 : 0) | opcode]), length, mask, masked]);
}

function socket(vsn: Vsn = "2.0.0"): HubSocket & { sent: unknown[] } {
  const sent: unknown[] = [];
  return { vsn, sent, send: (text) => sent.push(JSON.parse(text)) };
}

const TOPIC = "realtime:run:run_7qre3atahx8cpak6xbjtz73var";
const join = (token: string | null) =>
  JSON.stringify([
    "1",
    "1",
    TOPIC,
    "phx_join",
    { config: { private: true }, ...(token === null ? {} : { access_token: token }) },
  ]);

describe("the WebSocket frames (dl-uukj.47.14.1)", () => {
  it("answers the key from RFC 6455's own example", () => {
    expect(acceptKey("dGhlIHNhbXBsZSBub25jZQ==")).toBe("s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
  });

  it("reads masked frames in any chunking, and a long one", () => {
    const long = "x".repeat(300);
    const bytes = Buffer.concat([clientFrame(OPCODE.text, "hej"), clientFrame(OPCODE.text, long)]);
    const reader = new FrameReader();
    const got = [...bytes].flatMap((byte) => reader.push(Buffer.from([byte])));
    expect(got.map((m) => m.payload.toString("utf8"))).toEqual(["hej", long]);
  });

  it("joins a fragmented message and passes a ping between its fragments", () => {
    const reader = new FrameReader();
    const got = reader.push(
      Buffer.concat([
        clientFrame(OPCODE.text, "pó", false),
        clientFrame(OPCODE.ping, ""),
        clientFrame(0, "łnoc"),
      ]),
    );
    expect(got.map((m) => [m.opcode, m.payload.toString("utf8")])).toEqual([
      [OPCODE.ping, ""],
      [OPCODE.text, "północ"],
    ]);
  });

  it("writes unmasked final frames with the right length form", () => {
    expect([...encodeFrame(OPCODE.text, "ok")]).toEqual([0x81, 2, 0x6f, 0x6b]);
    const mid = encodeFrame(OPCODE.text, "y".repeat(200));
    expect([mid[0], mid[1], mid.readUInt16BE(2), mid.length]).toEqual([0x81, 126, 200, 204]);
    const big = encodeFrame(OPCODE.binary, Buffer.alloc(70_000));
    expect([big[1], Number(big.readBigUInt64BE(2))]).toEqual([127, 70_000]);
  });
});

describe("the Phoenix channel (dl-uukj.47.14.1)", () => {
  it("reads both serializers' shapes and nothing else", () => {
    const v2 = decodeMessage('[null,"2","phoenix","heartbeat",{}]');
    const v1 = decodeMessage('{"ref":"2","topic":"phoenix","event":"heartbeat","payload":{}}');
    expect(v2).toEqual({
      join_ref: null,
      ref: "2",
      topic: "phoenix",
      event: "heartbeat",
      payload: {},
    });
    expect(v1).toEqual(v2);
    expect(decodeMessage("not json")).toBeUndefined();
    expect(decodeMessage("[1,2]")).toBeUndefined();
  });

  it("answers a heartbeat", async () => {
    const hub = new RealtimeHub(async () => null);
    const s = socket();
    hub.open(s);
    await hub.receive(s, '[null,"7","phoenix","heartbeat",{}]');
    expect(s.sent).toEqual([[null, "7", "phoenix", "phx_reply", { status: "ok", response: {} }]]);
  });

  it("checks a private join with the run's topic and the token, and refuses with the reason", async () => {
    const asked: [string, string | null][] = [];
    const hub = new RealtimeHub(async (topic, token) => {
      asked.push([topic, token]);
      return token === "member" ? null : "Unauthorized: not this pod's run";
    });
    const s = socket();
    hub.open(s);
    await hub.receive(s, join("stranger"));
    expect(s.sent.at(-1)).toEqual([
      "1",
      "1",
      TOPIC,
      "phx_reply",
      { status: "error", response: { reason: "Unauthorized: not this pod's run" } },
    ]);
    expect(hub.listeners(TOPIC)).toBe(0);
    await hub.receive(
      s,
      JSON.stringify(["1", "3", TOPIC, "access_token", { access_token: "member" }]),
    );
    await hub.receive(s, join(null));
    expect(asked).toEqual([
      ["run:run_7qre3atahx8cpak6xbjtz73var", "stranger"],
      ["run:run_7qre3atahx8cpak6xbjtz73var", "member"],
    ]);
    expect(s.sent.at(-1)).toEqual(["1", "1", TOPIC, "phx_reply", { status: "ok", response: {} }]);
    expect(hub.listeners(TOPIC)).toBe(1);
  });

  it("sends the database's broadcast to the sockets on its topic only, until they leave", async () => {
    const hub = new RealtimeHub(async () => null);
    const on = socket();
    const v1 = socket("1.0.0");
    const off = socket();
    for (const s of [on, v1, off]) hub.open(s);
    await hub.receive(on, join("t"));
    await hub.receive(v1, join("t"));
    const poke = { run_id: "run_7qre3atahx8cpak6xbjtz73var", seq: 3, event_id: "e", id: "m" };
    expect(hub.broadcast("run:run_7qre3atahx8cpak6xbjtz73var", "run_event", poke)).toBe(2);
    const sent = { type: "broadcast", event: "run_event", payload: poke };
    expect(on.sent.at(-1)).toEqual([null, null, TOPIC, "broadcast", sent]);
    expect(v1.sent.at(-1)).toEqual({
      join_ref: null,
      ref: null,
      topic: TOPIC,
      event: "broadcast",
      payload: sent,
    });
    expect(off.sent).toEqual([]);
    await hub.receive(on, JSON.stringify(["1", "4", TOPIC, "phx_leave", {}]));
    hub.close(v1);
    expect(hub.broadcast("run:run_7qre3atahx8cpak6xbjtz73var", "run_event", poke)).toBe(0);
  });
});
