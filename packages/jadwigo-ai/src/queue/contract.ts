import { ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { MAX_READS, type RunQueue } from "./types.ts";

/** A fresh, empty queue, and the way to move its clock on by `s` seconds for every step. */
export interface QueueUnderTest {
  q: RunQueue;
  tick(s: number): void | Promise<void>;
}

/**
 * The rules every `RunQueue` keeps (dl-z5ja.56): `InMemoryRunQueue` in `memory.test.ts`, which ticks
 * its clock, and `PgmqRunQueue` in `pgmq.int.test.ts`, which moves every step's `vt` and
 * `enqueued_at` back. pgmq reads the real clock, so a visibility timeout is checked 5 seconds short
 * of its end rather than 1.
 */
export function runQueueContract(
  name: string,
  make: () => Promise<QueueUnderTest> | QueueUnderTest,
): void {
  const run = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));

  describe(`${name} keeps the run queue contract`, () => {
    it("delivers oldest first, hides a read step for its visibility timeout and counts each read", async () => {
      const { q, tick } = await make();
      const a = await q.send({ run_id: run, attempt: 1 });
      const b = await q.send({ run_id: run, attempt: 2 });
      expect((await q.read(60, 1)).map((s) => [s.msg_id, s.read_ct])).toEqual([[a, 1]]);
      expect((await q.read(60, 5)).map((s) => s.msg_id)).toEqual([b]);
      expect(await q.read(60, 5)).toEqual([]);
      await tick(55);
      expect(await q.read(60, 5)).toEqual([]);
      await tick(5);
      expect((await q.read(60, 5)).map((s) => [s.msg_id, s.read_ct])).toEqual([
        [a, 2],
        [b, 2],
      ]);
    });

    it("never delivers an archived step, and holds a delayed one back", async () => {
      const { q, tick } = await make();
      const a = await q.send({ run_id: run, attempt: 1 });
      await q.archive(a);
      await q.archive(a);
      const later = await q.send({ run_id: run, attempt: 1 }, 30);
      expect(await q.read(60, 5)).toEqual([]);
      await tick(30);
      expect((await q.read(60, 5)).map((s) => s.msg_id)).toEqual([later]);
    });

    it("moves a step read more than MAX_READS times to the dead letter", async () => {
      const { q, tick } = await make();
      const a = await q.send({ run_id: run, attempt: 1 });
      for (let i = 1; i <= MAX_READS; i++) {
        expect((await q.read(10, 1)).map((s) => s.read_ct)).toEqual([i]);
        await tick(10);
      }
      expect(await q.read(10, 1)).toEqual([]);
      expect((await q.deadLetters()).map((s) => [s.msg_id, s.read_ct, s.message])).toEqual([
        [a, MAX_READS + 1, { run_id: run, attempt: 1 }],
      ]);
      await tick(100);
      expect(await q.read(10, 1)).toEqual([]);
    });

    it("delivers a step at most once per read, past a dead letter, with no visibility timeout", async () => {
      const { q } = await make();
      const a = await q.send({ run_id: run, attempt: 1 });
      for (let i = 1; i <= MAX_READS; i++) await q.read(0, 1);
      const b = await q.send({ run_id: run, attempt: 2 });
      // a is read a 4th time and dead-lettered, which leaves a place in the batch; b fills it once.
      expect((await q.read(0, 2)).map((s) => [s.msg_id, s.read_ct])).toEqual([[b, 1]]);
      expect((await q.deadLetters()).map((s) => s.msg_id)).toEqual([a]);
      expect((await q.read(0, 5)).map((s) => [s.msg_id, s.read_ct])).toEqual([[b, 2]]);
    });
  });
}
