// @vitest-environment happy-dom
// Heading (dl-uukj.32.3): the app-page register's three heading sizes, each a real h1 to h3.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Heading } from "./heading.tsx";

afterEach(cleanup);

describe("Heading", () => {
  it.each([
    [1, "text-jw-prompt"],
    [2, "text-jw-instruction"],
    [3, "text-jw-body"],
  ] as const)("level %i is a heading of that level on %s, bold", (level, size) => {
    render(<Heading level={level}>Lekcje Ani</Heading>);
    const heading = screen.getByRole("heading", { level, name: "Lekcje Ani" });
    expect(heading.tagName).toBe(`H${level}`);
    expect(heading.classList.contains(size)).toBe(true);
    expect(heading.classList.contains("font-bold")).toBe(true);
  });

  it("is an h1 when no level is given", () => {
    render(<Heading>Rodzic</Heading>);
    expect(screen.getByRole("heading", { level: 1, name: "Rodzic" })).toBeTruthy();
  });

  it("takes one size only, the caller's when it gives one", () => {
    render(
      <Heading level={2} className="text-jw-body">
        Legenda
      </Heading>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Legenda" });
    expect(heading.classList.contains("text-jw-body")).toBe(true);
    expect(heading.classList.contains("text-jw-instruction")).toBe(false);
  });
});
