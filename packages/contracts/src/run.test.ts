import { describe, expect, it } from "vitest";
import { ChooseForm, RunEvent, RunInbox } from "./run.ts";
import { ConversationMessage } from "./wire.ts";

/** Run contract v2 (dl-z5ja.50): the model tier on every model call, and the UX seams' shapes. */

const BASE = {
  run_id: "run_00000000000000000000000001",
  seq: 1,
  event_id: "00000000-0000-4000-8fff-000000000001",
  created_at: "2026-09-01T08:00:01.000Z",
};

const RESPONSE = {
  response_id: "resp_1",
  call_no: 1,
  text: "Ready.",
  tool_calls: [],
  usage: { input_tokens: 10, output_tokens: 2, cached_tokens: 0 },
  cost_usd: 0.01,
  model: "scripted",
  tier: "private",
};

function parses(type: string, payload: unknown): boolean {
  return RunEvent.safeParse({ ...BASE, type, payload }).success;
}

describe("model_response proves which tier saw the call", () => {
  it("parses with its model and tier", () => {
    expect(parses("model_response", RESPONSE)).toBe(true);
    expect(parses("model_response", { ...RESPONSE, tier: "contributor" })).toBe(true);
  });

  it("fails without a tier, with an unknown tier, or without a model", () => {
    const { tier: _tier, ...noTier } = RESPONSE;
    const { model: _model, ...noModel } = RESPONSE;
    expect(parses("model_response", noTier)).toBe(false);
    expect(parses("model_response", { ...RESPONSE, tier: "public" })).toBe(false);
    expect(parses("model_response", noModel)).toBe(false);
    expect(parses("model_response", { ...RESPONSE, model: "" })).toBe(false);
  });
});

describe("the UX seams", () => {
  const question = {
    text: "How many questions?",
    options: [{ label: "5", recommended: true }, { label: "8" }],
    custom_allowed: true,
    skippable: true,
  };

  it("a choose form asks 1 or 2 questions of 2 to 4 options, the recommended one first", () => {
    expect(ChooseForm.safeParse({ questions: [question] }).success).toBe(true);
    expect(ChooseForm.safeParse({ questions: [question, question] }).success).toBe(true);
    expect(ChooseForm.safeParse({ questions: [] }).success).toBe(false);
    expect(ChooseForm.safeParse({ questions: [question, question, question] }).success).toBe(false);
    const one = { ...question, options: [{ label: "5" }] };
    expect(ChooseForm.safeParse({ questions: [one] }).success).toBe(false);
    const five = { ...question, options: ["1", "2", "3", "4", "5"].map((label) => ({ label })) };
    expect(ChooseForm.safeParse({ questions: [five] }).success).toBe(false);
    const late = { ...question, options: [{ label: "5" }, { label: "8", recommended: true }] };
    expect(ChooseForm.safeParse({ questions: [late] }).success).toBe(false);
    const none = { ...question, options: [{ label: "5" }, { label: "8", recommended: false }] };
    expect(ChooseForm.safeParse({ questions: [none] }).success).toBe(true);
  });

  it("an approval carries its form, and its resolution the feedback and answers", () => {
    const asked = { call_id: "call_1", verb: "lesson_edit", summary: "Shorter." };
    expect(parses("approval_request", { ...asked, choose: { questions: [question] } })).toBe(true);
    expect(parses("approval_request", { ...asked, choose: { questions: [] } })).toBe(false);
    const resolved = { call_id: "call_1", decision: "rejected", feedback: "Keep it.", answers: [] };
    expect(parses("approval_resolved", resolved)).toBe(true);
  });

  it("a tool result's view names a known kind; a message's citations reuse Citation", () => {
    const result = { call_id: "call_1", verb: "lesson_check", output: {}, error: null };
    const view = { kind: "lesson_check", data: {} };
    expect(parses("tool_result", { ...result, view })).toBe(true);
    expect(parses("tool_result", { ...result, view: { kind: "chart", data: {} } })).toBe(false);
    const said = { from: "agent", text: "Carrying is the hard part." };
    const skill = { kind: "skill", skill_code: "math.add.within-20" };
    expect(parses("message", { ...said, citations: [skill] })).toBe(true);
    expect(parses("message", { ...said, citations: [{ kind: "rumour" }] })).toBe(false);
  });

  it("a plan lists its entries, each with a status", () => {
    const entries = [
      { text: "Find questions", status: "done" },
      { text: "Check the lesson", status: "in_progress" },
    ];
    expect(parses("plan", { entries })).toBe(true);
    expect(parses("plan", { entries: [{ text: "Find questions", status: "maybe" }] })).toBe(false);
  });
});

describe("a parent's patch rides on a lesson_edit steer (dl-z5ja.76)", () => {
  it("parses on the steer event and the inbox, and only as an object", () => {
    const patch = { title: { en: "Mine" }, notes: null };
    expect(parses("steer", { text: "x", source: "lesson_edit", patch })).toBe(true);
    expect(parses("steer", { text: "x", source: "lesson_edit", patch: ["a"] })).toBe(false);
    expect(parses("steer", { text: "x", source: "lesson_edit", patch: null })).toBe(false);
    const row = {
      run_id: BASE.run_id,
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      event_id: BASE.event_id,
      status: "pending",
      created_at: BASE.created_at,
      kind: "steer",
    };
    const payload = { text: "x", source: "lesson_edit", patch };
    expect(RunInbox.safeParse({ ...row, payload }).success).toBe(true);
  });

  it("comes on the wire only with a lesson_edit steer", () => {
    const base = { event_id: BASE.event_id, text: "x" };
    const patch = { title: { en: "Mine" } };
    const steer = { ...base, kind: "steer", source: "lesson_edit", patch };
    expect(ConversationMessage.safeParse(steer).success).toBe(true);
    expect(ConversationMessage.safeParse({ ...steer, source: "chat" }).success).toBe(false);
    expect(ConversationMessage.safeParse({ ...base, patch }).success).toBe(false);
  });
});

describe("a steer is logged (dl-z5ja.51)", () => {
  it("parses from the chat, and from a lesson edit naming its questions", () => {
    expect(parses("steer", { text: "Shorter, please.", source: "chat" })).toBe(true);
    expect(
      parses("steer", {
        text: "I changed question 2.",
        source: "lesson_edit",
        question_ids: ["s02"],
      }),
    ).toBe(true);
  });

  it("fails without a source, with an unknown one, or with an empty question list", () => {
    expect(parses("steer", { text: "Shorter, please." })).toBe(false);
    expect(parses("steer", { text: "Shorter, please.", source: "email" })).toBe(false);
    expect(parses("steer", { text: "x", source: "lesson_edit", question_ids: [] })).toBe(false);
  });

  it("the inbox's steer takes a source and question ids, and still parses with neither", () => {
    const row = {
      run_id: BASE.run_id,
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      event_id: BASE.event_id,
      status: "pending",
      created_at: BASE.created_at,
      kind: "steer",
    };
    expect(RunInbox.safeParse({ ...row, payload: { text: "Shorter." } }).success).toBe(true);
    const edit = { text: "I changed question 2.", source: "lesson_edit", question_ids: ["s02"] };
    expect(RunInbox.safeParse({ ...row, payload: edit }).success).toBe(true);
    expect(RunInbox.safeParse({ ...row, payload: { text: "x", source: "sms" } }).success).toBe(
      false,
    );
  });
});
