import { describe, expect, it } from "vitest";
import { playgroundRoute } from "../route.ts";
import { LESSON_BUILDER_PATH } from "./LessonBuilderScreen.tsx";

describe("the lesson builder's route", () => {
  it("is the playground's lesson page", () => {
    expect(playgroundRoute(LESSON_BUILDER_PATH)).toEqual({
      family: null,
      question_type: null,
      example: null,
      page: "lesson",
    });
    expect(playgroundRoute("/playground/lesson/")?.page).toBe("lesson");
    expect(playgroundRoute("/playground/lesson/x")).toBeNull();
  });
});
