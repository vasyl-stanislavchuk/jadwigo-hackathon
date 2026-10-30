/**
 * The child's review route (dl-uukj.30.1, dl-uukj.32.10): while the review loads a spinner says
 * so once, a failed load offers the way back to the list, a seq the attempt has no question at
 * goes back to the list in place of the step, and a known seq draws its step with an arrow to each
 * neighbour it has. Logic only: happy-dom does no layout (`dl-5ssh.73`).
 */

import { Attempt, type AttemptReview } from "@jadwigo/contracts";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Review } from "../play/usePlayer.ts";
import { ChildReview } from "./ChildReview.tsx";
import { reviewQuestion } from "./fixtures.ts";

afterEach(cleanup);

const AT = "2026-10-28T14:02:06.274Z";

const ready = (): Review => {
  const review: AttemptReview = {
    attempt: Attempt.parse({
      id: "att_43007b83dp9w2tnfjxhha74cyq",
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      assignment_id: "asg_0ectzj2evqb95a3v1v6wewjzy3",
      lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
      learner_id: null,
      player_name: null,
      mode: "real",
      status: "finished",
      resume_at: null,
      started_at: AT,
      finished_at: AT,
    }),
    questions: [
      reviewQuestion(1, "correct"),
      reviewQuestion(2, "missed"),
      reviewQuestion(3, "skipped"),
    ],
  };
  return { kind: "ready", review };
};

function draw(load: Review, seq: number) {
  const onOpen = vi.fn();
  const onAll = vi.fn();
  render(<ChildReview load={load} seq={seq} language="pl" onOpen={onOpen} onAll={onAll} />);
  return { onOpen, onAll };
}

describe("ChildReview", () => {
  it("while the review loads, a spinner says so once, and no step is drawn", () => {
    draw({ kind: "loading" }, 1);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", { name: "Chwileczkę…" })).toBeTruthy();
    expect(screen.queryByText("Chwileczkę…")).toBeNull();
    expect(document.querySelector("[data-review-step]")).toBeNull();
  });

  it("a failed load says so and offers the way back to the list", () => {
    const { onAll } = draw({ kind: "failed" }, 1);
    expect(document.querySelector("[data-failed]")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Wszystkie pytania" }));
    expect(onAll).toHaveBeenCalledTimes(1);
    expect(onAll).toHaveBeenCalledWith();
  });

  it("a seq the attempt has no question at goes back to the list, replacing the step", () => {
    const { onAll } = draw(ready(), 9);
    expect(onAll).toHaveBeenCalledWith({ replace: true });
    expect(document.querySelector("[data-review-step]")).toBeNull();
  });

  it("draws the seq's step, and each arrow opens its neighbour by seq", () => {
    const { onOpen, onAll } = draw(ready(), 2);
    const step = document.querySelector("[data-review-step]");
    expect(step?.getAttribute("data-seq")).toBe("2");
    expect(screen.getByRole("heading", { level: 2, name: "Pytanie 2 z 3" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Poprzednie" }));
    expect(onOpen).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Następne" }));
    expect(onOpen).toHaveBeenLastCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Wszystkie pytania" }));
    expect(onAll).toHaveBeenCalledWith();
  });

  it("at either end draws only the arrow there is a neighbour for", () => {
    draw(ready(), 1);
    expect(screen.queryByRole("button", { name: "Poprzednie" })).toBeNull();
    expect(screen.getByRole("button", { name: "Następne" })).toBeTruthy();
    cleanup();
    draw(ready(), 3);
    expect(screen.getByRole("button", { name: "Poprzednie" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Następne" })).toBeNull();
  });
});
