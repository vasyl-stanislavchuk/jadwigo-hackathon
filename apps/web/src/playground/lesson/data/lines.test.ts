import { describe, expect, it } from "vitest";
import type { DraftMessage } from "../draft.ts";
import { nextDraftState } from "../LessonBuilderScreen.tsx";
import { changesSince, covers, jsonLines } from "./lines.ts";
import { originOf, originText } from "./origin.ts";

describe("jsonLines", () => {
  it("prints one line per key with its path, and hides the key and the twin's key", () => {
    const step = {
      say: "Ile?",
      question: { key: { accept: ["4"] }, help: { twin: { key: { accept: ["5"] } } } },
    };
    expect(jsonLines(step, "s").map((l) => [l.path, l.text])).toEqual([
      ["s", "{"],
      ["s.say", '"say": "Ile?",'],
      ["s.question", '"question": {'],
      ["s.question.key", '"key": {'],
      ["s.question.key.accept", '"accept": ['],
      ["s.question.key.accept[0]", '"4"'],
      ["s.question.key.accept", "]"],
      ["s.question.key", "},"],
      ["s.question.help", '"help": {'],
      ["s.question.help.twin", '"twin": {'],
      ["s.question.help.twin.key", '"key": {'],
      ["s.question.help.twin.key.accept", '"accept": ['],
      ["s.question.help.twin.key.accept[0]", '"5"'],
      ["s.question.help.twin.key.accept", "]"],
      ["s.question.help.twin.key", "}"],
      ["s.question.help.twin", "}"],
      ["s.question.help", "}"],
      ["s.question", "}"],
      ["s", "}"],
    ]);
    const hidden = jsonLines(step, "s", true).filter((l) => /\.key/.test(l.path));
    expect(hidden.map((l) => l.path)).toEqual(["s.question.key", "s.question.help.twin.key"]);
    expect(hidden.every((l) => l.text.includes("hidden"))).toBe(true);
  });
});

describe("changesSince and covers", () => {
  it("names the leaves added or changed, and the ones removed", () => {
    const { changed, removed } = changesSince(
      { say: "a", data: { n: 1, m: 2 } },
      { say: "b", data: { n: 1, k: 3 } },
      "s",
    );
    expect([...changed].sort()).toEqual(["s.data.k", "s.say"]);
    expect(removed).toEqual(["s.data.m"]);
  });

  it("holds a path to the path it is, or one inside it", () => {
    expect(covers("s.help", "s.help.look")).toBe(true);
    expect(covers("s.help", "s.help")).toBe(true);
    expect(covers("s.data.items", "s.data.items[0]")).toBe(true);
    expect(covers("s.help", "s.helpful")).toBe(false);
  });
});

describe("originOf", () => {
  it("tells a bank copy from the agent's adaptation and its own writing", () => {
    expect(originText(originOf({ question: "bank:times.pl#k1", changes: [] }))).toBe(
      "copied whole from bank:times.pl#k1",
    );
    expect(
      originOf({
        question: "bank:times.pl#k1",
        changes: [{ change: "numbers" }, { change: "numbers" }, { change: "context" }],
      }),
    ).toEqual({ kind: "adapted", from: "bank:times.pl#k1", changes: ["numbers", "context"] });
    expect(originOf(null)).toEqual({ kind: "written" });
    expect(originOf({ question: "authored:x", changes: [] }).kind).toBe("authored");
  });
});

describe("nextDraftState", () => {
  const msg = (draft_id: string, draft: unknown): DraftMessage => ({
    dir: "/d",
    drafts: [],
    draft_id,
    draft,
    check: null,
    render: null,
    publish: null,
    error: null,
  });

  it("keeps the draft before a change, keeps it over an unchanged resend, and drops it on a pick", () => {
    let state = nextDraftState({ message: null, previous: null }, msg("x", { v: 1 }));
    expect(state.previous).toBeNull();
    state = nextDraftState(state, msg("x", { v: 2 }));
    expect(state.previous).toEqual({ v: 1 });
    state = nextDraftState(state, msg("x", { v: 2 }));
    expect(state.previous).toEqual({ v: 1 });
    state = nextDraftState(state, msg("y", { v: 9 }));
    expect(state.previous).toBeNull();
  });
});
