import type { ModelUsage, RunId } from "@jadwigo/contracts/run";
import { type MuseClient, MuseFailed, type MuseRequest, type MuseResponse } from "./client.ts";

/**
 * The half of `jw.muse.ask` (`apps/cli/src/jw/muse.py`) that holds for every `MuseClient`, the
 * transport aside: a call carries a `<lane>:<what>` tag and a `prompt_cache_key`, the lane's
 * spend is checked before the call, and each call writes one ledger row that carries its `run_id`
 * (Lead decisions 10 and 14: the run id is the trace). Wave 1 wraps `ScriptedMuse` in it;
 * `HttpMuse` (dl-z5ja.18) goes inside it too. The tier's guard is the transport's: `HttpMuse`
 * passes a `contributor` call through the `jw.pii.guard` port (`tiers.ts`) before it leaves.
 * A call that failed after it spent still writes its row, with an empty `response_id`.
 */

/** One call as the ledger keeps it: `jw.muse`'s row, with the run that made it. */
export interface LedgerRow {
  run_id: RunId;
  call_no: number;
  tag: string;
  response_id: string;
  usage: ModelUsage;
  cost_usd: number;
  at: string;
}

export interface MuseLedger {
  /** USD spent so far by one lane, the tag's first `:` segment. */
  spent(lane: string): Promise<number>;
  write(row: LedgerRow): Promise<void>;
}

/**
 * A refused call: no tag, no cache key, a lane at its cap, or a tier the transport has no model
 * for. Nothing was sent or spent.
 */
export class MuseRefused extends Error {
  constructor(
    readonly type: "untagged" | "no-cache-key" | "budget" | "tier",
    message: string,
  ) {
    super(message);
    this.name = "MuseRefused";
  }
}

const TAG = /^[a-z0-9-]+:[a-z0-9-]+$/;

/** The lane a tag belongs to, as `jw.muse.lane_of` reads it: `product:lesson-compose` is `product`. */
export function laneOf(tag: string): string {
  return tag.split(":", 1)[0] ?? "";
}

export class InMemoryMuseLedger implements MuseLedger {
  readonly rows: LedgerRow[] = [];

  spent(lane: string): Promise<number> {
    const total = this.rows
      .filter((r) => laneOf(r.tag) === lane)
      .reduce((sum, r) => sum + r.cost_usd, 0);
    return Promise.resolve(total);
  }

  write(row: LedgerRow): Promise<void> {
    this.rows.push(row);
    return Promise.resolve();
  }
}

export interface GuardOptions {
  ledger: MuseLedger;
  /** The lane's cap in USD; a call is refused once the ledger holds this much for the lane. */
  lane_cap_usd: number;
  now: () => Date;
}

export class GuardedMuse implements MuseClient {
  constructor(
    readonly inner: MuseClient,
    readonly options: GuardOptions,
  ) {}

  async respond(request: MuseRequest): Promise<MuseResponse> {
    if (!TAG.test(request.tag)) {
      throw new MuseRefused(
        "untagged",
        `a Muse call needs a <lane>:<what> tag, not "${request.tag}"`,
      );
    }
    if (request.prompt_cache_key === "") {
      throw new MuseRefused(
        "no-cache-key",
        "a Muse call needs a prompt_cache_key stable per workflow",
      );
    }
    await laneBudget(this.options.ledger, this.options.lane_cap_usd)(request.tag, 0);
    let response: MuseResponse;
    try {
      response = await this.inner.respond(request);
    } catch (error) {
      if (error instanceof MuseFailed && error.spent_usd > 0) {
        await this.#write(request, "", error.usage, error.spent_usd);
      }
      throw error;
    }
    await this.#write(request, response.response_id, response.usage, response.cost_usd);
    return response;
  }

  #write(request: MuseRequest, response_id: string, usage: ModelUsage, cost_usd: number) {
    return this.options.ledger.write({
      run_id: request.run_id,
      call_no: request.call_no,
      tag: request.tag,
      response_id,
      usage,
      cost_usd,
      at: this.options.now().toISOString(),
    });
  }
}

/**
 * The check `jw.muse.check_budget` makes, before a call and again before each retry: the lane's
 * spend, plus what this call's failed attempts already cost (`pending_usd`), must be under its cap.
 */
export type BudgetCheck = (tag: string, pending_usd: number) => Promise<void>;

export function laneBudget(ledger: MuseLedger, lane_cap_usd: number): BudgetCheck {
  return async (tag, pending_usd) => {
    const lane = laneOf(tag);
    const spent = (await ledger.spent(lane)) + pending_usd;
    // An unknown balance is no licence to spend (`ff23c1ce7af`): NaN refuses too.
    if (!(spent < lane_cap_usd)) {
      throw new MuseRefused(
        "budget",
        `lane ${lane} has spent ${spent} USD of its ${lane_cap_usd} USD cap`,
      );
    }
  };
}
