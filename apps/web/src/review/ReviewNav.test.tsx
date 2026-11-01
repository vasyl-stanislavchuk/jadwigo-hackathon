/**
 * The child's review navigator (dl-uukj.30.8): every question with its number and how it ended as
 * its accessible name, the open one marked, and a tap on another opens it. No count or percentage.
 * Logic only: happy-dom does no layout, so the rail and the tile row are checked in e2e.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewQuestion } from "./fixtures.ts";
import { ReviewNav } from "./ReviewNav.tsx";

afterEach(cleanup);

const questions = [
  reviewQuestion(1, "correct"),
  reviewQuestion(2, "missed"),
  reviewQuestion(4, "skipped"),
];

describe("ReviewNav", () => {
  it("lists every question, named by its number, prompt and how it ended", () => {
    render(<ReviewNav questions={questions} seq={2} language="pl" onOpen={() => undefined} />);
    const items = screen.getAllByRole("button");
    expect(items).toHaveLength(3);
    expect(items[0]?.getAttribute("aria-label")).toBe(
      "1. Ile to jest dwa razy pięć? (1) Udało się",
    );
    expect(items[1]?.getAttribute("aria-label")).toContain("Jeszcze się uczymy");
    expect(items[2]?.getAttribute("aria-label")).toContain("Wrócimy do tego");
  });

  it("marks the open question, and only that one", () => {
    render(<ReviewNav questions={questions} seq={2} language="pl" onOpen={() => undefined} />);
    const current = document.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0]?.closest("li")?.getAttribute("data-seq")).toBe("2");
  });

  it("opens another question by its seq", () => {
    const onOpen = vi.fn();
    render(<ReviewNav questions={questions} seq={1} language="pl" onOpen={onOpen} />);
    fireEvent.click(screen.getAllByRole("button")[2] as HTMLElement);
    expect(onOpen).toHaveBeenCalledWith(4);
  });

  it("shows no score and no count", () => {
    render(<ReviewNav questions={questions} seq={1} language="pl" onOpen={() => undefined} />);
    expect(document.body.textContent).not.toMatch(/\d+ ?\/ ?\d+|%/);
  });
});
