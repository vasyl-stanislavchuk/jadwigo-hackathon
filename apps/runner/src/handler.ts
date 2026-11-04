import { RunStepInput } from "@jadwigo/contracts/run";
import { type HostReport, wordless } from "./host.ts";

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
  report: (error: unknown) => Promise<void> = () => Promise.resolve(),
): (event: unknown) => Promise<HostReport> {
  return async (event) => {
    const poke = RunStepInput.safeParse(event);
    let drained: HostReport;
    try {
      drained = await host();
    } catch (error) {
      // The host could not open or drain: the Lambda still fails, as the Errors alarm expects.
      await report(wordless(error));
      throw error;
    }
    log(
      JSON.stringify({
        runner: "drained",
        poked: poke.success ? poke.data.run_id : null,
        cold: drained.cold,
        steps: drained.steps,
        outcomes: drained.outcomes,
        events: drained.events,
        wall_ms: drained.wall_ms,
        cpu_ms: drained.cpu_ms,
        oldest_ready_step_age_s: drained.stuck?.oldest_ready_step_age_s ?? null,
        runs_past_deadline: drained.stuck?.runs_past_deadline.length ?? 0,
        failed: drained.failed.map((f) => f.run_id),
        dead_letters: drained.dead_letters,
        max_wait_s: drained.max_wait_s,
        runs: drained.runs,
        refused: drained.refused,
      }),
    );
    return drained;
  };
}
