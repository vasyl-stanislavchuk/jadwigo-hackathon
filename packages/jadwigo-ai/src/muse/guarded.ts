import type { ModelUsage, RunId } from "@jadwigo/contracts/run";
import type { MuseClient, MuseRequest, MuseResponse } from "./client.ts";

/**
 * The half of `jw.muse.ask` (`apps/cli/src/jw/muse.py`) that holds for every `MuseClient`, the
 * transport aside: a call carries a `<lane>:<what>` tag and a `prompt_cache_key`, the lane's
 * spend is checked before the call, and each call writes one ledger row that carries its `run_id`
 * (Lead decisions 10 and 14: the run id is the trace). Wave 1 wraps `ScriptedMuse` in it;
 * `HttpMuse` (dl-z5ja.18) goes inside it too, with the TypeScript port of `jw.pii.guard`, which
 * is what replaces `request.names` before a prompt leaves. Until then the names pass through.
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

/** A refused call: no tag, no cache key, or a lane at its cap. Nothing was sent or spent. */
export class MuseRefused extends Error {
  constructor(
    readonly type: "untagged" | "no-cache-key" | "budget",
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
    const lane = laneOf(request.tag);
    const spent = await this.options.ledger.spent(lane);
    // An unknown balance is no licence to spend (`ff23c1ce7af`): NaN refuses too.
    if (!(spent < this.options.lane_cap_usd)) {
      throw new MuseRefused(
        "budget",
        `lane ${lane} has spent ${spent} USD of its ${this.options.lane_cap_usd} USD cap`,
      );
    }
    const response = await this.inner.respond(request);
    await this.options.ledger.write({
      run_id: request.run_id,
      call_no: request.call_no,
      tag: request.tag,
      response_id: response.response_id,
      usage: response.usage,
      cost_usd: response.cost_usd,
      at: this.options.now().toISOString(),
    });
    return response;
  }
}
