import { AssignmentId, ID_PREFIXES, idOf, PodId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { InMemoryStore } from "./memory.ts";
import { seed, storeContract } from "./store.contract.ts";

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

  it("lists open assignments made at the same instant in id order", async () => {
    const store = new InMemoryStore({ now: () => new Date("2026-10-27T09:00:00.000Z") });
    const a = await seed(store);
    const ids = ["c", "a", "b"].map((n) =>
      AssignmentId.parse(idOf(ID_PREFIXES.assignment, `0000000${n}-0000-4000-8000-000000000000`)),
    );
    for (const id of ids) {
      await store.putAssignment(a.pod, {
        audience: "anyone",
        identity: "none",
        lesson_id: a.lesson,
        id,
      });
    }
    const open = (await store.listOpenAssignments(a.pod)).map((o) => o.assignment.id);
    expect(open).toEqual([a.assignment, ...ids].sort());
  });
});
