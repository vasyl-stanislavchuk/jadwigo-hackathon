/**
 * Sequence in tile mode (dl-w3.51.9, families/sequence/SequenceView.tsx on the TileBank part): a
 * tile tapped and then a place fills it, the bank keeps the tile, a filled place tapped empties,
 * Check too soon marks the empty places and commits nothing, and the help ladder outlines what it
 * names and fills the place it gives.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { PageHelp } from "../../stage/types.ts";
import { missingSequence } from "../complete.ts";
import { givenOf } from "../help.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { ViewMode } from "../view.ts";
import { SequenceView } from "./SequenceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const spec: SpecOf<typeof Family.Sequence> = {
  id: "s2",
  say: "Write 2 times 8 as repeated addition.",
  question_type: QuestionType.Order,
  family: Family.Sequence,
  data: {
    items: [],
    first_label: "first",
    last_label: "last",
    tiles: [
      { id: "t8", text: "8" },
      { id: "tp", text: "+" },
      { id: "tx", text: "×" },
    ],
    slots: 3,
  },
  key: { orders: [["t8", "tp", "t8"]] },
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

function draw(ladder: PageHelp | null = null, onCommit = vi.fn()) {
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
    around: ladder
      ? { checking: false, moveOn: null, ladder: { help: ladder, ask: null, refused: false } }
      : undefined,
  };
  render(
    <StepFrame stepId="s2">
      <SequenceView {...(props as unknown as Parameters<typeof SequenceView>[0])} />
    </StepFrame>,
  );
  return onCommit;
}

const tile = (id: string) => document.querySelector(`[data-tile="${id}"]`) as HTMLElement;
const place = (id: string) => document.querySelector(`[data-place="${id}"]`) as HTMLElement;
const tap = (el: HTMLElement) =>
  act(() => {
    fireEvent.click(el, { detail: 0 });
  });
const check = () => tap(screen.getByRole("button", { name: "Check" }));

describe("Sequence: tiles", () => {
  it("validates: tiles may read the same, places are counted, and a give names a place", () => {
    expect(validate(spec)).toEqual([]);
    const twins = {
      ...spec,
      data: { ...spec.data, tiles: [...must(spec.data.tiles), { id: "u8", text: "8" }] },
      help: { look: { text: "Look.", focus: ["s1"] }, boost: { text: "Boost." }, give: ["s1"] },
    };
    expect(validate(twins)).toEqual([]);
    expect(
      validate({ ...twins, help: { ...twins.help, give: ["t8"] } }).map((p) => p.rule),
    ).toContain("unknown_part");
    expect(validate({ ...spec, key: { orders: [["t8", "tp"]] } }).map((p) => p.rule)).toContain(
      "not_an_order",
    );
    expect(
      validate({ ...spec, data: { ...spec.data, slots: 1 }, key: { orders: [["t8"]] } }).map(
        (p) => p.rule,
      ),
    ).toContain("too_few_slots");
  });

  it("a tapped tile goes to the tapped place, and the bank keeps it", () => {
    const onCommit = draw();
    tap(tile("t8"));
    expect(tile("t8").getAttribute("aria-pressed")).toBe("true");
    tap(place("s1"));
    expect(place("s1").textContent).toContain("8");
    expect(screen.getByText("8 is now in place 1.")).toBeTruthy();
    expect(tile("t8")).toBeTruthy();
    tap(tile("tp"));
    tap(place("s2"));
    tap(tile("t8"));
    tap(place("s3"));
    check();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual(["t8", "tp", "t8"]);
  });

  it("a filled place tapped on its own empties again", () => {
    draw();
    tap(tile("tp"));
    tap(place("s2"));
    expect(place("s2").textContent).toContain("+");
    tap(place("s2"));
    expect(place("s2").getAttribute("aria-label")).toBe("Place 2, empty");
    expect(screen.getByText("Place 2 is empty again.")).toBeTruthy();
  });

  it("Check before every place is filled marks the empty places and commits nothing", () => {
    const onCommit = draw();
    tap(tile("t8"));
    tap(place("s1"));
    check();
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("Fill every place first.")).toBeTruthy();
    expect(place("s1").dataset["tone"]).toBe("idle");
    expect(place("s2").dataset["tone"]).toBe("missing");
    expect(place("s3").dataset["tone"]).toBe("missing");
    expect(missingSequence(spec.data, ["t8", null, null])).toEqual({
      reason: "incomplete_sequence",
      parts: ["s2", "s3"],
    });
  });

  it("rung 1 outlines the tile or place it names; rung 2 fills the place it gives and fixes it", () => {
    const given = givenOf(spec, ["s2"]);
    expect(given).toEqual({ slots: { s2: "tp" } });
    const onCommit = draw(
      help({ rung: 2, card: { text: "The sign." }, focus: ["tp", "s2"], given }),
    );
    expect(tile("tp").dataset["helpFocus"]).toBe("true");
    expect(place("s2").dataset["helpFocus"]).toBe("true");
    expect(place("s2").dataset["helpGiven"]).toBe("true");
    expect(place("s2").textContent).toContain("+");
    expect(place("s2").getAttribute("aria-disabled")).toBe("true");
    // The given place cannot be emptied or refilled.
    tap(place("s2"));
    expect(place("s2").textContent).toContain("+");
    tap(tile("tx"));
    tap(place("s2"));
    expect(place("s2").textContent).not.toContain("×");
    tap(place("s1"));
    tap(tile("t8"));
    tap(place("s1"));
    tap(tile("t8"));
    tap(place("s3"));
    check();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual(["t8", "tp", "t8"]);
  });
});
