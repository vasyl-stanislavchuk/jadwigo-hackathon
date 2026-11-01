import type { RunStepInput } from "@jadwigo/contracts/run";

/**
 * The step queue, shaped like pgmq's `agent_step` (Lead decision 10): send, read with a visibility
 * timeout, archive, and a dead letter after `MAX_READS`. Wave 1 runs `InMemoryRunQueue`
 * (`memory.ts`, the runner lane dl-z5ja.16); `PgmqRunQueue` is dl-z5ja.19.
 */

/** How long a read step stays invisible before it is delivered again, in seconds. */
export const STEP_VISIBILITY_S = 60;
/** A step read more often than this is moved to the dead letter instead of delivered again. */
export const MAX_READS = 3;

export interface QueuedStep {
  msg_id: number;
  /** How many times it has been read, this read included: 1 on the first delivery. */
  read_ct: number;
  enqueued_at: string;
  /** When it becomes visible again if nobody archives it. */
  vt: string;
  message: RunStepInput;
}

export interface RunQueue {
  /** Enqueues a step, visible after `delay_s`. Answers its `msg_id`. */
  send(message: RunStepInput, delay_s?: number): Promise<number>;
  /** Up to `qty` visible steps, each hidden for `vt_s` and its `read_ct` counted. */
  read(vt_s: number, qty: number): Promise<readonly QueuedStep[]>;
  /** Done with a step: it is never delivered again. */
  archive(msg_id: number): Promise<void>;
  /** The steps read more than `MAX_READS` times, which no read delivers again. */
  deadLetters(): Promise<readonly QueuedStep[]>;
}
