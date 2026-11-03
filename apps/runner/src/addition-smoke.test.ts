import { describe, expect, it } from "vitest";
import { additionWithinTen } from "./addition-smoke.ts";

function lesson(text = "3 + 2 = ?", answer = "5") {
  return {
    script: {
      parts: [
        {
          steps: Array.from({ length: 5 }, () => ({
            based_on: {
              question: "bank:xmadeup",
              changes: [{ change: "numbers", why: "sum at most ten" }],
            },
            question: {
              family: "enter",
              data: { input: "number", figure: { kind: "expression", text } },
              key: { accept: [answer] },
            },
          })),
        },
      ],
    },
  };
}

describe("addition smoke acceptance", () => {
  it("accepts adapted bank questions with correct arithmetic", () => {
    expect(additionWithinTen(lesson())).toEqual([]);
  });
  it.each([
    ["36+1=", "37"],
    ["3+2=", "37"],
    ["3-2=", "1"],
  ])("refuses wrong range, old keys and other operations: %s", (text, key) => {
    expect(additionWithinTen(lesson(text, key))).not.toEqual([]);
  });
  it("does not mistake a missing lesson for success", () => {
    expect(additionWithinTen(undefined)).not.toEqual([]);
  });
});

describe("adaptation consistency beyond the main answer", () => {
  it("refuses stale worked solutions, invalid twins, and missing reasons", () => {
    const file = lesson();
    for (const step of file.script.parts[0]?.steps ?? []) {
      Object.assign(step.question, { help: { worked: ["7 + 1 = 8"] } });
    }
    expect(additionWithinTen(file)).toContain(
      "question 1: worked solution ends with another question's answer",
    );
    const twinFile = lesson();
    for (const step of twinFile.script.parts[0]?.steps ?? []) {
      Object.assign(step.question, {
        help: {
          twin: {
            data: { input: "number", figure: { kind: "expression", text: "4+1=?" } },
            key: { accept: ["37"] },
          },
        },
      });
      step.based_on.changes[0] = { change: "numbers", why: "" };
    }
    expect(additionWithinTen(twinFile)).toContain("question 1: adaptation reason is missing");
    expect(additionWithinTen(twinFile)).toContain(
      "question 1: displayed data/key is not addition within 10",
    );
  });
  it("accepts addition slots and refuses wording-only relabeling of subtraction", () => {
    const file = {
      script: {
        parts: [
          {
            steps: Array.from({ length: 5 }, () => ({
              say: "Dodawanie",
              based_on: { question: "bank:xmadeup", changes: [] },
              question: {
                family: "slots",
                data: {
                  gaps: [{ id: "g1", kind: "enter", input: "number" }],
                  table: { rows: [["3 + {g1} = 5"]] },
                },
                key: { gaps: { g1: { kind: "enter", accept: ["2"] } } },
              },
            })),
          },
        ],
      },
    };
    expect(additionWithinTen(file)).toEqual([]);
    const step = file.script.parts[0]?.steps[0];
    if (step) step.question.data.table.rows = [["5 - {g1} = 3"]];
    expect(additionWithinTen(file)).toContain(
      "question 1: displayed data/key is not addition within 10",
    );
  });
});
