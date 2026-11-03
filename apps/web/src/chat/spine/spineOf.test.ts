import { RunEvent } from "@jadwigo/contracts/run";
import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { cardStateOf, spineOf } from "./spineOf.ts";
import type { TurnSpine } from "./types.ts";

// Step 0's stub (dl-uukj.47.71.1): the shape holds for every golden log. Lane A replaces these.
describe("spineOf (step 0 stub)", () => {
  it.each(RUN_LOGS.map((log) => [log.name, log] as const))("%s gives a spine", (_name, log) => {
    const events = log.events.map((e) => RunEvent.parse(e));
    const spine: TurnSpine = spineOf(events, null, 0);
    expect(spine.phase).toBe("done");
    expect(spine.stepCount).toBe(events.filter((e) => e.type === "tool_call").length);
    expect(cardStateOf(events)).toBeNull();
  });
});
