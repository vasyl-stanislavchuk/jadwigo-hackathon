import { ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { InMemoryStore } from "./memory.ts";
import { storeContract } from "./store.contract.ts";

storeContract("InMemoryStore", () => new InMemoryStore());

describe("InMemoryStore", () => {
  it("stamps records with the clock it is given", async () => {
    const store = new InMemoryStore({ now: () => new Date("2026-10-27T09:00:00.000Z") });
    const pod = await store.putPod({
      id: PodId.parse(idOf(ID_PREFIXES.pod, crypto.randomUUID())),
      name: "Pod of foxes",
      language: "pl",
    });
    expect(pod.created_at).toBe("2026-10-27T09:00:00.000Z");
  });
});
