import { RunStepInput } from "@jadwigo/contracts/run";
import type { HostReport } from "./host.ts";

/**
 * How the host is invoked (dl-z5ja.20). Both callers only wake it; the queue is what it works from:
 *
 * - `apps/api`, right after its unit commits a `pgmq.send`, invokes the `live` alias
 *   asynchronously (`InvocationType: "Event"`) with the `RunStepInput` it sent. The host drains the
 *   queue, that step and any other visible one.
 * - An EventBridge schedule every minute, with `{}`: the safety net for a lost invoke, and what
 *   drains the steps the 30 s pg_cron sweep enqueues for runs past a deadline.
 *
 * A Lambda async invoke is not retried (the module sets 0 retries): a lost or failed one costs
 * nothing, since the step stays in `agent_step` until a drain archives it. The event is either
 * a `RunStepInput` or `{}`; anything else drains too, and is logged as poked by nobody.
 */

/** One log line per invoke: ids, counts and outcomes, never a message, a payload or a name. */
export function createRunnerHandler(
  host: () => Promise<HostReport>,
  log: (line: string) => void,
): (event: unknown) => Promise<HostReport> {
  return async (event) => {
    const poke = RunStepInput.safeParse(event);
    const report = await host();
    log(
      JSON.stringify({
        runner: "drained",
        poked: poke.success ? poke.data.run_id : null,
        cold: report.cold,
        steps: report.steps,
        outcomes: report.outcomes,
        events: report.events,
        wall_ms: report.wall_ms,
        cpu_ms: report.cpu_ms,
        oldest_ready_step_age_s: report.stuck?.oldest_ready_step_age_s ?? null,
        runs_past_deadline: report.stuck?.runs_past_deadline.length ?? 0,
      }),
    );
    return report;
  };
}
