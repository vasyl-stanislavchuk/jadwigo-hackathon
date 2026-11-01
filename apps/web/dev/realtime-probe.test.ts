import { mergeLive } from "@jadwigo/core";
import { describe, expect, it } from "vitest";
import {
  claimsOf,
  deltaVerdict,
  latencyStats,
  PROBE_EMAIL,
  type ProbeRow,
  parseSecrets,
  podClaim,
  readConfig,
  seqCheck,
  topicOf,
  toRunEvent,
} from "./realtime-probe.ts";

const DEV = "devref";
const env = {
  JW_SUPABASE_URL: "https://devref.supabase.co",
  JW_SUPABASE_KEY: "publishable",
  JW_SUPABASE_SECRET_KEY: "secret",
};
const RUN = "0f8fad5b-d9cb-469f-a165-70867728950e";

function row(seq: number): ProbeRow {
  return {
    run_id: RUN,
    seq,
    event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    type: "message",
    payload: { from: "agent", text: `event ${seq}` },
    created_at: "2026-11-01T10:00:00.123456+00:00",
  };
}

describe("readConfig", () => {
  it("takes the dev project and the defaults of 4 a second for 30 s", () => {
    expect(readConfig(env, DEV)).toEqual({
      url: env.JW_SUPABASE_URL,
      publishableKey: "publishable",
      secretKey: "secret",
      rate: 4,
      seconds: 30,
    });
  });

  it("refuses any project but dev, and names what is unset", () => {
    expect(readConfig({ ...env, JW_SUPABASE_URL: "https://prodref.supabase.co" }, DEV)).toEqual({
      problems: ["JW_SUPABASE_URL is not jadwigo-dev (devref.supabase.co)"],
    });
    expect(readConfig({}, DEV)).toEqual({
      problems: [
        "JW_SUPABASE_URL is unset",
        "JW_SUPABASE_KEY is unset (the publishable key)",
        "JW_SUPABASE_SECRET_KEY is unset, and so is SUPABASE_SECRET_KEY_DEV in ~/.config/jadwigo/supabase.env",
      ],
    });
  });

  it("takes the dev secret key from the secrets file's name when the shell sets none", () => {
    const { JW_SUPABASE_SECRET_KEY: _, ...rest } = env;
    expect(readConfig({ ...rest, SUPABASE_SECRET_KEY_DEV: "from-file" }, DEV)).toMatchObject({
      secretKey: "from-file",
    });
  });

  it("refuses a delta rate past 20 a second", () => {
    expect(readConfig({ ...env, JW_PROBE_DELTA_RATE: "50" }, DEV)).toEqual({
      problems: ["JW_PROBE_DELTA_RATE is not in (0, 20]"],
    });
  });
});

describe("parseSecrets", () => {
  it("reads KEY=VALUE lines and skips comments", () => {
    const text = "# a comment\nSUPABASE_SECRET_KEY_DEV=sb_x\nexport A_B='q=1'\nnot a line\n";
    expect(parseSecrets(text)).toEqual({ SUPABASE_SECRET_KEY_DEV: "sb_x", A_B: "q=1" });
  });
});

describe("toRunEvent", () => {
  it("turns a probe row into the engine's message event, with a wire run id", () => {
    const event = toRunEvent(row(3));
    expect(event.seq).toBe(3);
    expect(event.run_id.startsWith("run_")).toBe(true);
    expect(event.created_at).toBe("2026-11-01T10:00:00.123Z");
  });

  it("feeds mergeLive: a reload's buffer and fetch give each seq after the cursor once", () => {
    const buffer = [8, 9, 12, 13].map((s) => toRunEvent(row(s)));
    const fetched = [6, 7, 8, 9, 10, 11, 12].map((s) => toRunEvent(row(s)));
    const seqs = mergeLive(buffer, fetched, 5).map((e) => e.seq);
    expect(seqs).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
    expect(seqCheck(seqs, 6, 13)).toEqual({ missing: [], duplicates: [] });
  });
});

describe("seqCheck", () => {
  it("names the gaps and the repeats", () => {
    expect(seqCheck([1, 2, 2, 5], 1, 5)).toEqual({ missing: [3, 4], duplicates: [2] });
  });
});

describe("latencyStats", () => {
  it("gives nearest-rank percentiles", () => {
    const ms = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(latencyStats(ms)).toEqual({ n: 20, p50: 10, p95: 19, max: 20 });
    expect(latencyStats([])).toEqual({ n: 0, p50: 0, p95: 0, max: 0 });
  });
});

describe("deltaVerdict", () => {
  it("counts drops and reorders, and the stream's share of each plan's limit", () => {
    const verdict = deltaVerdict({
      sent: 5,
      sendFailures: 0,
      received: [1, 2, 4, 3].map((n) => ({ n, latencyMs: 40 })),
      rate: 4,
      receivers: 1,
      payloadBytes: 120,
    });
    expect(verdict.missing).toEqual([5]);
    expect(verdict.out_of_order).toBe(1);
    expect(verdict.cost_per_second).toBe(4);
    expect(verdict.streams_that_fit).toEqual({ free: 25, pro: 125 });
  });
});

describe("the token's pod", () => {
  const token = (claims: object) =>
    `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

  it("reads the top-level claim first, then app_metadata", () => {
    expect(podClaim(claimsOf(token({ pod_id: "p1", app_metadata: { pod_id: "p2" } })))).toEqual({
      pod_id: "p1",
      from: "pod_id",
    });
    expect(podClaim(claimsOf(token({ app_metadata: { pod_id: "p2" } })))).toEqual({
      pod_id: "p2",
      from: "app_metadata.pod_id",
    });
    expect(podClaim(claimsOf(token({ sub: "x" })))).toBeNull();
  });
});

describe("names", () => {
  it("matches cleanup.sql's email pattern and the plan's topic", () => {
    expect(PROBE_EMAIL("a", "k1")).toMatch(/^realtime-probe-.+@example\.com$/);
    expect(topicOf(RUN)).toBe(`run:${RUN}`);
  });
});
