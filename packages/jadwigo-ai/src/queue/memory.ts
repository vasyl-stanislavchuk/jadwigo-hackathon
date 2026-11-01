import type { RunStepInput } from "@jadwigo/contracts/run";
import { MAX_READS, type QueuedStep, type RunQueue } from "./types.ts";

/**
 * `RunQueue` in memory, on the clock it is given, for the dev page and the tests. It keeps pgmq's
 * rules: a step is visible once its `vt` is at or before now, a read hides it for `vt_s` and counts
 * it, oldest `msg_id` first, and a read past `MAX_READS` moves it to the dead letter.
 */
export class InMemoryRunQueue implements RunQueue {
  #next = 1;
  readonly #queued = new Map<number, QueuedStep>();
  readonly #dead: QueuedStep[] = [];

  constructor(readonly now: () => Date) {}

  send(message: RunStepInput, delay_s = 0): Promise<number> {
    const now = this.now();
    const msg_id = this.#next++;
    this.#queued.set(msg_id, {
      msg_id,
      read_ct: 0,
      enqueued_at: now.toISOString(),
      vt: new Date(now.getTime() + delay_s * 1000).toISOString(),
      message: { ...message },
    });
    return Promise.resolve(msg_id);
  }

  read(vt_s: number, qty: number): Promise<readonly QueuedStep[]> {
    const now = this.now().getTime();
    const read: QueuedStep[] = [];
    // A Map iterates in insertion order, which is `msg_id` order.
    for (const step of this.#queued.values()) {
      if (read.length >= qty) break;
      if (Date.parse(step.vt) > now) continue;
      const counted = {
        ...step,
        read_ct: step.read_ct + 1,
        vt: new Date(now + vt_s * 1000).toISOString(),
      };
      if (counted.read_ct > MAX_READS) {
        this.#queued.delete(step.msg_id);
        this.#dead.push(counted);
        continue;
      }
      this.#queued.set(step.msg_id, counted);
      read.push({ ...counted, message: { ...counted.message } });
    }
    return Promise.resolve(read);
  }

  archive(msg_id: number): Promise<void> {
    this.#queued.delete(msg_id);
    return Promise.resolve();
  }

  deadLetters(): Promise<readonly QueuedStep[]> {
    return Promise.resolve(this.#dead.map((step) => ({ ...step, message: { ...step.message } })));
  }
}
