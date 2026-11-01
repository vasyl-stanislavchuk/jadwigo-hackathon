import { type ModelTier, type ModelUsage, type ToolCall, VerbName } from "@jadwigo/contracts/run";
import {
  type MuseClient,
  MuseFailed,
  type MuseInput,
  type MuseRequest,
  type MuseResponse,
} from "./client.ts";
import type { BudgetCheck } from "./guarded.ts";
import type { PromptGuard } from "./pii.ts";
import { mapStrings, outbound } from "./tiers.ts";

/**
 * `MuseClient` over Meta's `POST /v1/responses` (dl-z5ja.18), the transport half of `jw.muse.ask`
 * (`apps/cli/src/jw/muse.py`) for the hosted engine. The endpoint and the body are the ones
 * `jadwigo-bank/experiments/direct_api` measured: `Bearer` key, `stream: true`, `store: false`, a
 * stable `prompt_cache_key`, `reasoning.effort`, and the usage in `response.completed`.
 *
 * - **Tier routing.** `request.tier` picks the model. `contributor` goes to the contributor
 *   model. `private` goes to `models.private` once it is named and priced, and to the contributor
 *   model until then: a learner's data may reach any Meta model (owner decision of 2026-11-01,
 *   bead dl-uafq). The response names the model that answered.
 * - **The name guard is optional.** Only a call whose tag lane is in `guard_lanes` (`bank` by
 *   default) passes the `jw.pii.guard` port, and its answer is restored (`tiers.ts`). A learner
 *   call goes with its names as they are, on either tier.
 * - **Streaming.** Text deltas reach `live` batched, every `batch_ms` or `batch_chars`, restored
 *   on a guarded call with a hold-back for half a placeholder.
 * - **Retry,** as `jw.muse.ask`: 3 attempts, the budget checked before each with what failed
 *   attempts already cost, a longer backoff on a 429, and no retry once text reached `live`,
 *   since the page would show it twice. A 4xx other than 429 is not retried: the request itself
 *   was refused, and it costs nothing to fail.
 * - **Cost** from `prices`, per model. The contributor model without a price is refused at
 *   construction, and an unpriced private model is not used: a spend the cap cannot see is no
 *   spend at all.
 *
 * Its `fetch`, clock and sleep come in as dependencies, so unit tests run on recorded streams.
 * Wrap it in `GuardedMuse` for the tag, cache-key and ledger rules.
 */

const MUSE_BASE_URL = "https://api.meta.ai/v1";
export const CONTRIBUTOR_MODEL = "muse-spark-1.3-contributor";

/** USD per 1M tokens. The contributor's is `jw.muse.PRICES` (its model card, 2026-10-28). */
export interface Price {
  input: number;
  cached: number;
  output: number;
}
const PRICES: Readonly<Record<string, Price>> = {
  [CONTRIBUTOR_MODEL]: { input: 0.1, cached: 0.002, output: 0.2 },
};

/** Text for the page's live channel: one batch of the answer's deltas. */
export interface LiveText {
  run_id: MuseRequest["run_id"];
  call_no: number;
  text: string;
}

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface HttpMuseOptions {
  fetch: Fetch;
  api_key: string;
  /** The model per tier. `private` is null until the owner names one; the contributor serves it. */
  models: { contributor: string; private: string | null };
  /** The tag lanes whose calls pass the name guard; `bank` by default. */
  guard_lanes?: readonly string[];
  /** Checked before every attempt, as `laneBudget(ledger, cap)` builds it. */
  budget: BudgetCheck;
  sleep: (ms: number) => Promise<void>;
  now: () => Date;
  live?: (text: LiveText) => void;
  base_url?: string;
  prices?: Readonly<Record<string, Price>>;
  attempts?: number;
  batch_ms?: number;
  batch_chars?: number;
  effort?: "low" | "medium" | "high";
  max_output_tokens?: number;
}

/** A failed attempt: why, what it cost, whether another may follow, and whether it was a 429. */
class Attempt extends Error {
  constructor(
    message: string,
    readonly usage: ModelUsage,
    readonly retry: boolean,
    readonly rate_limited = false,
  ) {
    super(message);
  }
}

/** One attempt's live channel: deltas in, batches out, and whether any batch went out. */
interface Live {
  emitted: boolean;
  push(delta: string): void;
  end(): void;
}

const NO_USAGE: ModelUsage = { input_tokens: 0, output_tokens: 0, cached_tokens: 0 };

export class HttpMuse implements MuseClient {
  readonly #o: HttpMuseOptions;
  readonly #prices: Readonly<Record<string, Price>>;

  constructor(options: HttpMuseOptions) {
    if (options.api_key === "") throw new Error("HttpMuse needs the Meta API key from config");
    this.#o = options;
    this.#prices = options.prices ?? PRICES;
    const { contributor } = options.models;
    if (this.#prices[contributor] === undefined) {
      throw new Error(
        `HttpMuse has no price for ${contributor}: add it to PRICES before calling it`,
      );
    }
  }

  async respond(request: MuseRequest): Promise<MuseResponse> {
    const model = this.#modelFor(request.tier);
    const { request: sent, guard } = outbound(request, this.#o.guard_lanes);
    const attempts = this.#o.attempts ?? 3;
    let spent = 0;
    let usage = NO_USAGE;
    let last = "";
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await this.#o.budget(request.tag, spent);
      const live = this.#liveFor(request, guard);
      try {
        const response = await this.#attempt(model, sent, guard, live);
        return {
          ...response,
          tier: this.#tierOf(model),
          usage: add(usage, response.usage),
          cost_usd: round6(spent + response.cost_usd),
        };
      } catch (error) {
        if (!(error instanceof Attempt)) throw error;
        usage = add(usage, error.usage);
        spent = round6(spent + this.#cost(model, error.usage));
        last = error.message;
        // The page has text from this attempt; a retry would show it twice.
        if (!error.retry || live.emitted || attempt === attempts - 1) break;
        await this.#o.sleep((error.rate_limited ? 15_000 : 2_000) * (attempt + 1));
      }
    }
    throw new MuseFailed(last, spent, usage, this.#tierOf(model));
  }

  /** The tier `model` serves: the contributor model is `contributor`, any other `private`. */
  #tierOf(model: string): ModelTier {
    return model === this.#o.models.contributor ? "contributor" : "private";
  }

  #modelFor(tier: ModelTier): string {
    const { contributor, private: named } = this.#o.models;
    if (tier === "private" && named !== null && this.#prices[named] !== undefined) return named;
    return contributor;
  }

  #cost(model: string, u: ModelUsage): number {
    const p = this.#prices[model];
    if (p === undefined) return Number.NaN;
    const fresh = u.input_tokens - u.cached_tokens;
    return round6(
      (fresh * p.input + u.cached_tokens * p.cached + u.output_tokens * p.output) / 1e6,
    );
  }

  #liveFor(request: MuseRequest, guard: PromptGuard | null): Live {
    const sink = this.#o.live;
    const batchMs = this.#o.batch_ms ?? 250;
    const batchChars = this.#o.batch_chars ?? 400;
    const restorer = guard?.restoreStream() ?? null;
    let buffer = "";
    let since = this.#o.now().getTime();
    const state = {
      emitted: false,
      flush: () => {
        if (sink === undefined || buffer === "") return;
        sink({ run_id: request.run_id, call_no: request.call_no, text: buffer });
        buffer = "";
        state.emitted = true;
        since = this.#o.now().getTime();
      },
      push: (delta: string) => {
        if (sink === undefined) return;
        buffer += restorer ? restorer.push(delta) : delta;
        if (buffer.length >= batchChars || this.#o.now().getTime() - since >= batchMs) {
          state.flush();
        }
      },
      end: () => {
        if (restorer) buffer += restorer.flush();
        state.flush();
      },
    };
    return state;
  }

  async #attempt(
    model: string,
    request: MuseRequest,
    guard: PromptGuard | null,
    live: Live,
  ): Promise<MuseResponse> {
    let res: Response;
    try {
      res = await this.#o.fetch(`${this.#o.base_url ?? MUSE_BASE_URL}/responses`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.#o.api_key}`,
          "content-type": "application/json",
          accept: "text/event-stream",
        },
        body: JSON.stringify(bodyFor(model, request, this.#o)),
      });
    } catch (error) {
      throw new Attempt(`unreachable: ${(error as Error).message}`, NO_USAGE, true);
    }
    if (!res.ok || res.body === null) {
      const text = (await res.text().catch(() => "")).slice(0, 300);
      const limited = res.status === 429;
      const retry = limited || res.status >= 500 || res.ok;
      throw new Attempt(`http ${res.status}: ${text}`, NO_USAGE, retry, limited);
    }
    let text = "";
    let done: Record<string, unknown> | null = null;
    let failed = "";
    const items: Record<string, unknown>[] = [];
    for await (const event of sse(res.body)) {
      const type = event["type"];
      if (type === "response.output_text.delta" && typeof event["delta"] === "string") {
        text += event["delta"];
        live.push(event["delta"]);
      } else if (type === "response.output_item.done" && isObject(event["item"])) {
        items.push(event["item"]);
      } else if (type === "response.completed") {
        done = isObject(event["response"]) ? event["response"] : {};
      } else if (type === "response.failed" || type === "response.incomplete") {
        const r = isObject(event["response"]) ? event["response"] : {};
        throw new Attempt(`${type}: ${reasonOf(r)}`, usageOf(r), true, rateLimited(reasonOf(r)));
      } else if (type === "error") {
        failed = JSON.stringify(event).slice(0, 300);
      }
    }
    if (done === null) {
      throw new Attempt(failed || "the stream ended with no response.completed", NO_USAGE, true);
    }
    live.end();
    const output = Array.isArray(done["output"]) ? done["output"].filter(isObject) : items;
    if (text === "") text = outputText(output);
    const usage = usageOf(done);
    const restoreText = (s: string) => (guard ? guard.restore(s) : s);
    const calls = toolCalls(output.length > 0 ? output : items, restoreText);
    if (typeof calls === "string") throw new Attempt(calls, usage, false);
    return {
      response_id: typeof done["id"] === "string" ? done["id"] : "",
      model: typeof done["model"] === "string" ? done["model"] : model,
      text: text === "" ? null : restoreText(text),
      tool_calls: calls,
      usage,
      cost_usd: this.#cost(model, usage),
    };
  }
}

// ---------------------------------------------------------------- the wire ---

function bodyFor(model: string, request: MuseRequest, o: HttpMuseOptions): Record<string, unknown> {
  return {
    model,
    instructions: request.instructions,
    input: request.input.map(inputItem),
    tools: request.tools.map((t) => ({
      type: "function",
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
    stream: true,
    store: false,
    prompt_cache_key: request.prompt_cache_key,
    reasoning: { effort: o.effort ?? "low" },
    max_output_tokens: o.max_output_tokens ?? 4000,
  };
}

function inputItem(item: MuseInput): Record<string, unknown> {
  switch (item.type) {
    case "message":
      return { type: "message", role: item.role, content: item.text };
    case "function_call":
      return {
        type: "function_call",
        call_id: item.call_id,
        name: item.verb,
        arguments: JSON.stringify(item.arguments),
      };
    case "function_call_output":
      return {
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(item.output),
      };
  }
}

/** The `data:` records of a server-sent event stream, as JSON objects. */
async function* sse(body: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>> {
  const decoder = new TextDecoder();
  let pending = "";
  let event = "";
  const reader = body.getReader();
  const lineOut = (line: string): Record<string, unknown> | null => {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      return null;
    }
    if (!line.startsWith("data:")) return null;
    try {
      const data: unknown = JSON.parse(line.slice(5));
      if (!isObject(data)) return null;
      return { type: event, ...data };
    } catch {
      return null;
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    pending += done ? decoder.decode() : decoder.decode(value, { stream: true });
    const lines = pending.split("\n");
    pending = done ? "" : (lines.pop() ?? "");
    for (const raw of lines) {
      const record = lineOut(raw.replace(/\r$/, ""));
      if (record !== null) yield record;
    }
    if (done) return;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

function usageOf(response: Record<string, unknown>): ModelUsage {
  const u = isObject(response["usage"]) ? response["usage"] : {};
  const details = isObject(u["input_tokens_details"]) ? u["input_tokens_details"] : {};
  return {
    input_tokens: num(u["input_tokens"]),
    output_tokens: num(u["output_tokens"]),
    cached_tokens: num(details["cached_tokens"]),
  };
}

function reasonOf(response: Record<string, unknown>): string {
  const e = response["error"] ?? response["incomplete_details"];
  return (isObject(e) ? JSON.stringify(e) : String(e ?? "no reason")).slice(0, 300);
}

const rateLimited = (text: string): boolean => /429|rate.?limit|too many requests/i.test(text);

function outputText(output: readonly Record<string, unknown>[]): string {
  const parts: string[] = [];
  for (const item of output) {
    if (item["type"] !== "message" || !Array.isArray(item["content"])) continue;
    for (const part of item["content"]) {
      if (isObject(part) && part["type"] === "output_text" && typeof part["text"] === "string") {
        parts.push(part["text"]);
      }
    }
  }
  return parts.join("");
}

/** The function calls in a completed response, or why one cannot be run (not retried). */
function toolCalls(
  output: readonly Record<string, unknown>[],
  restore: (s: string) => string,
): ToolCall[] | string {
  const calls: ToolCall[] = [];
  for (const item of output) {
    if (item["type"] !== "function_call") continue;
    const verb = VerbName.safeParse(item["name"]);
    if (!verb.success) return `the model called a tool that is not a verb: ${String(item["name"])}`;
    let input: unknown;
    try {
      input = JSON.parse(typeof item["arguments"] === "string" ? item["arguments"] : "{}");
    } catch {
      input = null;
    }
    if (!isObject(input)) return `the arguments of ${verb.data} are not a JSON object`;
    calls.push({
      call_id: String(item["call_id"] ?? ""),
      verb: verb.data,
      input: mapStrings(input, restore),
    });
  }
  return calls;
}

function add(a: ModelUsage, b: ModelUsage): ModelUsage {
  return {
    input_tokens: a.input_tokens + b.input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    cached_tokens: a.cached_tokens + b.cached_tokens,
  };
}

const round6 = (n: number): number => Math.round(n * 1e6) / 1e6;
