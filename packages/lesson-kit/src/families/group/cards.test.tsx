/**
 * Group's cards (dl-w3.51.8): a card may be a picture with its words as alt, in the tray, in a
 * group and in the still views; a group's heading takes TeX. The picture's words name the card for
 * tap-tap and the announcement.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../../stage/clock.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import { GroupView } from "./GroupView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const picture = (alt: string) => ({
  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
  alt,
  width: 80,
  height: 80,
});
const bucket: SpecOf<typeof Family.Group> = {
  id: "s1",
  say: "Sort the shapes",
  question_type: QuestionType.Bucket,
  family: Family.Group,
  data: {
    groups: [
      { id: "corners", label: "$4$ corners" },
      { id: "round", label: "round" },
    ],
    items: [
      { id: "sq", label: "", picture: picture("a square") },
      { id: "ci", label: "", picture: picture("a circle") },
      { id: "n9", label: "$9$" },
    ],
    each_item: "one",
  },
  key: { items: { sq: ["corners"], ci: ["round"], n9: ["corners"] } },
};
const page = pageSpec(bucket) as PageSpecOf<typeof Family.Group>;
const tap = (el: HTMLElement) => fireEvent.click(el, { detail: 0 });

describe("Group: cards", () => {
  it("draws a picture card with its words, and places it by tap-tap", () => {
    const onCommit = vi.fn();
    render(
      <GroupView
        language="en"
        category="child"
        clock={clock}
        mode={ViewMode.Play}
        spec={page}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />,
    );
    const square = screen.getByRole("img", { name: "a square" }).closest("button") as HTMLElement;
    expect(square).not.toBeNull();
    tap(square);
    tap(screen.getByRole("button", { name: "$4$ corners" }));
    const corners = screen.getByRole("button", { name: "$4$ corners" })
      .parentElement as HTMLElement;
    expect(within(corners).getByRole("img", { name: "a square" })).toBeTruthy();
    // The heading shows the TeX drawn, not its source.
    expect(within(corners).queryByText("$4$ corners")).toBeNull();
    expect(
      screen.getByText("a square is in $4$ corners.", { selector: "[aria-live]" }),
    ).toBeTruthy();
  });

  it("shows the pictures in the solution view, the learner’s beside the right ones", () => {
    render(
      <GroupView
        language="en"
        category="child"
        clock={clock}
        mode={ViewMode.Solution}
        spec={page}
        value={{ items: { sq: ["round"], ci: ["round"], n9: ["corners"] } }}
        solution={{ items: { sq: ["corners"], ci: ["round"], n9: ["corners"] } }}
      />,
    );
    expect(screen.getAllByRole("img", { name: "a square" })).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "a circle" })).toHaveLength(2);
  });
});
