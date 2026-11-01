import type { RunStepInput } from "@jadwigo/contracts/run";
import type { QueuedStep, RunQueue } from "./types.ts";

const WAITS = "InMemoryRunQueue waits on dl-z5ja.16 (the runner lane)";

/** `RunQueue` in memory, on the clock it is given, for the dev page and the tests. */
export class InMemoryRunQueue implements RunQueue {
  constructor(readonly now: () => Date) {}

  send(_message: RunStepInput, _delay_s?: number): Promise<number> {
    return Promise.reject(new Error(WAITS));
  }
  read(_vt_s: number, _qty: number): Promise<readonly QueuedStep[]> {
    return Promise.reject(new Error(WAITS));
  }
  archive(_msg_id: number): Promise<void> {
    return Promise.reject(new Error(WAITS));
  }
  deadLetters(): Promise<readonly QueuedStep[]> {
    return Promise.reject(new Error(WAITS));
  }
}
