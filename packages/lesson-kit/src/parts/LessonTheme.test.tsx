/**
 * LessonTheme sets the lesson register (dl-uukj.32.22): a lesson drawn inside a parent's page, such
 * as a try on the attempt page, keeps the lesson's controls rather than the page's adult ones.
 */

import { Button, Page } from "@jadwigo/ui";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LessonTheme } from "./LessonTheme.tsx";

afterEach(cleanup);

const classes = (name: string): string[] => [...screen.getByRole("button", { name }).classList];

describe("LessonTheme", () => {
  it("draws a lesson's button inside a parent's page as a lesson's, not the page's", () => {
    render(
      <Page width="prose">
        <Button variant="outline" size="control">
          page
        </Button>
        <LessonTheme>
          <Button variant="outline" size="control">
            lesson
          </Button>
        </LessonTheme>
      </Page>,
    );
    expect(classes("page")).toContain("text-jw-page-body");
    expect(classes("page")).toContain("in-data-[audience=adult]:focus-visible:ring-3");
    expect(classes("lesson")).not.toContain("text-jw-page-body");
    expect(classes("lesson")).not.toContain("in-data-[audience=adult]:focus-visible:ring-3");
    expect(classes("lesson")).toContain("text-jw-body");
  });

  it("keeps the lesson scope the stylesheets select", () => {
    const { container } = render(
      <LessonTheme>
        <p>lesson</p>
      </LessonTheme>,
    );
    expect(container.querySelector('[data-lesson-theme="zeszyt"] p')?.textContent).toBe("lesson");
  });

  // Inside an adult page, foundation.css gives a child's subtree Zeszyt back (dl-uukj.47.67).
  it("marks the child's audience on its root", () => {
    const { container } = render(<LessonTheme>lesson</LessonTheme>);
    expect(container.querySelector("[data-lesson-theme]")?.getAttribute("data-audience")).toBe(
      "kid",
    );
  });
});
