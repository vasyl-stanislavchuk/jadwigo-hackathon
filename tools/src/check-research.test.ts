import { describe, expect, it } from "vitest";
import { checkNote } from "./check-research.ts";

const outcome = (o: object) =>
  `# Q?\n\n## What this means for jadwigo\n\nx\n\n\`\`\`json jadwigo-outcome\n${JSON.stringify(o, null, 2)}\n\`\`\`\n`;

const good = {
  issue: "dl-x.1",
  question: "Which?",
  answer: "This one.",
  status: "answered",
  sources: ["https://example.com/paper"],
  owner_decisions: [{ question: "A or B?", options: ["A", "B"] }],
  proposed_issues: [
    { title: "Do it", scope: "s", done_when: "d", depends_on: [], labels: ["project:x"] },
  ],
  page_changes: [],
};

describe("checkNote", () => {
  it("passes a complete outcome", () => {
    expect(checkNote(outcome(good), "dl-x.1")).toEqual([]);
  });

  it("fails a note with no outcome block", () => {
    expect(checkNote("# Q?\n\n## What this means for jadwigo\n")).toEqual([
      "expected one json jadwigo-outcome block, found 0",
    ]);
  });

  it("fails a pick, one option, no web source, a wrong issue and a missing heading", () => {
    const bad = {
      ...good,
      sources: ["docs/x.md"],
      owner_decisions: [{ question: "A?", options: ["A"], recommended: "A" }],
    };
    const errors = checkNote(outcome(bad).replace("## What this means for jadwigo", ""), "dl-y.2");
    expect(errors).toEqual([
      'missing heading "## What this means for jadwigo"',
      "issue: expected dl-y.2, found dl-x.1",
      "sources: a list of links, at least one http(s)",
      "owner_decisions[0].options: at least two",
      "owner_decisions[0]: product questions stay with the owner; options, not a pick",
    ]);
  });
});
