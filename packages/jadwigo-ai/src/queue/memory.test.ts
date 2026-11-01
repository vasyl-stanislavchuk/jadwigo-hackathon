import { FIXED_NOW } from "@jadwigo/testing";
import { runQueueContract } from "./contract.ts";
import { InMemoryRunQueue } from "./memory.ts";

runQueueContract("InMemoryRunQueue", () => {
  let clock = FIXED_NOW.getTime();
  return {
    q: new InMemoryRunQueue(() => new Date(clock)),
    tick: (s: number) => {
      clock += s * 1000;
    },
  };
});
