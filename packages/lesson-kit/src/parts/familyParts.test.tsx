/**
 * The parts the interaction families share (dl-w3.37.10): the tone of a step and of each part
 * after a verdict (the marks rule), the entry state that keeps an answer after a miss, the entry
 * field, and the choice group in its one and several forms.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import { ChoiceGroup, type ChoiceItem } from "./ChoiceGroup.tsx";
import { DropZones, TRAY } from "./DropZones.tsx";
import { Entry } from "./Entry.tsx";
import { EMPTY_ENTRY, type EntryState, enter, rearm, submit } from "./entryState.ts";
import { must } from "./must.ts";
import { SortableList } from "./SortableList.tsx";
import { moveTo } from "./tapPick.ts";
import { fieldTone, partTone, wholeTone } from "./tone.ts";

afterEach(cleanup);

const at = (perf: number): Instant => ({ perf, wall: new Date(perf).toISOString() });
const clock: Clock = { now: () => at(5) };
const none = new Set<string>();

describe("tone after a verdict", () => {
  const miss = {
    kind: "try_again" as const,
    index: 0,
    parts: [
      { id: "g1", correct: true },
      { id: "g2", correct: false },
    ],
  };

  it("a marked part is green or amber, an unmarked one idle, and a changed one idle again", () => {
    expect(partTone("g1", miss, none)).toBe("green");
    expect(partTone("g2", miss, none)).toBe("amber");
    expect(partTone("g3", miss, none)).toBe("idle");
    expect(partTone("g2", miss, new Set(["g2"]))).toBe("idle");
  });

  it("among several fields only the missed one is marked: a right one stays paper until the whole step is right (Slots addendum 2.1)", () => {
    expect(fieldTone("g1", miss, none)).toBe("idle");
    expect(fieldTone("g2", miss, none)).toBe("amber");
    expect(fieldTone("g2", miss, new Set(["g2"]))).toBe("idle");
    expect(fieldTone("g1", { kind: "praise", index: 0 }, none)).toBe("green");
  });

  it("a miss with no marks is amber as a whole until the first change", () => {
    const whole = { kind: "try_again" as const, index: 0 };
    expect(wholeTone(whole, none)).toBe("amber");
    expect(wholeTone(whole, new Set(["x"]))).toBe("idle");
    expect(wholeTone(miss, none)).toBe("idle");
    expect(partTone("g1", whole, none)).toBe("idle");
  });

  it("praise turns everything green; moving on and no verdict leave it idle", () => {
    expect(partTone("g1", { kind: "praise", index: 0 }, none)).toBe("green");
    expect(wholeTone({ kind: "praise", index: 0 }, none)).toBe("green");
    expect(wholeTone({ kind: "moved_on", index: 0 }, none)).toBe("idle");
    expect(wholeTone(null, none)).toBe("idle");
  });
});

describe("entry state", () => {
  it("t1 is the first input, and the text is kept as typed", () => {
    let s = enter(EMPTY_ENTRY, { type: "digit", digit: "4", at: at(10), source: "click" }, 3);
    s = enter(s, { type: "digit", digit: "2", at: at(20), source: "keyboard" }, 3);
    expect(s).toEqual({ text: "42", t1: at(10), modality: "click" });
    expect(enter(s, { type: "text", text: " Bd Ready ", at: at(30) }, 20).text).toBe(" Bd Ready ");
  });

  it("a number takes digits only, up to its length", () => {
    const s = enter(
      { text: "123", t1: at(1), modality: "click" },
      { type: "digit", digit: "4", at: at(2), source: "click" },
      3,
    );
    expect(s.text).toBe("123");
    expect(
      enter(EMPTY_ENTRY, { type: "digit", digit: "x", at: at(1), source: "keyboard" }, 3),
    ).toEqual(EMPTY_ENTRY);
  });

  it("a new attempt keeps the text and re-arms t1; an unchanged resubmit takes Check as its onset", () => {
    const kept = rearm({ text: "48", t1: at(10), modality: "click" });
    expect(kept).toEqual({ text: "48", t1: null, modality: null });
    expect(submit(kept, at(99), "keyboard")).toEqual({
      text: "48",
      t1: at(99),
      modality: "keyboard",
    });
    expect(submit(EMPTY_ENTRY, at(1), "click")).toBeNull();
  });
});

function TypedField({ onSubmit }: { onSubmit(): void }): JSX.Element {
  const [state, setState] = useState<EntryState>(EMPTY_ENTRY);
  return (
    <Entry
      language="en"
      clock={clock}
      input="text"
      entry="keyboard"
      code
      max={20}
      state={state}
      tone="amber"
      locked={false}
      onChange={setState}
      onSubmit={onSubmit}
    />
  );
}

describe("Entry", () => {
  it("a typed field takes no autocorrect, shows its tone, and submits on Enter", () => {
    const onSubmit = vi.fn();
    render(<TypedField onSubmit={onSubmit} />);
    const field = screen.getByRole("textbox");
    expect(field.getAttribute("autocorrect")).toBe("off");
    expect(field.getAttribute("spellcheck")).toBe("false");
    expect(field.dataset["tone"]).toBe("amber");
    fireEvent.change(field, { target: { value: "bd ready" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect((field as HTMLInputElement).value).toBe("bd ready");
  });
});

const items = (tones: Record<string, ChoiceItem["tone"]> = {}): ChoiceItem[] =>
  ["a", "b", "c"].map((id) => ({ id, content: id.toUpperCase(), tone: tones[id] ?? "idle" }));

describe("ChoiceGroup", () => {
  it("several: checkboxes the child switches on and off", () => {
    function Many(): JSX.Element {
      const [chosen, setChosen] = useState<string[]>([]);
      return (
        <ChoiceGroup
          label="Pick"
          items={items({ c: "amber" })}
          select="many"
          layout="list"
          chosen={chosen}
          locked={false}
          clock={clock}
          onToggle={(id) =>
            setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
          }
        />
      );
    }
    render(<Many />);
    const boxes = screen.getAllByRole("checkbox");
    const first = must(boxes[0]);
    expect(boxes).toHaveLength(3);
    fireEvent.click(first, { detail: 0 });
    expect(boxes[0]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(first, { detail: 0 });
    expect(boxes[0]?.getAttribute("aria-checked")).toBe("false");
    expect(boxes[2]?.dataset["tone"]).toBe("amber");
  });

  it("one: a radio group in the step frame, and a locked group takes no pick", () => {
    const onToggle = vi.fn();
    render(
      <StepFrame stepId="s1">
        <ChoiceGroup
          label="Pick"
          items={items()}
          select="one"
          layout="grid"
          chosen={["b"]}
          locked
          clock={clock}
          onToggle={onToggle}
        />
      </StepFrame>,
    );
    expect(screen.getByRole("radiogroup")).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.pointerDown(screen.getByText("A"), { button: 0 });
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe("SortableList: tap-tap gives the same order a drag would", () => {
  function List({ onReorder }: { onReorder(order: string[]): void }): JSX.Element {
    const [order, setOrder] = useState(["a", "b", "c"]);
    return (
      <SortableList
        language="en"
        label="Order"
        items={order.map((id) => ({ id, text: id.toUpperCase(), content: id.toUpperCase() }))}
        firstLabel="smallest"
        lastLabel="largest"
        tone="idle"
        locked={false}
        clock={clock}
        onReorder={(next) => {
          setOrder(next);
          onReorder(next);
        }}
      />
    );
  }

  it("moveTo puts a card where the target stands", () => {
    expect(moveTo(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveTo(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
    expect(moveTo(["a", "b"], "a", "a")).toEqual(["a", "b"]);
  });

  it("a tap picks a card, a tap on another moves it there, and the move is announced", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    fireEvent.click(screen.getByRole("button", { name: "C" }), { detail: 0 });
    expect(screen.getByRole("button", { name: "C" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "A" }), { detail: 0 });
    expect(onReorder).toHaveBeenCalledWith(["c", "a", "b"]);
    expect(screen.getByText("C is now in place 1.")).toBeTruthy();
  });

  it("a second tap on the picked card puts it down", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    const b = screen.getByRole("button", { name: "B" });
    fireEvent.click(b, { detail: 0 });
    fireEvent.click(b, { detail: 0 });
    expect(b.getAttribute("aria-pressed")).toBe("false");
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("DropZones: tap a card, then a group", () => {
  function Zones({ onPlace }: { onPlace(card: string, to: string): void }): JSX.Element {
    const [placement, setPlacement] = useState<Record<string, string[]>>({});
    return (
      <DropZones
        language="en"
        label="Sort"
        cards={["4", "9"].map((id) => ({ id, text: id, content: id, tone: "idle" as const }))}
        zones={[
          { id: "even", label: "even" },
          { id: "odd", label: "odd" },
        ]}
        placement={placement}
        tone="idle"
        locked={false}
        clock={clock}
        onPlace={(card, to) => {
          setPlacement((p) => ({ ...p, [card]: to === TRAY ? [] : [to] }));
          onPlace(card, to);
        }}
      />
    );
  }

  it("places a card in a group, announces it, and puts it back in the tray", () => {
    const onPlace = vi.fn();
    render(<Zones onPlace={onPlace} />);
    fireEvent.click(screen.getByRole("button", { name: "4" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "even" }), { detail: 0 });
    expect(onPlace).toHaveBeenLastCalledWith("4", "even");
    expect(screen.getByText("4 is in even.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "4" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Still to sort" }), { detail: 0 });
    expect(onPlace).toHaveBeenLastCalledWith("4", TRAY);
  });

  it("a group tapped with no card picked does nothing", () => {
    const onPlace = vi.fn();
    render(<Zones onPlace={onPlace} />);
    fireEvent.click(screen.getByRole("button", { name: "odd" }), { detail: 0 });
    expect(onPlace).not.toHaveBeenCalled();
  });
});
