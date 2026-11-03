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
