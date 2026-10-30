import { describe, expect, it } from "vitest";
import { type Finding, worstLevel } from "./findings.ts";

const finding = (level: Finding["level"]): Finding => ({
  step_id: "q1",
  path: "script.parts[0].steps[0].question.help.boost",
  level,
  rule: "empty-rung",
  text: "boost is empty",
  fix: "write the boost card in the lesson's language",
});

describe("worstLevel", () => {
  it("is null with nothing found, warn over none, error over warn", () => {
    expect(worstLevel([])).toBeNull();
    expect(worstLevel([finding("warn")])).toBe("warn");
    expect(worstLevel([finding("warn"), finding("error"), finding("warn")])).toBe("error");
  });
});
