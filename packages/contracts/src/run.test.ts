import { describe, expect, it } from "vitest";
import { idOf } from "./ids.ts";
import { ChooseForm, MessageAttachment, RunEvent, RunInbox } from "./run.ts";
import { AttachmentCreate, ConversationMessage, LIMITS } from "./wire.ts";

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
    const steer = { ...base, kind: "steer", source: "lesson_edit", patch, base_revision: 2 };
    expect(ConversationMessage.safeParse(steer).success).toBe(true);
    expect(ConversationMessage.safeParse({ ...steer, source: "chat" }).success).toBe(false);
    expect(ConversationMessage.safeParse({ ...base, patch, base_revision: 2 }).success).toBe(false);
    // A patch names the revision it was made on, and that revision comes only with a patch.
    const { base_revision: _, ...unanchored } = steer;
    expect(ConversationMessage.safeParse(unanchored).success).toBe(false);
    const { patch: __, ...bare } = steer;
    expect(ConversationMessage.safeParse(bare).success).toBe(false);
    expect(ConversationMessage.safeParse({ ...steer, base_revision: 0 }).success).toBe(false);
  });
});

describe("a message's page rides on a message only (dl-z5ja.107, dl-z5ja.117)", () => {
  it("parses a context on a message, and refuses it on a steer", () => {
    const base = { event_id: BASE.event_id, text: "x" };
    const context = { learner_id: "lrn_6et2fhbnwvb45aw9atcfzs33za" };
    expect(ConversationMessage.safeParse({ ...base, context }).success).toBe(true);
    expect(ConversationMessage.safeParse({ ...base, kind: "message", context }).success).toBe(true);
    const steer = ConversationMessage.safeParse({ ...base, kind: "steer", context });
    expect(steer.success).toBe(false);
    expect(steer.error?.issues[0]?.path).toEqual(["context"]);
  });

  it("names one page: a learner or a lesson, never both and never another key", () => {
    const base = { event_id: BASE.event_id, text: "x" };
    const learner_id = "lrn_6et2fhbnwvb45aw9atcfzs33za";
    const lesson_id = "les_6et2fhbnwvb45aw9atcfzs33za";
    expect(ConversationMessage.safeParse({ ...base, context: { lesson_id } }).success).toBe(true);
    for (const context of [{ learner_id, lesson_id }, { pod_id: "x" }, {}]) {
      expect(ConversationMessage.safeParse({ ...base, context }).success).toBe(false);
    }
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

describe("a message carries photos (dl-z5ja.11.1)", () => {
  const ids = Array.from({ length: 11 }, (_, i) =>
    idOf("atch_", `00000000-0000-4000-8fff-${String(i + 1).padStart(12, "0")}`),
  );
  const base = { event_id: BASE.event_id };

  it("parses a photo-only message, and refuses a message with neither words nor photos", () => {
    expect(
      ConversationMessage.safeParse({ ...base, text: "", attachment_ids: [ids[0]] }).success,
    ).toBe(true);
    expect(
      ConversationMessage.safeParse({ ...base, text: "  ", attachment_ids: [ids[0]] }).success,
    ).toBe(true);
    const empty = ConversationMessage.safeParse({ ...base, text: "  " });
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0]?.path).toEqual(["text"]);
  });

  it("refuses 11 photos, a photo named twice, an empty list and an attempt's id", () => {
    const at = (attachment_ids: unknown) =>
      ConversationMessage.safeParse({ ...base, text: "x", attachment_ids }).success;
    expect(at(ids.slice(0, LIMITS.attachmentsPerMessage))).toBe(true);
    expect(at(ids)).toBe(false);
    expect(at([ids[0], ids[0]])).toBe(false);
    expect(at([])).toBe(false);
    expect(at(["att_6et2fhbnwvb45aw9atcfzs33za"])).toBe(false);
  });

  it("refuses photos on a steer", () => {
    const steer = ConversationMessage.safeParse({
      ...base,
      kind: "steer",
      text: "x",
      attachment_ids: [ids[0]],
    });
    expect(steer.success).toBe(false);
    expect(steer.error?.issues.some((i) => i.path[0] === "attachment_ids")).toBe(true);
  });

  it("creates a JPEG with its size, within the photo limits", () => {
    const photo = { ...base, media_type: "image/jpeg", bytes: 482_113, width: 1500, height: 2000 };
    expect(AttachmentCreate.safeParse(photo).success).toBe(true);
    for (const bad of [
      { media_type: "image/png" },
      { bytes: LIMITS.attachmentBytes + 1 },
      { bytes: 0 },
      { width: LIMITS.attachmentEdgePx + 1 },
      { width: undefined },
      { storage_path: "pods/x" },
    ]) {
      expect(AttachmentCreate.safeParse({ ...photo, ...bad }).success, JSON.stringify(bad)).toBe(
        false,
      );
    }
  });

  it("creates a HEIC, a PDF and a DOCX as they are: a name, no size, up to documentBytes (wave 6)", () => {
    const docx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    for (const media_type of ["image/heic", "application/pdf", docx]) {
      const file = { ...base, media_type, bytes: LIMITS.documentBytes, name: " zeszyt " };
      const parsed = AttachmentCreate.safeParse(file);
      expect(parsed.success, media_type).toBe(true);
      expect(parsed.data?.name).toBe("zeszyt");
      expect(AttachmentCreate.safeParse({ ...file, width: 10, height: 10 }).success).toBe(false);
      expect(AttachmentCreate.safeParse({ ...file, bytes: LIMITS.documentBytes + 1 }).success).toBe(
        false,
      );
      expect(AttachmentCreate.safeParse({ ...file, name: "a".repeat(121) }).success).toBe(false);
    }
  });

  it("carries the stored photo on the message event and the inbox row", () => {
    const photo = MessageAttachment.parse({
      attachment_id: ids[0],
      storage_path: `pods/pod_x/attachments/${ids[0]}.jpg`,
      media_type: "image/jpeg",
      bytes: 482_113,
      width: 1500,
      height: 2000,
    });
    expect(parses("message", { from: "parent", text: "", attachments: [photo] })).toBe(true);
    const row = {
      run_id: BASE.run_id,
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      event_id: BASE.event_id,
      kind: "message",
      payload: { text: "", attachments: [photo] },
      status: "pending",
      created_at: BASE.created_at,
    };
    expect(RunInbox.safeParse(row).success).toBe(true);
    expect(
      parses("message", {
        from: "parent",
        text: "",
        attachments: [{ storage_path: "x", media_type: "image/jpeg" }],
      }),
    ).toBe(false);
  });
});
