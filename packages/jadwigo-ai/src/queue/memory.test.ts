import { ID_PREFIXES, idOf } from "@jadwigo/contracts";
import { RunId } from "@jadwigo/contracts/run";
import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { InMemoryRunQueue } from "./memory.ts";
import { MAX_READS } from "./types.ts";

const RUN = RunId.parse(idOf(ID_PREFIXES.run, crypto.randomUUID()));

function queue() {
  let clock = FIXED_NOW.getTime();
  return {
    q: new InMemoryRunQueue(() => new Date(clock)),
    tick: (s: number) => {
      clock += s * 1000;
    },
  };
}

describe("InMemoryRunQueue", () => {
  it("delivers oldest first, hides a read step for its visibility timeout and counts each read", async () => {
    const { q, tick } = queue();
    const a = await q.send({ run_id: RUN, attempt: 1 });
    const b = await q.send({ run_id: RUN, attempt: 2 });
    expect((await q.read(60, 1)).map((s) => [s.msg_id, s.read_ct])).toEqual([[a, 1]]);
    expect((await q.read(60, 5)).map((s) => s.msg_id)).toEqual([b]);
    expect(await q.read(60, 5)).toEqual([]);
    tick(59);
    expect(await q.read(60, 5)).toEqual([]);
    tick(1);
    expect((await q.read(60, 5)).map((s) => [s.msg_id, s.read_ct])).toEqual([
      [a, 2],
      [b, 2],
    ]);
  });

  it("never delivers an archived step, and holds a delayed one back", async () => {
    const { q, tick } = queue();
    const a = await q.send({ run_id: RUN, attempt: 1 });
    await q.archive(a);
    await q.archive(a);
    const later = await q.send({ run_id: RUN, attempt: 1 }, 30);
    expect(await q.read(60, 5)).toEqual([]);
    tick(30);
    expect((await q.read(60, 5)).map((s) => s.msg_id)).toEqual([later]);
  });

  it("moves a step read more than MAX_READS times to the dead letter", async () => {
    const { q, tick } = queue();
    const a = await q.send({ run_id: RUN, attempt: 1 });
    for (let i = 1; i <= MAX_READS; i++) {
      expect((await q.read(10, 1)).map((s) => s.read_ct)).toEqual([i]);
      tick(10);
    }
    expect(await q.read(10, 1)).toEqual([]);
    expect((await q.deadLetters()).map((s) => [s.msg_id, s.read_ct])).toEqual([[a, MAX_READS + 1]]);
    tick(100);
    expect(await q.read(10, 1)).toEqual([]);
  });
});
