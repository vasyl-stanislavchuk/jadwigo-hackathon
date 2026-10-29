/**
 * The lesson frame's smaller parts that dl-uukj.29.55 finished (lesson-frame/README.md §3): the
 * solution on live options, the draggables' grip and arrow keys, the laptop's sign keys with no
 * Narzędzia (Enter addendum 4.2), and the pause sheet's sound switch.
 */

import { copy } from "@jadwigo/copy";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import { ChoiceGroup, type ChoiceItem } from "./ChoiceGroup.tsx";
import { DropZones } from "./DropZones.tsx";
import { Keypad, type SignKeys } from "./Keypad.tsx";
import { must } from "./must.ts";
import { SortableList, type SortItem } from "./SortableList.tsx";
import { LessonFrame, StepShell } from "./StepShell.tsx";
import { insetsOf } from "./scroll.ts";
import { TileBank } from "./TileBank.tsx";
import { Tools } from "./Tools.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };
const en = (key: Parameters<typeof copy>[1]) => copy("en", key);

describe("the solution on live options", () => {
  const items: ChoiceItem[] = [
    { id: "a", content: "14", tone: "idle" },
    { id: "b", content: "16", tone: "idle", solution: "Solution" },
  ];

  it.each(["one", "many"] as const)(
    "marks the right option data-solution when %s can be picked, as ChoiceStatic does",
    (select) => {
      const { container } = render(
        <StepFrame stepId="s1">
          <ChoiceGroup
            label="Answers"
            items={items}
            select={select}
            layout="list"
            chosen={[]}
            locked
            clock={clock}
            onToggle={() => {}}
          />
        </StepFrame>,
      );
      const marked = [...container.querySelectorAll("[data-solution]")];
      expect(marked).toHaveLength(1);
      expect(marked[0]?.getAttribute("data-option") ?? marked[0]?.textContent).toMatch(/b|16/);
      expect(marked[0]?.querySelector("[data-solution-label]")?.textContent).toBe("Solution");
    },
  );
});

describe("the draggables", () => {
  const cards: SortItem[] = [
    { id: "x", content: "three", text: "three" },
    { id: "y", content: "one", text: "one" },
    { id: "z", content: "two", text: "two" },
  ];

  function Sorted({
    onReorder,
  }: {
    onReorder?: (order: string[], at: Instant, modality: string) => void;
  }): JSX.Element {
    const [order, setOrder] = useState(cards);
    return (
      <SortableList
        language="en"
        label="Order"
        items={order}
        tone="idle"
        locked={false}
        clock={clock}
        onReorder={(next, at, modality) => {
          onReorder?.(next, at, modality);
          setOrder(next.map((id) => must(cards.find((c) => c.id === id))));
        }}
      />
    );
  }

  it("draws the 2 × 3 grip on every card, in the pick ink once grabbed", () => {
    const { container } = render(<Sorted />);
    const grips = container.querySelectorAll("[data-grip]");
    expect(grips).toHaveLength(3);
    expect(grips[0]?.classList.contains("kid-grip")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "three", pressed: false }));
    expect(container.querySelector("[data-grip][data-grabbed]")).not.toBeNull();
  });

  it("moves a sorted card by the arrow keys and keeps the focus on it", () => {
    const onReorder = vi.fn();
    render(<Sorted onReorder={onReorder} />);
    const three = screen.getByRole("button", { name: "three", pressed: false });
    three.focus();
    fireEvent.keyDown(three, { key: "ArrowDown" });
    expect(onReorder).toHaveBeenLastCalledWith(["y", "x", "z"], expect.anything(), "keyboard");
    expect(document.activeElement?.textContent).toBe("three");
    fireEvent.keyDown(must(document.activeElement), { key: "ArrowUp" });
    expect(onReorder).toHaveBeenLastCalledWith(["x", "y", "z"], expect.anything(), "keyboard");
    // The first card has nowhere higher to go.
    fireEvent.keyDown(must(document.activeElement), { key: "ArrowUp" });
    expect(onReorder).toHaveBeenCalledTimes(2);
  });

  it("carries a picked tile along the places by the arrow keys, and Enter puts it there", () => {
    const onPlace = vi.fn();
    const { container } = render(
      <TileBank
        language="en"
        label="Build it"
        tiles={[
          { id: "t8", content: "8", text: "8" },
          { id: "tp", content: "+", text: "+" },
        ]}
        places={[
          { id: "s1", tile: null },
          { id: "s2", tile: null },
        ]}
        firstLabel=""
        lastLabel=""
        tone="idle"
        locked={false}
        clock={clock}
        onPlace={onPlace}
      />,
    );
    const tiles = [...container.querySelectorAll<HTMLElement>("[data-tile]")];
    const eight = must(tiles[0]);
    const plus = must(tiles[1]);
    eight.focus();
    fireEvent.keyDown(eight, { key: "ArrowRight" });
    expect(document.activeElement).toBe(plus);
    fireEvent.click(plus);
    fireEvent.keyDown(plus, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("data-place")).toBe("s1");
    fireEvent.keyDown(must(document.activeElement), { key: "ArrowRight" });
    expect(document.activeElement?.getAttribute("data-place")).toBe("s2");
    fireEvent.click(must(document.activeElement));
    expect(onPlace).toHaveBeenCalledWith(1, "tp", expect.anything(), expect.anything());
  });

  it("walks a picked group card to the groups by the arrow keys", () => {
    const { container } = render(
      <DropZones
        language="en"
        label="Sort"
        cards={[{ id: "c1", content: "cat", text: "cat", tone: "idle" }]}
        zones={[
          { id: "g1", label: "Animals" },
          { id: "g2", label: "Plants" },
        ]}
        placement={{}}
        tone="idle"
        locked={false}
        clock={clock}
        onPlace={() => {}}
      />,
    );
    const cat = screen.getByRole("button", { name: "cat" });
    expect(cat.querySelector("[data-grip]")).not.toBeNull();
    fireEvent.click(cat);
    fireEvent.keyDown(cat, { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe(en("drag_tray"));
    fireEvent.keyDown(must(document.activeElement), { key: "ArrowDown" });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Animals");
    expect(container.querySelectorAll("[data-drop-target]")).toHaveLength(3);
  });
});

// Enter addendum 4.2 (11c, dl-uukj.29.104): no Narzędzia on a laptop, for every family.
describe("a laptop has no Narzędzia: the keyboard types, and the signs sit under the field", () => {
  const signs = (list: readonly string[]): SignKeys => ({
    signs: list,
    signOf: (key) => (key === "*" ? "×" : null),
    onSign: vi.fn(),
  });
  const step = (
    signKeys: SignKeys | undefined,
    props: { ended?: boolean; onEvent?: () => void } = {},
  ) => (
    <div data-learner-view data-frame-preview="laptop">
      <StepShell
        language="pl"
        category="child"
        feedback={props.ended ? { kind: "praise", index: 0 } : null}
        progress={{ done: 0, total: 3 }}
        stem={<p>3 × 4</p>}
        answer={
          <div className="flex flex-col gap-4">
            <input data-field="entry" aria-label="entry" readOnly />
            <Tools kind="keypad">
              <Keypad
                language="pl"
                clock={clock}
                signKeys={signKeys}
                onEvent={props.onEvent ?? vi.fn()}
              />
            </Tools>
          </div>
        }
        action={{
          ready: true,
          press: { onPointerDown: () => undefined, onClick: () => undefined },
        }}
      />
    </div>
  );

  it("draws no tools button, no panel and no digits on a number step, and the keyboard still types", () => {
    const onEvent = vi.fn();
    const { container } = render(step(undefined, { onEvent }));
    expect(must(container.querySelector("[data-step-shell]")).getAttribute("data-frame")).toBe(
      "laptop",
    );
    expect(
      container.querySelector(
        "[data-tools-button], [data-tools-panel], [data-tools-dock], [data-keypad], [data-signs]",
      ),
    ).toBeNull();
    expect(screen.queryByText("Narzędzia")).toBeNull();
    fireEvent.keyDown(window, { key: "7" });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "digit", digit: "7" }));
  });

  it("shows an expression’s six signs as 56 × 56 keys in a row under the field, and a hardware * types ×", () => {
    const keys = signs(["×", "÷", "+", "−", "(", ")"]);
    const { container } = render(step(keys));
    const strip = must(
      container.querySelector<HTMLElement>('[data-area="answer"] [data-signs="strip"]'),
    );
    expect([...strip.children].map((k) => k.getAttribute("data-sign"))).toEqual([
      "×",
      "÷",
      "+",
      "−",
      "(",
      ")",
    ]);
    for (const key of strip.children) expect(key.className).toContain("min-w-kid-tap");
    expect(strip.className).toContain("gap-2");
    expect(container.querySelector("[data-keypad]")).toBeNull();
    fireEvent.keyDown(window, { key: "*" });
    expect(keys.onSign).toHaveBeenCalledWith("×", expect.anything(), "keyboard");
  });

  it("shows a decimal’s one comma key, and hides the signs once the step ends", () => {
    const { container, rerender } = render(step(signs([","])));
    expect(container.querySelectorAll('[data-signs="strip"] [data-sign]')).toHaveLength(1);
    rerender(step(signs([","]), { ended: true }));
    expect(container.querySelector("[data-signs]")).toBeNull();
  });

  it("counts only the footer as the clear edge under a field", () => {
    const { container } = render(
      <div data-learner-view>
        <div data-step-shell>
          <div data-area="answer">
            <input data-field aria-label="answer" />
          </div>
          <div data-bar />
        </div>
      </div>,
    );
    Object.defineProperty(
      must(container.querySelector<HTMLElement>("[data-bar]")),
      "offsetHeight",
      {
        value: 96,
      },
    );
    expect(insetsOf(must(container.querySelector("[data-field]"))).bottom).toBe(96 + 16);
  });
});

describe("the pause sheet", () => {
  it('turns the sound on and off with a switch, "Dźwięk"', () => {
    const set = vi.fn();
    render(
      <LessonFrame.Provider value={{ sound: { on: true, set } }}>
        <StepShell
          language="pl"
          category="child"
          feedback={null}
          stem={<p>7 + 5</p>}
          answer={<p>answer</p>}
          action={null}
          progress={{ done: 0, total: 4 }}
        />
      </LessonFrame.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: copy("pl", "ds_pause_title") }));
    const sound = screen.getByRole("switch", { name: copy("pl", "ds_sound") });
    expect(sound.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(sound);
    expect(set).toHaveBeenCalledWith(false);
  });
});
