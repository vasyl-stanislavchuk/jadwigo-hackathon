import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LESSON_BUILDER_PATH, LessonBuilderScreen } from "./LessonBuilderScreen.tsx";

describe("LessonBuilderScreen", () => {
  it("draws the frame with no draft", () => {
    render(<LessonBuilderScreen />);
    expect(screen.getByRole("heading", { name: "Lesson builder" })).toBeTruthy();
    expect(screen.getByText(/No draft yet/)).toBeTruthy();
    expect(LESSON_BUILDER_PATH).toBe("/playground/lesson");
  });
});
