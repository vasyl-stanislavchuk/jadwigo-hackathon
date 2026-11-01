/**
 * The Realtime probe (dl-z5ja.6): run by the owner against jadwigo-dev once
 * supabase/probes/realtime/setup.sql is applied, never shipped and never run by CI.
 *
 *   bun apps/web/dev/realtime-probe.ts
 *
 * It answers the 4 questions docs/research/ai-chat-engine.md leaves to the dev project:
 *   1. join: a user of the run's pod joins the private topic run:<id>, and a user of another pod is
 *      refused at join (the realtime.messages policy) and reads none of the run's events;
 *   2. live: events inserted into realtime_probe.run_event arrive through the trigger's realtime.send;
 *   3. reload: the page leaves mid-stream, comes back, subscribes, then reads run_event after its
 *      cursor, and mergeLive (@jadwigo/core) gives every seq once with no gap. Realtime's own replay
 *      (limit 25) is counted on the side, as the bonus the plan calls it;
 *   4. deltas: the server pushes about 4 a second with httpSend, and the probe records latency, what
 *      was dropped, and the rate against Realtime's message limits.
 *
 * It makes 2 test users with made-up emails (PROBE_EMAIL), one per made-up pod, and deletes them at
 * the end. It prints one line per check and a JSON report last, which goes into the issue's notes.
 * Only the dev project is accepted (infra/supabase-auth/dev.json).
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { RunEvent } from "@jadwigo/contracts/run";
import { mergeLive } from "@jadwigo/core";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/** The made-up test users' emails; cleanup.sql deletes any left behind by the same pattern. */
export const PROBE_EMAIL = (label: string, stamp: string) =>
  `realtime-probe-${label}-${stamp}@example.com`;

/** The topic a run streams on. The wire spelling of the run id is dl-z5ja.21's choice. */
export const topicOf = (runId: string) => `run:${runId}`;

/**
 * Realtime's per-project limits (supabase.com/docs/guides/realtime/limits). The plan's are Pro's;
 * a free project gets the first row. Each broadcast counts once per receiver.
 */
const LIMITS = {
  free: { messagesPerSecond: 100, connections: 200, payloadBytes: 256 * 1024 },
  pro: { messagesPerSecond: 500, connections: 500, payloadBytes: 3 * 1024 * 1024 },
} as const;

export type ProbeConfig = {
  url: string;
  publishableKey: string;
  secretKey: string;
  /** Deltas a second, and for how long. */
  rate: number;
  seconds: number;
};

/** The probe's environment, or the names of what is missing or wrong. */
export function readConfig(
  env: Record<string, string | undefined>,
  devRef: string,
): ProbeConfig | { problems: string[] } {
  const url = env["JW_SUPABASE_URL"] ?? "";
  const publishableKey = env["JW_SUPABASE_KEY"] ?? "";
  const secretKey = env["JW_SUPABASE_SECRET_KEY"] ?? "";
  const rate = Number(env["JW_PROBE_DELTA_RATE"] ?? "4");
  const seconds = Number(env["JW_PROBE_DELTA_SECONDS"] ?? "30");
  const problems: string[] = [];
  if (!url) problems.push("JW_SUPABASE_URL is unset");
  else if (new URL(url).hostname !== `${devRef}.supabase.co`)
    problems.push(`JW_SUPABASE_URL is not jadwigo-dev (${devRef}.supabase.co)`);
  if (!publishableKey) problems.push("JW_SUPABASE_KEY is unset (the publishable key)");
  if (!secretKey) problems.push("JW_SUPABASE_SECRET_KEY is unset (a secret key)");
  if (!(rate > 0 && rate <= 20)) problems.push("JW_PROBE_DELTA_RATE is not in (0, 20]");
  if (!(seconds > 0 && seconds <= 300)) problems.push("JW_PROBE_DELTA_SECONDS is not in (0, 300]");
  return problems.length ? { problems } : { url, publishableKey, secretKey, rate, seconds };
}

/** A realtime_probe.run_event row, as the read function returns it and the trigger sends it. */
export type ProbeRow = {
  run_id: string;
  seq: number;
  event_id: string;
  type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

/** A probe row as the engine's RunEvent, so mergeLive merges what the page will merge. Postgres
 * writes timestamps with an offset and microseconds; the contract wants an ISO instant. */
export function toRunEvent(row: ProbeRow): RunEvent {
  return RunEvent.parse({
    ...row,
    run_id: idOf(ID_PREFIXES.run, row.run_id),
    created_at: new Date(row.created_at).toISOString(),
  });
}

/** Which seqs in [first, last] are missing, and which appear more than once. */
export function seqCheck(
  seqs: readonly number[],
  first: number,
  last: number,
): { missing: number[]; duplicates: number[] } {
  const seen = new Map<number, number>();
  for (const s of seqs) seen.set(s, (seen.get(s) ?? 0) + 1);
  const missing: number[] = [];
  for (let s = first; s <= last; s++) if (!seen.has(s)) missing.push(s);
  const duplicates = [...seen].filter(([, n]) => n > 1).map(([s]) => s);
  return { missing, duplicates };
}

export type Latency = { n: number; p50: number; p95: number; max: number };

/** Nearest-rank percentiles, in whole milliseconds. */
export function latencyStats(ms: readonly number[]): Latency {
  const sorted = [...ms].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
  return {
    n: sorted.length,
    p50: Math.round(rank(50)),
    p95: Math.round(rank(95)),
    max: Math.round(sorted.at(-1) ?? 0),
  };
}

export type DeltaVerdict = {
  sent: number;
  send_failures: number;
  received: number;
  missing: number[];
  duplicates: number[];
  out_of_order: number;
  latency_ms: Latency;
  payload_bytes: number;
  /** Messages a second this stream costs: each send counts once per receiver. */
  cost_per_second: number;
  /** How many such streams fit under each plan's message limit. */
  streams_that_fit: { free: number; pro: number };
};

/** What one delta stream did: `received` holds each arrival's n and latency, in arrival order. */
export function deltaVerdict(input: {
  sent: number;
  sendFailures: number;
  received: readonly { n: number; latencyMs: number }[];
  rate: number;
  receivers: number;
  payloadBytes: number;
}): DeltaVerdict {
  const ns = input.received.map((r) => r.n);
  const { missing, duplicates } = seqCheck(ns, 1, input.sent);
  let outOfOrder = 0;
  for (let i = 1; i < ns.length; i++) if ((ns[i] ?? 0) < (ns[i - 1] ?? 0)) outOfOrder++;
  const cost = input.rate * input.receivers;
  return {
    sent: input.sent,
    send_failures: input.sendFailures,
    received: ns.length,
    missing,
    duplicates,
    out_of_order: outOfOrder,
    latency_ms: latencyStats(input.received.map((r) => r.latencyMs)),
    payload_bytes: input.payloadBytes,
    cost_per_second: cost,
    streams_that_fit: {
      free: Math.floor(LIMITS.free.messagesPerSecond / cost),
      pro: Math.floor(LIMITS.pro.messagesPerSecond / cost),
    },
  };
}

/** A token's claims, unverified: the probe prints where the pod came from. */
export function claimsOf(token: string): Record<string, unknown> {
  const body = token.split(".")[1] ?? "";
  return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
}

/** The pod a token carries, where the realtime.messages policy looks: top level, then app_metadata. */
export function podClaim(claims: Record<string, unknown>): { pod_id: string; from: string } | null {
  if (typeof claims["pod_id"] === "string") return { pod_id: claims["pod_id"], from: "pod_id" };
  const meta = claims["app_metadata"];
  if (meta && typeof meta === "object" && "pod_id" in meta && typeof meta.pod_id === "string")
    return { pod_id: meta.pod_id, from: "app_metadata.pod_id" };
  return null;
}

// The runner: everything below talks to the dev project.

const say = (line: string) => process.stdout.write(`${line}\n`);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const NO_SESSION = { auth: { persistSession: false, autoRefreshToken: false } } as const;

type Arrival = { row: ProbeRow; at: number; replayed: boolean };

/** Subscribes and resolves with how the join ended, within `ms`. */
function join(channel: RealtimeChannel, ms = 10_000): Promise<{ status: string; error?: string }> {
  return new Promise((done) => {
    const timer = setTimeout(() => done({ status: "NO_ANSWER" }), ms);
    channel.subscribe((status, err) => {
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        clearTimeout(timer);
        done(err ? { status, error: err.message } : { status });
      }
    });
  });
}

/** A private channel on the run's topic that records run_event and delta arrivals. */
function listen(
  client: SupabaseClient,
  runId: string,
  sink: { events: Arrival[]; deltas: { n: number; latencyMs: number }[]; system: unknown[] },
  replaySince?: number,
): RealtimeChannel {
  const channel = client.channel(topicOf(runId), {
    config: {
      private: true,
      ...(replaySince === undefined
        ? {}
        : { broadcast: { replay: { since: replaySince, limit: 25 } } }),
    },
  });
  channel.on("broadcast", { event: "run_event" }, (msg) => {
    sink.events.push({
      row: msg["payload"] as ProbeRow,
      at: Date.now(),
      replayed: !!msg.meta?.replayed,
    });
  });
  channel.on("broadcast", { event: "delta" }, (msg) => {
    const p = msg["payload"] as { n: number; sent_at: number };
    sink.deltas.push({ n: p.n, latencyMs: Date.now() - p.sent_at });
  });
  channel.on("system", {}, (msg) => sink.system.push(msg));
  return channel;
}

async function signIn(cfg: ProbeConfig, email: string, password: string) {
  const client = createClient(cfg.url, cfg.publishableKey, NO_SESSION);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(`sign-in of ${email} failed: ${error?.message}`);
  await client.realtime.setAuth(data.session.access_token);
  return { client, token: data.session.access_token };
}

async function emit(admin: SupabaseClient, runId: string, text: string): Promise<ProbeRow> {
  const { data, error } = await admin.rpc("realtime_probe_emit", {
    p_run_id: runId,
    p_type: "message",
    p_payload: { from: "agent", text },
  });
  if (error)
    throw new Error(`realtime_probe_emit failed: ${error.message} (is setup.sql applied?)`);
  return data as ProbeRow;
}

async function readAfter(
  client: SupabaseClient,
  runId: string,
  after: number,
): Promise<ProbeRow[]> {
  const { data, error } = await client.rpc("realtime_probe_events", {
    p_run_id: runId,
    p_after: after,
  });
  if (error) throw new Error(`realtime_probe_events failed: ${error.message}`);
  return data as ProbeRow[];
}

async function waitFor(check: () => boolean, ms: number) {
  const until = Date.now() + ms;
  while (!check() && Date.now() < until) await sleep(50);
}

async function main(): Promise<number> {
  const devRef = JSON.parse(
    readFileSync(new URL("../../../infra/supabase-auth/dev.json", import.meta.url), "utf8"),
  ).ref as string;
  const cfg = readConfig(process.env, devRef);
  if ("problems" in cfg) {
    for (const p of cfg.problems) say(`config: ${p}`);
    return 2;
  }
  const admin = createClient(cfg.url, cfg.secretKey, NO_SESSION);
  const stamp = Date.now().toString(36);
  const runId = randomUUID();
  const pods = { a: randomUUID(), b: randomUUID() };
  const users: string[] = [];
  const report: Record<string, unknown> = {
    project: devRef,
    run_id: runId,
    at: new Date().toISOString(),
  };
  const fails: string[] = [];
  const check = (name: string, ok: boolean, detail: string) => {
    say(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
    if (!ok) fails.push(name);
  };

  try {
    // Setup: 2 users, one per pod, and a run in pod a.
    const passwords = { a: `${randomUUID()}Aa1!`, b: `${randomUUID()}Aa1!` };
    for (const label of ["a", "b"] as const) {
      const { data, error } = await admin.auth.admin.createUser({
        email: PROBE_EMAIL(label, stamp),
        password: passwords[label],
        email_confirm: true,
        app_metadata: { pod_id: pods[label] },
      });
      if (error || !data.user) throw new Error(`createUser ${label} failed: ${error?.message}`);
      users.push(data.user.id);
    }
    const start = await admin.rpc("realtime_probe_start", { p_run_id: runId, p_pod_id: pods.a });
    if (start.error)
      throw new Error(
        `realtime_probe_start failed: ${start.error.message} (is setup.sql applied?)`,
      );
    const a = await signIn(cfg, PROBE_EMAIL("a", stamp), passwords.a);
    const b = await signIn(cfg, PROBE_EMAIL("b", stamp), passwords.b);
    const claimA = podClaim(claimsOf(a.token));
    say(
      `setup: run ${runId} in pod a; user a's token carries ${claimA ? `${claimA.from}=${claimA.pod_id}` : "no pod"}`,
    );

    // 1. Join.
    const sinkA = {
      events: [] as Arrival[],
      deltas: [] as { n: number; latencyMs: number }[],
      system: [] as unknown[],
    };
    const sinkB = {
      events: [] as Arrival[],
      deltas: [] as { n: number; latencyMs: number }[],
      system: [] as unknown[],
    };
    let chanA = listen(a.client, runId, sinkA);
    const chanB = listen(b.client, runId, sinkB);
    const joinA = await join(chanA);
    const joinB = await join(chanB);
    report["join"] = { a: joinA, b: joinB };
    check("join, own pod", joinA.status === "SUBSCRIBED", JSON.stringify(joinA));
    check("join, other pod refused", joinB.status !== "SUBSCRIBED", JSON.stringify(joinB));

    // 2. Live: 10 events, 100 ms apart, timed from the emit call to the arrival.
    const emittedAt = new Map<number, number>();
    for (let i = 1; i <= 10; i++) {
      const t = Date.now();
      const row = await emit(admin, runId, `live ${i}`);
      emittedAt.set(row.seq, t);
      await sleep(100);
    }
    await waitFor(() => sinkA.events.length >= 10, 5_000);
    const liveSeqs = sinkA.events.map((e) => e.row.seq);
    const live = seqCheck(liveSeqs, 1, 10);
    const liveLatency = latencyStats(
      sinkA.events.map((e) => e.at - (emittedAt.get(e.row.seq) ?? e.at)),
    );
    report["live"] = { received: liveSeqs.length, ...live, latency_ms_from_emit_call: liveLatency };
    check(
      "live events arrive",
      live.missing.length === 0 && live.duplicates.length === 0,
      `${liveSeqs.length}/10, missing ${live.missing.join(",") || "none"}, p50 ${liveLatency.p50} ms, p95 ${liveLatency.p95} ms`,
    );

    // 3. Reload: leave at cursor 10, miss events while away, come back while more are inserted.
    const cursor = Math.max(0, ...liveSeqs);
    const leftAt = Date.now();
    await a.client.removeChannel(chanA);
    const LAST = 30;
    const emitter = (async () => {
      for (let i = cursor + 1; i <= LAST; i++) {
        await emit(admin, runId, `reload ${i}`);
        await sleep(100);
      }
    })();
    await sleep(800);
    const sinkA2 = {
      events: [] as Arrival[],
      deltas: [] as { n: number; latencyMs: number }[],
      system: [] as unknown[],
    };
    chanA = listen(a.client, runId, sinkA2, leftAt);
    const rejoin = await join(chanA);
    const bufferAtFetch = sinkA2.events.length;
    const fetched = await readAfter(a.client, runId, cursor);
    await emitter;
    await sleep(1_500);
    const live2 = sinkA2.events.filter((e) => !e.replayed);
    const replayed = sinkA2.events.filter((e) => e.replayed);
    const merged = mergeLive(
      sinkA2.events.map((e) => toRunEvent(e.row)),
      fetched.map(toRunEvent),
      cursor,
    );
    const mergedSeqs = merged.map((e) => e.seq);
    const reload = seqCheck(mergedSeqs, cursor + 1, LAST);
    const replayCheck = seqCheck(
      replayed.map((e) => e.row.seq),
      cursor + 1,
      Math.max(cursor, ...fetched.map((r) => r.seq)),
    );
    const overlap = fetched.filter((r) => sinkA2.events.some((e) => e.row.seq === r.seq)).length;
    report["reload"] = {
      rejoin,
      cursor,
      last: LAST,
      fetched: fetched.length,
      live_after_rejoin: live2.length,
      buffered_before_fetch: bufferAtFetch,
      in_both: overlap,
      merged: mergedSeqs.length,
      missing: reload.missing,
      duplicates: reload.duplicates,
      realtime_replay: {
        replayed: replayed.length,
        seqs: replayed.map((e) => e.row.seq),
        covers_the_gap_alone: replayCheck.missing.length === 0 && replayed.length > 0,
      },
    };
    check(
      "reload replays by seq",
      rejoin.status === "SUBSCRIBED" &&
        reload.missing.length === 0 &&
        reload.duplicates.length === 0 &&
        mergedSeqs.length === LAST - cursor,
      `${cursor + 1}..${LAST}: ${mergedSeqs.length} merged from ${fetched.length} fetched and ${sinkA2.events.length} live (${overlap} in both), missing ${reload.missing.join(",") || "none"}, duplicates ${reload.duplicates.join(",") || "none"}; Realtime replayed ${replayed.length}`,
    );

    // The other pod reads nothing and heard nothing.
    const readB = await readAfter(b.client, runId, 0);
    report["other_pod"] = { rows_read: readB.length, events_heard: sinkB.events.length };
    check(
      "other pod reads and hears nothing",
      readB.length === 0 && sinkB.events.length === 0,
      `${readB.length} rows read, ${sinkB.events.length} events heard`,
    );

    // 4. Deltas from the server at cfg.rate a second, by httpSend, the way the step will push them.
    const sender = admin.channel(topicOf(runId), { config: { private: true } });
    const total = Math.round(cfg.rate * cfg.seconds);
    const gap = 1000 / cfg.rate;
    const sample = { n: 0, sent_at: 0, text: "Dodaję zadanie z dodawaniem do 20. ".repeat(2) };
    let sendFailures = 0;
    const sendErrors = new Set<string>();
    say(`deltas: sending ${total} at ${cfg.rate}/s for ${cfg.seconds} s…`);
    const t0 = Date.now();
    const sends: Promise<void>[] = [];
    for (let n = 1; n <= total; n++) {
      await sleep(Math.max(0, t0 + (n - 1) * gap - Date.now()));
      sends.push(
        sender.httpSend("delta", { ...sample, n, sent_at: Date.now() }).then((r) => {
          if (!r.success) {
            sendFailures++;
            sendErrors.add(`${r.status} ${r.error}`);
          }
        }),
      );
    }
    await Promise.all(sends);
    await waitFor(() => sinkA2.deltas.length >= total, 5_000);
    await admin.removeChannel(sender);
    const verdict = deltaVerdict({
      sent: total,
      sendFailures,
      received: sinkA2.deltas,
      rate: cfg.rate,
      receivers: 1,
      payloadBytes: Buffer.byteLength(JSON.stringify({ ...sample, n: total, sent_at: Date.now() })),
    });
    report["deltas"] = {
      ...verdict,
      send_errors: [...sendErrors],
      other_pod_heard: sinkB.deltas.length,
      system: sinkA2.system,
    };
    check(
      "deltas at the planned rate",
      verdict.send_failures === 0 &&
        verdict.missing.length === 0 &&
        verdict.duplicates.length === 0 &&
        sinkB.deltas.length === 0,
      `${verdict.received}/${verdict.sent} received, ${verdict.send_failures} send failures, ${verdict.out_of_order} out of order, p50 ${verdict.latency_ms.p50} ms, p95 ${verdict.latency_ms.p95} ms, max ${verdict.latency_ms.max} ms; ${verdict.cost_per_second} msg/s each, ${verdict.streams_that_fit.free} such streams fit a free project, ${verdict.streams_that_fit.pro} a Pro one`,
    );

    await a.client.removeAllChannels();
    await b.client.removeAllChannels();
  } catch (error) {
    fails.push("error");
    report["error"] = String(error);
    say(`ERROR ${String(error)}`);
  } finally {
    for (const id of users) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error)
        say(`cleanup: deleting user ${id} failed: ${error.message} (cleanup.sql removes it)`);
    }
    await admin.removeAllChannels();
  }
  report["failed"] = fails;
  say(fails.length ? `FAILED: ${fails.join(", ")}` : "ALL PASS");
  say(JSON.stringify(report));
  return fails.length ? 1 : 0;
}

if (import.meta.main) process.exit(await main());
