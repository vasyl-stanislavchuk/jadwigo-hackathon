/**
 * The review step (epic `dl-uukj.30`): the answer given in the family's solution view, the right
 * answer under it only where the answer was not right, the why line in a speech bubble, and the
 * arrows only where there is a neighbour. Logic only: happy-dom does no layout (`dl-5ssh.73`).
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { reviewQuestion } from "./fixtures.ts";
import { ReviewStep } from "./ReviewStep.tsx";

afterEach(cleanup);

const $ = (selector: string): Element | null => document.querySelector(selector);

describe("ReviewStep", () => {
  it("a right answer: the answer, the praise over the why line, and no right-answer block", () => {
    render(
      <ReviewStep
        question={reviewQuestion(1, "correct")}
        index={0}
        total={3}
        language="pl"
        onAll={() => undefined}
      />,
    );
    expect(screen.getByText("Pytanie 1 z 3")).toBeTruthy();
    expect(screen.getByText("Udało się")).toBeTruthy();
    expect($("[data-review-answer]")).not.toBeNull();
    expect($("[data-review-solution]")).toBeNull();
    expect(screen.queryByText("Tak wygląda dobra odpowiedź:")).toBeNull();
    const bubble = $("[data-review-bubble]");
    expect(bubble?.textContent).toContain("Brawo! Oto dlaczego:");
    expect(bubble?.textContent).toContain("Dwa razy pięć to pięć i jeszcze pięć.");
    expect(document.body.textContent).not.toMatch(/\d+ ?\/ ?\d+|%/);
  });

  it("a missed one: the answer given, then the right answer in the same view, and the why line", () => {
    render(
      <ReviewStep
        question={reviewQuestion(2, "missed")}
        index={1}
        total={3}
        language="pl"
        onAll={() => undefined}
      />,
    );
    expect(screen.getByText("Jeszcze się uczymy")).toBeTruthy();
    expect($("[data-review-answer]")).not.toBeNull();
    const solution = $("[data-review-solution]");
    expect(solution?.textContent).toContain("Tak wygląda dobra odpowiedź:");
    expect(solution?.textContent).toContain("10");
    const bubble = $("[data-review-bubble]");
    expect(bubble?.textContent).toContain("Dwa razy pięć to pięć i jeszcze pięć.");
    expect(bubble?.textContent).not.toContain("Brawo");
    expect($("[data-review-no-answer]")).toBeNull();
  });

  it("for the adult, reads the adult register: how it went in the adult's words, no praise to a child", () => {
    render(
      <ReviewStep
        question={reviewQuestion(2, "missed")}
        index={1}
        total={3}
        language="pl"
        category="adult"
        onAll={() => undefined}
      />,
    );
    expect(screen.getByText("Jeszcze nie")).toBeTruthy();
    expect(screen.queryByText("Jeszcze się uczymy")).toBeNull();
    cleanup();
    render(
      <ReviewStep
        question={reviewQuestion(1, "correct")}
        index={0}
        total={3}
        language="pl"
        category="adult"
        onAll={() => undefined}
      />,
    );
    expect(screen.getByText("Dobrze")).toBeTruthy();
    const bubble = $("[data-review-bubble]");
    expect(bubble?.textContent).toContain("Dlaczego tak:");
    expect(bubble?.textContent).not.toContain("Brawo");
  });

  it("a skip with no answer: a kind line instead of the answer, then the right answer", () => {
    render(
      <ReviewStep
        question={reviewQuestion(3, "skipped", { added: "twin", help_used: 2 })}
        index={2}
        total={3}
        language="pl"
        onAll={() => undefined}
      />,
    );
    expect(screen.getByText("Wrócimy do tego")).toBeTruthy();
    expect(screen.getByText("Tym razem bez odpowiedzi. Zobacz, jak to wygląda.")).toBeTruthy();
    expect($("[data-review-answer]")).toBeNull();
    expect($("[data-review-solution]")).not.toBeNull();
    expect(screen.getByText("podobne pytanie")).toBeTruthy();
    expect(screen.getByText("Pomoc: 2")).toBeTruthy();
  });

  it("draws no bubble when the key reveals nothing", () => {
    render(
      <ReviewStep
        question={reviewQuestion(1, "missed", { reveal: {} })}
        index={0}
        total={1}
        language="pl"
        onAll={() => undefined}
      />,
    );
    expect($("[data-review-bubble]")).toBeNull();
  });

  it("draws the worked lines after the why line", () => {
    render(
      <ReviewStep
        question={reviewQuestion(1, "missed", {
          reveal: { why: "Pięć i pięć.", worked_solution: ["5 + 5 = 10"] },
        })}
        index={0}
        total={1}
        language="pl"
        onAll={() => undefined}
      />,
    );
    const lines = [...document.querySelectorAll("[data-review-line]")].map((l) => l.textContent);
    expect(lines).toEqual(["Pięć i pięć.", "5 + 5 = 10"]);
  });

  it("draws an arrow only where there is a neighbour, and each calls its own", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onAll = vi.fn();
    const { rerender } = render(
      <ReviewStep
        question={reviewQuestion(1, "correct")}
        index={0}
        total={2}
        language="pl"
        onNext={onNext}
        onAll={onAll}
      />,
    );
    expect(screen.queryByLabelText("Poprzednie")).toBeNull();
    fireEvent.click(screen.getByLabelText("Następne"));
    expect(onNext).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText("Wszystkie pytania"));
    expect(onAll).toHaveBeenCalledTimes(1);

    rerender(
      <ReviewStep
        question={reviewQuestion(2, "missed")}
        index={1}
        total={2}
        language="pl"
        onPrev={onPrev}
        onAll={onAll}
      />,
    );
    expect(screen.queryByLabelText("Następne")).toBeNull();
    fireEvent.click(screen.getByLabelText("Poprzednie"));
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  it("draws a badge in place of the child's when one is passed, and the child's otherwise", () => {
    const { rerender } = render(
      <ReviewStep
        question={reviewQuestion(2, "missed")}
        index={0}
        total={1}
        language="pl"
        category="adult"
        onAll={() => undefined}
        badge={<span data-own-badge>Jeszcze nie</span>}
      />,
    );
    expect($("[data-own-badge]")).not.toBeNull();
    expect($("[data-review-ended]")).toBeNull();
    rerender(
      <ReviewStep
        question={reviewQuestion(2, "missed")}
        index={0}
        total={1}
        language="pl"
        onAll={() => undefined}
      />,
    );
    expect($("[data-own-badge]")).toBeNull();
    expect($("[data-review-ended]")?.textContent).toBe("Jeszcze się uczymy");
  });

  it("draws the parent's block under the solution", () => {
    render(
      <ReviewStep
        question={reviewQuestion(1, "missed")}
        index={0}
        total={1}
        language="pl"
        onAll={() => undefined}
      >
        <p data-under>Próby</p>
      </ReviewStep>,
    );
    expect($("[data-review-step] > [data-under]")).not.toBeNull();
  });
});
