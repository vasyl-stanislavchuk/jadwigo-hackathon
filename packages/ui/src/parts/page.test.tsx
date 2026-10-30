// @vitest-environment happy-dom
// Page (dl-uukj.32.3): an app page at the prose width, or the learner's page with the markers the
// play screens' styles and lesson-kit's scroll and keys code look for. happy-dom does no layout, so
// the width class and the markers are the contract.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Page } from "./page.tsx";

afterEach(cleanup);

describe("Page", () => {
  it("is one main column at the prose width with the page padding, by default", () => {
    render(<Page>Twoje dzieci</Page>);
    const main = screen.getByRole("main");
    expect(main.textContent).toBe("Twoje dzieci");
    expect(main.getAttribute("data-width")).toBe("prose");
    // The adult body size at leading 1.5 (dl-uukj.32.17), not the lesson's body.
    for (const c of [
      "max-w-(--page-prose-max)",
      "mx-auto",
      "p-6",
      "text-jw-page-body",
      "leading-jw-page",
    ])
      expect(main.classList.contains(c), c).toBe(true);
    expect(main.classList.contains("text-jw-body")).toBe(false);
    expect(main.hasAttribute("data-learner-view")).toBe(false);
    expect(main.classList.contains("kid-page")).toBe(false);
  });

  it("writes the learner's page exactly as PlayScreen and HomeScreen do", () => {
    render(
      <Page width="kid">
        <button type="button">Dalej</button>
      </Page>,
    );
    const main = screen.getByRole("main");
    expect(main.classList.contains("kid-page")).toBe(true);
    expect(main.hasAttribute("data-learner-view")).toBe(true);
    expect(main.hasAttribute("data-play")).toBe(true);
    expect(main.classList.contains("max-w-(--page-prose-max)")).toBe(false);
    // StepShell, HelpLadder, stepKeys and scroll.ts find the page from inside it this way.
    const inside = screen.getByRole("button", { name: "Dalej" });
    expect(inside.closest("[data-learner-view], .kid-page")).toBe(main);
    // lesson.css styles .kid-page[data-play] > [data-lesson-theme].
    expect(main.matches(".kid-page[data-play]")).toBe(true);
  });

  it("keeps the caller's class and attributes", () => {
    render(<Page className="gap-4" aria-label="Rodzic" data-parent />);
    const main = screen.getByRole("main", { name: "Rodzic" });
    expect(main.hasAttribute("data-parent")).toBe(true);
    expect(main.classList.contains("gap-4")).toBe(true);
    expect(main.classList.contains("gap-6")).toBe(false);
  });

  // tailwind-merge drops a leading written before a font size, so the page's leading comes after its
  // size and survives the caller's class (dl-uukj.32.17).
  it("keeps the page body and its leading beside the caller's class", () => {
    render(<Page className="min-w-0">Twoje dzieci</Page>);
    const main = screen.getByRole("main");
    for (const c of ["min-w-0", "text-jw-page-body", "leading-jw-page"])
      expect(main.classList.contains(c), c).toBe(true);
  });
});
