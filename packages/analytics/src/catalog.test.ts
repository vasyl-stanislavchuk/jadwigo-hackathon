import { describe, expect, it } from "vitest";
import { CATALOG, type EventSpec } from "./catalog.ts";

/** A key that could carry a learner's or a parent's data, or an id (docs/research/posthog.md §4). */
const FORBIDDEN_KEY =
  /name|email|learner|child|parent|answer|transcript|score|school|age|token|streak|duration|attempt|^id$|_id$/;

/** The learner-data check, as a function so the test can plant a violation. */
function violations(catalog: Record<string, EventSpec>): string[] {
  const found: string[] = [];
  for (const [event, spec] of Object.entries(catalog)) {
    if (!/^[a-z]+(_[a-z]+)*$/.test(event)) found.push(`${event}: not snake_case`);
    if (spec.question.trim() === "") found.push(`${event}: no question`);
    for (const [key, prop] of Object.entries(spec.props)) {
      // A boolean named has_* or is_* carries one bit, never a name or an id.
      const flag = prop.kind === "boolean" && /^(has|is)_/.test(key);
      if (!flag && FORBIDDEN_KEY.test(key)) found.push(`${event}.${key}: a forbidden key`);
      if (prop.meaning.trim() === "") found.push(`${event}.${key}: no meaning`);
      if (prop.kind !== "boolean" && prop.kind !== "enum")
        found.push(`${event}.${key}: a free value`);
    }
  }
  return found;
}

describe("the event catalogue", () => {
  it("carries no key or value that could hold a learner's data", () => {
    expect(violations(CATALOG)).toEqual([]);
  });

  it("refuses a planted learner key and a free string", () => {
    const planted = {
      lesson_finished: {
        question: "Do lessons get finished?",
        surfaces: ["app"],
        props: {
          learner_id: { kind: "boolean", meaning: "planted" },
          child: { kind: "enum", values: ["a"], meaning: "planted" },
          note: { kind: "string", meaning: "planted" },
        },
      },
    } as unknown as Record<string, EventSpec>;
    expect(violations(planted)).toEqual([
      "lesson_finished.learner_id: a forbidden key",
      "lesson_finished.child: a forbidden key",
      "lesson_finished.note: a free value",
    ]);
  });
});
