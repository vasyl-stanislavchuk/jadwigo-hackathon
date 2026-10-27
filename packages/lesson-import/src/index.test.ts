import { describe, expect, it } from "vitest";
import { LESSON_IMPORT_ISSUE } from "./index.ts";

describe("lesson-import", () => {
  it("is a scaffold until its issue lands", () => {
    expect(LESSON_IMPORT_ISSUE).toBe("dl-e8ov.2.32.5");
  });
});
