import { parseLessonFileLenient } from "@jadwigo/lesson-import/file";
import { describe, expect, it } from "vitest";
import { lessonFileToSpecs } from "../lesson/adapter.ts";
import { playgroundRoute } from "../route.ts";
import { CONFORMANCE_PATH } from "./ConformanceScreen.tsx";
import { itemsOf, lessonFileOf, plays, setIdOf } from "./items.ts";

// Made-up items in the conversion's shape: no bank item is ever in git (AGENTS.md fence 8).
const ENTER = {
  id: "item-enter",
  exercise: "made-up-exercise",
  problem_type: "Made up",
  spec: {
    family: "enter",
    question_type: "production",
    say: "Pomnóż.",
    data: { entry: "keypad", input: "number", figure: { kind: "expression", text: "4 × 3 =" } },
    key: { accept: ["12"] },
  },
};
const UNKNOWN_TYPE = {
  ...ENTER,
  id: "item-unknown",
  spec: { ...ENTER.spec, question_type: "nope" },
};
const WAITING = {
  id: "item-waiting",
  exercise: "made-up-exercise",
  spec: null,
  status: { kind: "waiting" },
};

describe("the conformance page's items", () => {
  it("is the playground's conformance page", () => {
    expect(playgroundRoute(CONFORMANCE_PATH)?.page).toBe("conformance");
  });

  it("reads the items that play, and names the set each serves", () => {
    const items = itemsOf({ items: [ENTER, WAITING, { no: "id" }] });
    expect(items.map((i) => i.id)).toEqual(["item-enter", "item-waiting"]);
    expect(items.filter(plays).map((i) => i.id)).toEqual(["item-enter"]);
    expect(setIdOf(ENTER)).toBe("set_khan_made-up-exercise");
    expect(setIdOf({ id: "x" })).toBeNull();
  });

  it("draws an item as a draft step, and leaves one it cannot read out with the reason", () => {
    const { file, skipped } = parseLessonFileLenient(lessonFileOf([ENTER, UNKNOWN_TYPE]));
    const steps = lessonFileToSpecs(file, "", skipped).flatMap((p) => p.steps);
    expect(steps.map((s) => [s.kind, s.step_id])).toEqual([
      ["question", "item-enter"],
      ["skipped", "item-unknown"],
    ]);
    const drawn = steps[0];
    expect(drawn?.kind === "question" ? drawn.spec.say : null).toBe("Pomnóż.");
  });
});
