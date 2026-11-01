import { RunWorkflow } from "@jadwigo/contracts/run";
import type { RunStore } from "@jadwigo/store";
import type { LedgerRow, MuseLedger } from "./guarded.ts";

/**
 * A Muse ledger that outlives the process (dl-z5ja.89), so a lane's cap holds across cold starts
 * and hosts. It keeps no rows of its own: every call a run makes is already logged as a
 * `model_response` event with its `cost_usd`, so `spent` reads their sum from the store
 * (`muse_ledger.spent_usd` on Postgres, which only `jadwigo_runner` may call) and `write` does
 * nothing.
 *
 * An event carries no tag, so a lane is read through its workflows: `product`, the tag
 * `product:lesson-compose` `runStep` sends, is every run workflow. A lane this map does not name
 * reads NaN, which `laneBudget` refuses: an unknown balance is no licence to spend. The window is
 * the UTC day so far, as the pod's own daily cap counts (`LIMITS.podDailyCapUsd`).
 *
 * A call that failed after it spent writes no event, so its cost is not counted here; each run's
 * own `cap_usd` still holds it per turn.
 */
export const LANE_WORKFLOWS: Readonly<Record<string, readonly RunWorkflow[]>> = {
  product: RunWorkflow.options,
};

export interface PostgresMuseLedgerOptions {
  readonly store: Pick<RunStore, "spentUsd">;
  readonly now: () => Date;
  readonly lanes?: Readonly<Record<string, readonly RunWorkflow[]>>;
}

/** The start of `now`'s UTC day, as ISO. */
function dayOf(now: Date): string {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

export class PostgresMuseLedger implements MuseLedger {
  readonly #store: Pick<RunStore, "spentUsd">;
  readonly #now: () => Date;
  readonly #lanes: Readonly<Record<string, readonly RunWorkflow[]>>;

  constructor({ store, now, lanes = LANE_WORKFLOWS }: PostgresMuseLedgerOptions) {
    this.#store = store;
    this.#now = now;
    this.#lanes = lanes;
  }

  spent(lane: string): Promise<number> {
    const workflows = Object.hasOwn(this.#lanes, lane) ? this.#lanes[lane] : undefined;
    if (workflows === undefined) return Promise.resolve(Number.NaN);
    return this.#store.spentUsd(workflows, dayOf(this.#now()));
  }

  /** The run's own `model_response` event is the row: nothing more to write. */
  write(_row: LedgerRow): Promise<void> {
    return Promise.resolve();
  }
}
