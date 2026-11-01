import { RUN_LOGS } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { changedSteps } from "./revisions.ts";

/** The happy turn's 2 lesson files, revision 1 and revision 2. */
function revisions(): unknown[] {
  const log = RUN_LOGS.find((l) => l.name === "happy-turn");
  return (log?.events ?? []).flatMap((e) => {
    const event = e as { type: string; payload: { lesson_file?: unknown } };
    return event.type === "lesson_revision" ? [event.payload.lesson_file] : [];
  });
}

function withSay(file: unknown, id: string, say: string): unknown {
  const copy = structuredClone(file) as {
    script: { parts: { steps: { id: string; say?: unknown }[] }[] };
  };
  for (const part of copy.script.parts)
    for (const step of part.steps) if (step.id === id) step.say = { pl: say };
  return copy;
}

describe("changedSteps (dl-z5ja.30)", () => {
  it("highlights nothing for the first lesson the pane draws", () => {
    const [first] = revisions();
    expect([...changedSteps(null, first)]).toEqual([]);
  });

  it("names only the step whose content changed", () => {
    const [, second] = revisions();
    const edited = withSay(second, "s03", "Ile jest grup?");
    expect([...changedSteps(second, edited)]).toEqual(["s03"]);
    expect([...changedSteps(second, structuredClone(second))]).toEqual([]);
  });

  it("names a step the revision adds", () => {
    const [, second] = revisions();
    const added = structuredClone(second) as { script: { parts: { steps: unknown[] }[] } };
    added.script.parts[0]?.steps.push({ id: "s09", say: { pl: "Nowy krok" } });
    expect([...changedSteps(second, added)]).toEqual(["s09"]);
  });
});
