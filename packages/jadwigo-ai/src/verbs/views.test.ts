import { ToolView } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { contextFor, runId } from "../testing/context.ts";
import { createVerbs, fixtureBank } from "./index.ts";

/**
 * Every verb answers a view typed for its widget (`dl-z5ja.69`), which the chat pane draws from
 * the tool result. The kind is the verb's name, and each view parses as the contract's ToolView.
 */

const DRAFT = { request: "a short lesson", grade: "1", names: [], topic: "addition" };

async function drafted() {
  const verbs = createVerbs({ bank: fixtureBank() });
  const run = runId();
  const effect = await verbs.lesson_draft.run(contextFor(run, "call_1"), DRAFT);
  const lesson_file = effect.lesson_file ?? {};
  return { verbs, run, effect, lesson_file, revision: { revision: 1, lesson_file } };
}

describe("each verb's view", () => {
  it("lesson_draft names every step it drew", async () => {
    const { effect } = await drafted();
    expect(ToolView.parse(effect.view)).toEqual({
      kind: "lesson_draft",
      data: { changed_step_ids: ["s01", "s02", "s03", "s04", "s05", "s06"] },
    });
  });

  it("lesson_edit names the step it changed, and none for a no-op", async () => {
    const { verbs, run, revision } = await drafted();
    const patch = { say: "Ile to razem?" };
    const edit = { draft_id: run, names: [], step_id: "s03", patch, why: "the parent asked" };
    const effect = await verbs.lesson_edit.run(contextFor(run, "call_2", revision), edit);
    expect(ToolView.parse(effect.view)).toEqual({
      kind: "lesson_edit",
      data: { changed_step_ids: ["s03"] },
    });
    const next = { revision: 2, lesson_file: effect.lesson_file ?? {} };
    const again = await verbs.lesson_edit.run(contextFor(run, "call_3", next), edit);
    expect(again.view?.data).toEqual({ changed_step_ids: [] });
  });

  it("lesson_check answers its findings and whether the lesson can be published", async () => {
    const { verbs, run, revision } = await drafted();
    const effect = await verbs.lesson_check.run(contextFor(run, "call_2", revision), {
      draft_id: run,
      names: [],
      help: {},
    });
    expect(ToolView.parse(effect.view)).toEqual({
      kind: "lesson_check",
      data: { publishable: true, findings: [] },
    });
  });

  it("lesson_show answers the lesson as it stands", async () => {
    const { verbs, run, revision, lesson_file } = await drafted();
    const effect = await verbs.lesson_show.run(contextFor(run, "call_2", revision), {
      draft_id: run,
    });
    expect(ToolView.parse(effect.view)).toEqual({
      kind: "lesson_show",
      data: { lesson: lesson_file },
    });
  });

  it("question_search answers the sets it found", async () => {
    const verbs = createVerbs({ bank: fixtureBank() });
    const effect = await verbs.question_search.run(contextFor(runId(), "call_1"), {
      grade: "1",
      words: "dodawanie",
    });
    const view = ToolView.parse(effect.view);
    expect(view.kind).toBe("question_search");
    expect(view.data).toEqual({ sets: effect.output["sets"] });
    expect((view.data["sets"] as unknown[]).length).toBeGreaterThan(0);
  });
});
