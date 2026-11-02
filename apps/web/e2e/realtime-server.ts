// make dev-all's stand-in for Supabase Realtime (dl-uukj.47.14.1), beside the auth stand-in: the
// parent's run channel works on this machine as it does on Supabase, with no Docker.
//
// supabase-js reaches Auth and Realtime through one URL, so this runs e2e/auth-server.ts in the
// same process and adds Realtime's socket to that server: GET /realtime/v1/websocket upgrades,
// every other request is the auth stand-in's, unchanged. auth-server.ts stays as CI's browser
// tests start it; only make dev-all starts this file.
//
// What it does, as Realtime does it:
// - A private channel's join is checked with the run_join policy (20261101180000_run_join_policy.sql):
//   the token must verify against the stand-in's own key, and then, in a transaction it rolls back,
//   a broadcast row for the topic must be visible to the role authenticated with the token's
//   claims and realtime.topic set. The claims are the ones app.custom_access_token gives, as
//   Supabase Auth's hook would have at sign-in: the auth stand-in calls no hook, so its tokens
//   carry no pod_id of their own.
// - The broadcasts are realtime.send's rows in realtime.messages (supabase/tests/shim.sql keeps each
//   as a row), read every POLL_MS and sent to the sockets on their topic. The run_event trigger
//   makes them, so whatever writes a run event, the api or the step host, reaches the page.
//
// With no DATABASE_URL every private join is refused, so the page says the channel is down
// rather than waiting on one that never pokes.
import { createPublicKey, type JsonWebKey, type KeyObject, verify } from "node:crypto";
import http, { type IncomingMessage, type Server } from "node:http";
import type { Duplex } from "node:stream";
import pg from "pg";
import { AUTH_ORIGIN } from "./auth-origin.ts";
import {
  acceptKey,
  encodeFrame,
  FrameReader,
  type HubSocket,
  OPCODE,
  RealtimeHub,
  vsnOf,
} from "./realtime-protocol.ts";

const SOCKET_PATH = "/realtime/v1/websocket";
const ISSUER = `${AUTH_ORIGIN}/auth/v1`;
const POLL_MS = 250;
/** How far back each read looks again, for a row whose transaction committed after a later one. */
const OVERLAP = "30 seconds";
/** The ids already sent from inside that window: plenty for one parent on one machine. */
const SEEN_MAX = 5000;

// Start the auth stand-in here and keep its server: the one server auth-server.ts listens with.
const servers: Server[] = [];
const listen = http.Server.prototype.listen;
http.Server.prototype.listen = function (this: Server, ...args: unknown[]): Server {
  servers.push(this);
  return Reflect.apply(listen, this, args) as Server;
} as Server["listen"];
await import("./auth-server.ts");
http.Server.prototype.listen = listen;
const server = servers[0];
if (server === undefined) throw new Error("auth-server.ts started no server");

const databaseUrl = process.env["DATABASE_URL"]?.trim() || undefined;
const pool =
  databaseUrl === undefined ? undefined : new pg.Pool({ connectionString: databaseUrl, max: 4 });

/** The stand-in's signing key, read once from its own JWKS. */
let signingKey: Promise<KeyObject> | undefined;
function standInKey(): Promise<KeyObject> {
  signingKey ??= fetch(`${ISSUER}/.well-known/jwks.json`)
    .then((res) => res.json() as Promise<{ keys: JsonWebKey[] }>)
    .then(({ keys }) => {
      const [key] = keys;
      if (key === undefined) throw new Error("the auth stand-in's JWKS holds no key");
      return createPublicKey({ key, format: "jwk" });
    });
  return signingKey;
}

/** The claims of a token the auth stand-in signed that has not expired, else undefined. */
async function verified(token: string): Promise<Record<string, unknown> | undefined> {
  const [header, body, signature] = token.split(".");
  if (header === undefined || body === undefined || signature === undefined) return undefined;
  const good = verify(
    "RSA-SHA256",
    Buffer.from(`${header}.${body}`),
    await standInKey(),
    Buffer.from(signature, "base64url"),
  );
  if (!good) return undefined;
  const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<
    string,
    unknown
  >;
  const exp = typeof claims["exp"] === "number" ? claims["exp"] : 0;
  return claims["iss"] === ISSUER && exp > Date.now() / 1000 ? claims : undefined;
}

/** Realtime's join check for a private topic: null when the token may join, else why not. */
async function canJoin(topic: string, token: string | null): Promise<string | null> {
  if (pool === undefined) return "the Realtime stand-in has no DATABASE_URL";
  if (token === null) return "Unauthorized: a private channel needs a signed-in token";
  const claims = await verified(token).catch(() => undefined);
  if (claims === undefined) return "Unauthorized: the token is not the auth stand-in's, or expired";
  const client = await pool.connect();
  try {
    await client.query("begin");
    const hooked = await client.query<{ claims: Record<string, unknown> }>(
      "select app.custom_access_token(jsonb_build_object('user_id', $1::text, 'claims', $2::jsonb)) -> 'claims' as claims",
      [claims["sub"], JSON.stringify(claims)],
    );
    const probe = await client.query<{ id: string }>(
      "insert into realtime.messages (topic, extension, private, event, payload) values ($1, 'broadcast', true, 'join', '{}') returning id",
      [topic],
    );
    await client.query("set local role authenticated");
    await client.query(
      "select set_config('request.jwt.claims', $1, true), set_config('realtime.topic', $2, true)",
      [JSON.stringify(hooked.rows[0]?.claims ?? claims), topic],
    );
    const seen = await client.query("select from realtime.messages where id = $1", [
      probe.rows[0]?.id,
    ]);
    return seen.rowCount === 1
      ? null
      : `Unauthorized: You do not have permissions to read from this Channel topic: ${topic}`;
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
  }
}

const hub = new RealtimeHub((topic, token) =>
  canJoin(topic, token).catch(
    (error: unknown) => `the Realtime stand-in could not check the join: ${String(error)}`,
  ),
);

server.on("upgrade", (req: IncomingMessage, socket: Duplex) => {
  const url = new URL(req.url ?? "/", AUTH_ORIGIN);
  const key = req.headers["sec-websocket-key"];
  if (url.pathname !== SOCKET_PATH || typeof key !== "string") {
    socket.end("HTTP/1.1 404 Not Found\r\nconnection: close\r\n\r\n");
    return;
  }
  socket.write(
    `HTTP/1.1 101 Switching Protocols\r\nupgrade: websocket\r\nconnection: Upgrade\r\nsec-websocket-accept: ${acceptKey(key)}\r\n\r\n`,
  );
  const peer: HubSocket = {
    vsn: vsnOf(url.searchParams),
    send: (text) => {
      if (socket.writable) socket.write(encodeFrame(OPCODE.text, text));
    },
  };
  hub.open(peer);
  const reader = new FrameReader();
  socket.on("data", (chunk: Buffer) => {
    for (const { opcode, payload } of reader.push(chunk)) {
      if (opcode === OPCODE.text) void hub.receive(peer, payload.toString("utf8"));
      else if (opcode === OPCODE.ping) socket.write(encodeFrame(OPCODE.pong, payload));
      else if (opcode === OPCODE.close) {
        hub.close(peer);
        socket.end(encodeFrame(OPCODE.close, payload.subarray(0, 2)));
      }
    }
  });
  const gone = () => hub.close(peer);
  socket.on("close", gone);
  socket.on("error", gone);
});

/** Reads realtime.send's new rows and hands each to the hub once. */
async function relay(db: pg.Pool): Promise<void> {
  const seen = new Set<string>();
  let since = (
    await db.query<{ now: string }>("select timezone('utc', clock_timestamp())::text as now")
  ).rows[0]?.now;
  process.stdout.write(`realtime stand-in on ${AUTH_ORIGIN.replace("http", "ws")}${SOCKET_PATH}\n`);
  for (;;) {
    try {
      const { rows } = await db.query<{
        id: string;
        topic: string;
        event: string | null;
        payload: unknown;
        at: string;
      }>(
        `select id, topic, event, payload, inserted_at::text as at from realtime.messages
          where extension = 'broadcast' and inserted_at > $1::timestamp - interval '${OVERLAP}'
          order by inserted_at, id`,
        [since],
      );
      for (const row of rows) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        if (seen.size > SEEN_MAX) seen.delete(seen.values().next().value ?? "");
        const sockets = hub.broadcast(row.topic, row.event ?? "broadcast", row.payload);
        // Ids and counts only: never the payload.
        process.stdout.write(
          `${JSON.stringify({ realtime: "broadcast", topic: row.topic, sockets })}\n`,
        );
        if (since === undefined || row.at > since) since = row.at;
      }
    } catch (error) {
      process.stdout.write(
        `realtime stand-in: reading realtime.messages failed: ${String(error)}\n`,
      );
    }
    await new Promise((done) => setTimeout(done, POLL_MS));
  }
}

if (pool === undefined) {
  process.stdout.write(
    "realtime stand-in: no DATABASE_URL, so no channel joins and no broadcasts\n",
  );
} else {
  void relay(pool);
}
