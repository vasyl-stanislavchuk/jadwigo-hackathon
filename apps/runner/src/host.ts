import type { RunStepOutput } from "@jadwigo/contracts/run";
import { drain, type EngineDeps, type FailedStep } from "@jadwigo/jadwigo-ai";

/**
 * The step host (dl-z5ja.20): a thin wrapper around `drain` from `@jadwigo/jadwigo-ai`. Each
 * invocation reads the visible `agent_step` messages and runs each step, then answers what it did
 * and what it cost, in wall clock and CPU. The engine decides everything else: the due-run path,
 * the attempt fence, redelivery and the dead letter all live in `runStep` and `drain`.
 *
 * The probe (dl-z5ja.5) runs it on both hosts with a scripted model, so the numbers compare.
 */

/** Milliseconds, from the host's own clocks. CPU is null where the runtime cannot say. */
export interface Meter {
  wall(): number;
  cpu(): number | null;
}

/**
 * Node's clocks. Deno 2.1, the Edge runtime's, has `process.cpuUsage` but answers zeros with a
 * "Not implemented" warning, so on Deno CPU is null and the owner reads it from the function's logs.
 */
const processMeter: Meter = {
  wall: () => performance.now(),
  cpu: () => {
    if ("Deno" in globalThis) return null;
    if (typeof process === "undefined" || typeof process.cpuUsage !== "function") return null;
    const used = process.cpuUsage();
    return (used.user + used.system) / 1000;
  },
};

/** What the stuck-run alarm reads, as `PgmqRunQueue.stuck()` answers it. */
export interface Stuck {
  oldest_ready_step_age_s: number | null;
  runs_past_deadline: readonly { pod: string; run_id: string }[];
}

/** A step that waits this long with no consumer, or a run past its deadline, is logged. */
export const STUCK_AFTER_S = 60;

export interface HostDeps {
  engine: EngineDeps;
  /** The most steps one invocation runs; the queue keeps the rest for the next. */
  max_steps: number;
  /** The queue's stuck-run read, when the queue has one. */
  stuck?: () => Promise<Stuck>;
  /** How many steps sit in the dead-letter queue, when the queue can say. */
  dead_letters?: () => Promise<number>;
  /** Where a stuck queue is reported. Ids only: never a message, a name or a payload. */
  warn: (line: string) => void;
}

export interface HostReport {
  /** True for the first invocation in this process or isolate. */
  cold: boolean;
  /** When this process or isolate loaded the host's module, in ms since it started. */
  loaded_ms: number;
  steps: number;
  outcomes: readonly RunStepOutput["outcome"][];
  events: number;
  /** This invocation's wall clock and CPU, the connection's open included on a cold one. */
  wall_ms: number;
  cpu_ms: number | null;
  stuck: Stuck | null;
  /** Steps that threw in this invoke: they stay queued, and come back after their visibility. */
  failed: readonly FailedStep[];
  dead_letters: number | null;
}

const LOADED_MS = performance.now();

/**
 * The handler both hosts call. `open` builds the deps once per process (a cold start opens the
 * pools, and its time is counted in that invocation's wall clock); a failed open is tried again
 * on the next invocation.
 */
export function createHost(
  open: () => Promise<HostDeps>,
  meter: Meter = processMeter,
): () => Promise<HostReport> {
  let deps: Promise<HostDeps> | undefined;
  let cold = true;
  return async () => {
    const wall0 = meter.wall();
    const cpu0 = meter.cpu();
    const wasCold = cold;
    cold = false;
    deps ??= open();
    let host: HostDeps;
    try {
      host = await deps;
    } catch (error) {
      deps = undefined;
      throw error;
    }
    const failed: FailedStep[] = [];
    const outputs = await drain(host.engine, {
      max_steps: host.max_steps,
      onError: (error, step) => {
        failed.push(step);
        host.warn(failure(error, step));
      },
    });
    const stuck = host.stuck ? await host.stuck() : null;
    if (stuck) reportStuck(stuck, host.warn);
    const dead_letters = host.dead_letters ? await host.dead_letters() : null;
    if (dead_letters) host.warn(`agent_step_dlq: ${dead_letters} steps dead-lettered`);
    const cpu1 = meter.cpu();
    return {
      cold: wasCold,
      loaded_ms: Math.round(LOADED_MS),
      steps: outputs.length,
      outcomes: outputs.map((o) => o.outcome),
      events: outputs.reduce((sum, o) => sum + o.events, 0),
      wall_ms: Math.round(meter.wall() - wall0),
      cpu_ms: cpu0 === null || cpu1 === null ? null : Math.round(cpu1 - cpu0),
      stuck,
      failed,
      dead_letters,
    };
  };
}

function reportStuck(stuck: Stuck, warn: (line: string) => void): void {
  const age = stuck.oldest_ready_step_age_s;
  if (age !== null && age >= STUCK_AFTER_S) {
    warn(`agent_step: the oldest ready step has waited ${Math.round(age)} s`);
  }
  if (stuck.runs_past_deadline.length > 0) {
    const ids = stuck.runs_past_deadline.map((r) => r.run_id).join(", ");
    warn(`agent_step: ${stuck.runs_past_deadline.length} runs past their deadline: ${ids}`);
  }
}

/**
 * A thrown step by its ids and the error's name, with its `type` when it has one (`MuseRefused`,
 * `StoreError`): never its message, which may quote a prompt, a row or a URL.
 */
function failure(error: unknown, step: FailedStep): string {
  const name = error instanceof Error ? error.name : typeof error;
  const type =
    typeof error === "object" && error !== null && "type" in error && typeof error.type === "string"
      ? ` (${error.type})`
      : "";
  return `agent_step: step for ${step.run_id} attempt ${step.attempt} (msg ${step.msg_id}, read ${step.read_ct}) threw ${name}${type}`;
}
