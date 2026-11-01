import { describe, expect, it } from "vitest";
import { museApiKey, museSettings } from "../config.ts";
import { requestFor, runId } from "../testing/context.ts";
import { GuardedMuse, InMemoryMuseLedger, laneBudget } from "./guarded.ts";
import { CONTRIBUTOR_MODEL, HttpMuse, type LiveText } from "./http.ts";

/**
 * The one live call (dl-z5ja.18 acceptance), on the contributor tier with a prompt that carries
 * no learner data. It spends, so only the owner runs it, with a small cap and the key sourced
 * from `jw.muse`'s key file (it exports META_API_KEY), so the key is never typed or on argv:
 *
 *   . ~/.config/jadwigo-bank/muse.env && JADWIGO_MUSE_CAP_USD=0.05 bunx vitest run \
 *     --config vitest.config.ts --project integration packages/jadwigo-ai/src/muse/http.int.test.ts
 *
 * Without META_API_KEY it is skipped, so CI never calls the model. It prints the latency and the
 * USD for the bead's notes.
 */
describe.skipIf(museApiKey() === null)("HttpMuse against the live endpoint", () => {
  it("answers a one-line maths prompt, streamed, with usage and a ledger row", async () => {
    const settings = museSettings();
    const ledger = new InMemoryMuseLedger();
    const live: LiveText[] = [];
    const http = new HttpMuse({
      fetch: (url, init) => fetch(url, init),
      api_key: settings.api_key,
      models: { contributor: CONTRIBUTOR_MODEL, private: null },
      budget: laneBudget(ledger, settings.lane_cap_usd),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      now: () => new Date(),
      live: (t) => live.push(t),
      max_output_tokens: 400,
    });
    const muse = new GuardedMuse(http, {
      ledger,
      lane_cap_usd: settings.lane_cap_usd,
      now: () => new Date(),
    });
    const started = performance.now();
    const r = await muse.respond({
      ...requestFor(runId(), 1, "probe:http-muse"),
      tier: "contributor",
      prompt_cache_key: "jadwigo-http-muse-int:v1",
      instructions: "Answer in one short sentence.",
      input: [{ type: "message", role: "user", text: "What is 7 times 8?" }],
    });
    const seconds = (performance.now() - started) / 1000;
    process.stdout.write(
      `HttpMuse live: ${seconds.toFixed(1)} s, ${r.cost_usd} USD, ${JSON.stringify(r.usage)}\n`,
    );
    expect(r.text ?? "").toContain("56");
    expect(r.usage.input_tokens).toBeGreaterThan(0);
    expect(live.map((l) => l.text).join("")).toBe(r.text);
    expect(ledger.rows).toHaveLength(1);
  }, 120_000);
});
