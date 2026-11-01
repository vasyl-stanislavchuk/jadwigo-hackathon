import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import { ScriptedMuse } from "./scripted.ts";

describe("ScriptedMuse", () => {
  it("answers one reply per call in order, counting call ids across the script", async () => {
    const run = runId();
    const muse = new ScriptedMuse([
      { tool_calls: [{ verb: "lesson_draft", input: { topic: "addition" } }], cost_usd: 0.02 },
      {
        tool_calls: [
          { verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) },
          { verb: "lesson_show", input: { draft_id: "x" } },
        ],
      },
      { text: "Ready." },
    ]);
    const first = await muse.respond(requestFor(run, 1));
    const second = await muse.respond(requestFor(run, 2));
    const third = await muse.respond(requestFor(run, 3));

    expect([first, second, third].map((r) => r.response_id)).toEqual([
      "resp_1",
      "resp_2",
      "resp_3",
    ]);
    expect(first.tool_calls).toEqual([
      { call_id: "call_1", verb: "lesson_draft", input: { topic: "addition" } },
    ]);
    expect(second.tool_calls.map((c) => c.call_id)).toEqual(["call_2", "call_3"]);
    expect(second.tool_calls[0]?.input).toEqual({ draft_id: run, help: {} });
    expect(third).toMatchObject({ text: "Ready.", tool_calls: [] });
    expect([first.cost_usd, second.cost_usd, third.cost_usd]).toEqual([0.02, 0, 0]);
    expect(first.text).toBeNull();
    expect(muse.calls.map((c) => c.call_no)).toEqual([1, 2, 3]);
  });

  it("makes up the same usage for the same request", async () => {
    const run = runId();
    const a = await new ScriptedMuse([{ text: "Hi." }]).respond(requestFor(run, 1));
    const b = await new ScriptedMuse([{ text: "Hi." }]).respond(requestFor(run, 1));
    expect(a.usage).toEqual(b.usage);
    expect(a.usage.input_tokens).toBeGreaterThan(0);
  });

  it("throws past the script's end, and still records the call", async () => {
    const muse = new ScriptedMuse([{ text: "Only one." }]);
    const run = runId();
    await muse.respond(requestFor(run, 1));
    await expect(muse.respond(requestFor(run, 2))).rejects.toThrow(/1 replies/);
    expect(muse.calls).toHaveLength(2);
  });
});
