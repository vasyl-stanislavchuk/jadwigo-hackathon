/**
 * Help on a Group step (families/help.ts): rung 1 outlines the cards or groups it names, rung 2
 * puts the cards it gives in a right group, where they stay, and Check commits them with the rest.
 */

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode } from "../view.ts";
import { GroupView, placeCard } from "./GroupView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-13T00:00:00.000Z" }) };
const bucket: SpecOf<typeof Family.Group> = {
  id: "s1",
  say: "Sort the numbers",
  question_type: QuestionType.Bucket,
  family: Family.Group,
  data: {
    groups: [
      { id: "even", label: "even" },
      { id: "odd", label: "odd" },
    ],
    items: [16, 9, 21].map((n) => ({ id: `n${n}`, label: String(n) })),
    each_item: "one",
  },
  key: { items: { n16: ["even"], n9: ["odd"], n21: ["odd"] } },
};
const match: SpecOf<typeof Family.Group> = {
  ...bucket,
  question_type: QuestionType.Match,
  data: {
    groups: [
      { id: "a42", label: "42", capacity: 1 },
      { id: "a32", label: "32", capacity: 1 },
    ],
    items: [
      { id: "f1", label: "6 × 7" },
      { id: "f2", label: "8 × 4" },
    ],
    each_item: "one",
    // Match in zones (full groups); the columns layout has its own test (columns.test.tsx).
    layout: "zones",
  },
  key: { items: { f1: ["a42"], f2: ["a32"] } },
};
const help = (over: Partial<PageHelp>): PageHelp => ({
  rung: 1,
  card: { text: "Look." },
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: true,
  ...over,
});

function draw(spec: SpecOf<typeof Family.Group>, ladder: PageHelp, onCommit = vi.fn()) {
  const props = {
    language: "en" as const,
    category: "child" as const,
    clock,
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
    around: { checking: false, moveOn: null, ladder: { help: ladder, ask: null, refused: false } },
  };
  render(
    <StepFrame stepId="s1">
      <GroupView {...(props as unknown as Parameters<typeof GroupView>[0])} />
    </StepFrame>,
  );
  return onCommit;
}

const card = (text: string) =>
  screen
    .getAllByText(text)
    .map((e) => e.closest("button[aria-pressed]"))
    .find(Boolean) as HTMLElement;
const zone = (label: string) =>
  screen.getByRole("button", { name: label }).parentElement as HTMLElement;
const tap = (el: HTMLElement) =>
  act(() => {
    fireEvent.click(el, { detail: 0 });
  });

describe("Group: help", () => {
  it("outlines the card and the group rung 1 names", () => {
    draw(bucket, help({ focus: ["n21", "odd"] }));
    expect(card("21").dataset["helpFocus"]).toBe("true");
    expect(card("16").dataset["helpFocus"]).toBeUndefined();
    expect(zone("odd").dataset["helpFocus"]).toBe("true");
    expect(zone("even").dataset["helpFocus"]).toBeUndefined();
  });

  it("puts a given card in its group, locked, and commits it with the rest", () => {
    const onCommit = draw(
      bucket,
      help({ rung: 2, card: { text: "Smaller." }, given: { items: { n16: ["even"] } } }),
    );
    const given = within(zone("even")).getByText("16").closest("button") as HTMLElement;
    expect(given.dataset["helpGiven"]).toBe("true");
    expect(given.getAttribute("aria-disabled")).toBe("true");
    // Picking it up does nothing: tapping it then the other group leaves it where it is.
    tap(given);
    tap(screen.getByRole("button", { name: "odd" }));
    expect(within(zone("even")).getByText("16")).toBeTruthy();
    tap(card("9"));
    tap(screen.getByRole("button", { name: "odd" }));
    tap(card("21"));
    tap(screen.getByRole("button", { name: "odd" }));
    tap(screen.getByRole("button", { name: "Check" }));
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      items: { n16: ["even"], n9: ["odd"], n21: ["odd"] },
    });
  });

  it("keeps a given card in a full match group: another card cannot push it out", () => {
    draw(match, help({ rung: 2, card: { text: "Smaller." }, given: { items: { f1: ["a42"] } } }));
    tap(card("8 × 4"));
    tap(screen.getByRole("button", { name: "42" }));
    expect(within(zone("42")).getByText("6 × 7")).toBeTruthy();
    expect(within(zone("42")).queryByText("8 × 4")).toBeNull();
  });

  it("never moves a fixed card in placeCard", () => {
    const fixed = new Set(["f1"]);
    expect(placeCard(match.data, { f1: ["a42"] }, "f1", "a32", "a42", fixed)).toEqual({
      f1: ["a42"],
    });
    expect(placeCard(match.data, { f1: ["a42"] }, "f2", "a42", "__tray__", fixed)).toEqual({
      f1: ["a42"],
    });
    expect(placeCard(match.data, { f1: ["a42"] }, "f2", "a32", "__tray__", fixed)).toEqual({
      f1: ["a42"],
      f2: ["a32"],
    });
  });
});
