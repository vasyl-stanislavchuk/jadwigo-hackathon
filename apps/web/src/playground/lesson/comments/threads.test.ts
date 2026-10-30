import { describe, expect, it } from "vitest";
import { type AsksPayload, askState, threadsFor, turnLine } from "./threads.ts";

const reply = (kind: "progress" | "done" | "question" | "note") => ({
  ts: `2026-10-30T09:00:0${kind.length}.000Z`,
  draft_id: "d1",
  in_reply_to: "a",
  kind,
  text: kind,
});

describe("askState", () => {
  it("follows the newest reply that is not a note", () => {
    expect(askState(false, [])).toBe("sent");
    expect(askState(true, [])).toBe("delivered");
    expect(askState(true, [reply("progress")])).toBe("working");
    expect(askState(true, [reply("progress"), reply("question")])).toBe("needs_you");
    expect(askState(true, [reply("question"), reply("done"), reply("note")])).toBe("done");
    expect(askState(false, [reply("note")])).toBe("delivered");
  });
});

describe("threadsFor", () => {
  const ask = (ts: string, step: string) => ({
    ask_ts: ts,
    draft_id: "d1",
    step_id: step,
    intent: "change" as const,
    text: `about ${step}`,
    author: "owner",
  });
  const payload: AsksPayload = {
    channel: "live",
    newest_draft: "d1",
    asks: [
      ask("2026-10-30T09:00:00.000Z", "q1"),
      ask("2026-10-30T09:00:03.000Z", "q3"),
      ask("2026-10-30T09:00:06.000Z", "q2"),
      { ...ask("2026-10-30T09:00:01.000Z", "q2"), draft_id: "d0" },
    ],
    consumed: ["2026-10-30T09:00:00.000Z"],
    replies: [],
  };

  it("counts the draft's open comments sent before this one, on any step", () => {
    const [thread] = threadsFor(payload, "d1", "q2");
    expect(thread?.ahead).toBe(2);
    expect(thread && turnLine(thread, "live").text).toBe(
      "Waiting for Claude to pick it up · 2 ahead of yours",
    );
  });

  it("never says Claude has a comment the session cannot hear", () => {
    const [thread] = threadsFor(payload, "d1", "q3");
    expect(thread && turnLine(thread, "not_loaded").text).toContain(
      "Claude did not see your comment",
    );
    const [delivered] = threadsFor(payload, "d1", "q1");
    expect(delivered && turnLine(delivered, "gone").text).toBe(
      "Claude stopped without answering. Comment again to nudge it.",
    );
  });
});
