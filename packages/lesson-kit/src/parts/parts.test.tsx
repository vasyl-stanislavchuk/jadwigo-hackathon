/**
 * The parts' kitchen sink (dl-0ax3.2): the parts in each of their states, and
 * the step frame's Questionnaire rules (dl-0ax3.3): letters A–E pick the options in order, a key
 * or a submit never moves the step, and nothing shows progress, a count or a score.
 */

import { copy } from "@jadwigo/copy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import { ChoiceList } from "./ChoiceList.tsx";
import { CELL, CELL_IDLE } from "./cells.ts";
import { InlineCode } from "./InlineCode.tsx";
import { Keypad } from "./Keypad.tsx";
import { must } from "./must.ts";
import { TaskPrompt } from "./TaskPrompt.tsx";
import { TerminalCard } from "./TerminalCard.tsx";
import { shiftInto, Tooltip } from "./Tooltip.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-06T00:00:00.000Z" }) };
const KID_SIZE = /min-h-\[var\(--kid-(tap-min|commit-height|key-size)\)\]/;

describe("shiftInto", () => {
  it("leaves a bubble inside the window where it is", () =>
    expect(shiftInto(100, 300, 768)).toBe(0));
  it("slides a bubble past the right edge back in", () =>
    expect(shiftInto(600, 790, 768)).toBe(-30));
  it("slides a bubble past the left edge back in", () => expect(shiftInto(-20, 180, 768)).toBe(28));
  it("pins a bubble wider than the window to the left edge", () =>
    expect(shiftInto(-50, 900, 768)).toBe(58));
});

describe("Tooltip", () => {
  it("repeats its words in a tooltip, held open only when asked (dl-uukj.29.30)", () => {
    const { container, rerender } = render(
      <Tooltip text="Najpierw odpowiedz, potem sprawdź.">
        <button type="button">Sprawdź</button>
      </Tooltip>,
    );
    expect(screen.getByRole("tooltip", { hidden: true }).textContent).toBe(
      "Najpierw odpowiedz, potem sprawdź.",
    );
    expect(must(container.querySelector(".kid-tooltip")).hasAttribute("data-open")).toBe(false);
    rerender(
      <Tooltip text="Zakończ na dziś." open placement="bottom" align="start">
        <button type="button">X</button>
      </Tooltip>,
    );
    const tip = must(container.querySelector(".kid-tooltip"));
    expect(tip.hasAttribute("data-open")).toBe(true);
    expect(tip.getAttribute("data-placement")).toBe("bottom");
    expect(tip.getAttribute("data-align")).toBe("start");
  });
});

describe("TaskPrompt", () => {
  it("shows the task at the say size", () => {
    render(<TaskPrompt text="Ile to jest 7 × 8?" />);
    const p = screen.getByText("Ile to jest 7 × 8?");
    expect(p.className).toMatch(/text-\[length:var\(--kid-say-size\)\]/);
  });
});

describe("InlineCode", () => {
  it("shows each backtick span as a monospace chip, without the marks", () => {
    const { container } = render(
      <p>
        <InlineCode text="You ran `bd dep add demo-2ma demo-xbx`, then `bd ready`." />
      </p>,
    );
    const chips = [...container.querySelectorAll("code")];
    expect(chips.map((c) => c.textContent)).toEqual(["bd dep add demo-2ma demo-xbx", "bd ready"]);
    expect(container.textContent).toBe("You ran bd dep add demo-2ma demo-xbx, then bd ready.");
    expect(chips[0]?.className).toMatch(/font-mono/);
  });

  it("makes every word in a chip unbreakable, so an id never breaks at its hyphen", () => {
    const { container } = render(<InlineCode text="`bd show demo-2ma`" />);
    const words = [...container.querySelectorAll("code span")];
    expect(words.map((w) => w.textContent)).toEqual(["bd", "show", "demo-2ma"]);
    for (const w of words) expect(w.className).toBe("whitespace-nowrap");
  });

  it("prints a chip as an outline with no fill", () => {
    const { container } = render(<InlineCode text="`bd ready`" paper />);
    expect(must(container.querySelector("code")).className).toMatch(/border-black/);
    expect(must(container.querySelector("code")).className).not.toMatch(/bg-muted/);
  });
});

describe("TaskPrompt with inline code", () => {
  it("renders a backtick span as a chip", () => {
    const { container } = render(<TaskPrompt text="What does `bd ready` list?" />);
    expect(must(container.querySelector("code")).textContent).toBe("bd ready");
    expect(container.textContent).not.toContain("`");
  });
});

describe("TerminalCard", () => {
  const lab = {
    lang: "bash" as const,
    copy: true,
    lines: [
      { cmd: "bd -C $DL_LAB ready", out: ["○ demo-xbx P2 Buy paint"] },
      { cmd: "bd -C $DL_LAB update <Buy paint id> --claim", out: null },
    ],
  };
  const writeText = vi.fn<(text: string) => Promise<void>>();
  // The unit setup puts the pinned clock back after each test.
  afterEach(() => {
    writeText.mockReset();
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

  it("draws a $ per command that is never selected or read, and each output under its command", () => {
    const { container } = render(<TerminalCard card={lab} language="en" />);
    const prompts = [...container.querySelectorAll('[data-line] span[aria-hidden="true"]')];
    expect(prompts.map((p) => p.textContent)).toEqual(["$", "$"]);
    for (const p of prompts) expect(p.className).toMatch(/select-none/);
    expect(screen.getByRole("group", { name: "Output" }).textContent).toBe(
      "○ demo-xbx P2 Buy paint",
    );
    expect(screen.getByRole("group", { name: "Terminal" })).toBeTruthy();
  });

  it("highlights by kind, never by colour alone", () => {
    const { container } = render(<TerminalCard card={lab} language="en" />);
    const verb = must(container.querySelector('[data-token="verb"]'));
    expect(verb.textContent).toBe("ready");
    expect(verb.className).toMatch(/font-semibold/);
    expect(must(container.querySelector('[data-token="cmd"]')).className).toMatch(/font-bold/);
    expect(must(container.querySelector('[data-token="ph"]')).className).toMatch(/italic/);
    // An id is told from a verb by weight too, since their hues are close.
    const { container: dep } = render(
      <TerminalCard
        card={{
          lang: "bash",
          copy: false,
          lines: [{ cmd: "bd dep add demo-2ma demo-xbx", out: null }],
        }}
        language="en"
      />,
    );
    expect(must(dep.querySelector('[data-token="id"]')).className).toMatch(/font-normal/);
  });

  it("offers copy only on a line with no placeholder, and notes what to type on the other", () => {
    const { container } = render(<TerminalCard card={lab} language="en" />);
    const buttons = screen.getAllByRole("button", { name: /^Copy: / });
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.dataset["copy"]).toBe("0");
    expect(container.querySelectorAll("[data-placeholder-note]")).toHaveLength(1);
    expect(must(container.querySelector("[data-placeholder-note]")).textContent).toBe(
      "Type the id bd printed in place of the part in angle brackets",
    );
  });

  it("keeps the 56 px tap target, with the hover fill an inset pill", () => {
    render(<TerminalCard card={lab} language="en" />);
    const button = screen.getByRole("button", { name: "Copy: bd -C $DL_LAB ready" });
    expect(button.className).toMatch(/min-h-\[var\(--kid-tap-min\)\]/);
    expect(button.className).toMatch(/before:inset-x-1\.5/);
    expect(button.className).toMatch(/before:inset-y-2/);
    expect(button.className).toMatch(/before:rounded-sm/);
    expect(button.className).toMatch(/hover:bg-transparent/);
  });

  it("names the copy button with its command, so a screen reader hears which one", () => {
    render(<TerminalCard card={lab} language="en" />);
    expect(screen.getByRole("button").getAttribute("aria-label")).toBe("Copy: bd -C $DL_LAB ready");
  });

  it("has an edge on any page: a 1 px border in the code border token", () => {
    const { container } = render(<TerminalCard card={lab} language="en" />);
    expect(must(container.querySelector("[data-terminal]")).className).toMatch(
      /border-\[color:var\(--code-border\)\]/,
    );
  });

  it("speaks only through its own status region, never through a live list around it", () => {
    const { container } = render(<TerminalCard card={lab} language="en" />);
    expect(must(container.querySelector("[data-terminal]")).getAttribute("aria-live")).toBe("off");
    expect(container.querySelectorAll('[role="status"]')).toHaveLength(1);
  });

  it("announces a repeat copy again: the region clears, then says it", async () => {
    vi.useFakeTimers();
    writeText.mockResolvedValue();
    render(<TerminalCard card={lab} language="en" />);
    const status = screen.getByRole("status");
    const click = async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole("button"));
      });
    };
    await click();
    act(() => void vi.advanceTimersByTime(100));
    expect(status.textContent).toBe("Copied");
    await click();
    expect(status.textContent).toBe("");
    act(() => void vi.advanceTimersByTime(100));
    expect(status.textContent).toBe("Copied");
  });

  it("clears the live region when Copied ends, so nothing stale is left to read", async () => {
    vi.useFakeTimers();
    writeText.mockResolvedValue();
    render(<TerminalCard card={lab} language="en" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    act(() => void vi.advanceTimersByTime(100));
    expect(screen.getByRole("status").textContent).toBe("Copied");
    act(() => void vi.advanceTimersByTime(2000));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("lets the newest copy win when an older one resolves late", async () => {
    vi.useFakeTimers();
    let failFirst: (reason: Error) => void = () => {};
    writeText
      .mockImplementationOnce(() => new Promise<void>((_, reject) => (failFirst = reject)))
      .mockResolvedValueOnce();
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => false),
      configurable: true,
    });
    render(<TerminalCard card={lab} language="en" />);
    const button = screen.getByRole("button");
    await act(async () => {
      fireEvent.click(button); // the first copy hangs
    });
    await act(async () => {
      fireEvent.click(button); // the second succeeds
    });
    await act(async () => {
      failFirst(new Error("denied")); // the first now fails, late
    });
    act(() => void vi.advanceTimersByTime(100));
    expect(button.textContent).toBe("Copied");
    expect(screen.getByRole("status").textContent).toBe("Copied");
    expect(document.querySelector("[data-copy-failed]")).toBeNull();
  });

  it("keeps focus on the button when it copies through the fallback", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => true),
      configurable: true,
    });
    // As in a browser, selecting the hidden textarea takes focus from the button.
    const select = vi.spyOn(HTMLTextAreaElement.prototype, "select").mockImplementation(function (
      this: HTMLTextAreaElement,
    ) {
      this.focus();
    });
    render(<TerminalCard card={lab} language="en" />);
    const button = screen.getByRole("button");
    button.focus();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(select).toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
    expect(button.textContent).toBe("Copied");
    select.mockRestore();
  });

  it.each([
    'bd -C $DL_LAB close demo-xbx --reason "Two cans # of white & more | less; 😀"',
    "bd -C $DL_LAB create 'Paint the fence' -p 1",
  ])("shows and copies %j exactly", async (cmd) => {
    writeText.mockResolvedValue();
    const { container } = render(
      <TerminalCard
        card={{ lang: "bash", copy: true, lines: [{ cmd, out: null }] }}
        language="en"
      />,
    );
    expect(must(container.querySelector('[data-line] [role="group"]')).textContent).toBe(`$${cmd}`);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(writeText).toHaveBeenCalledWith(cmd);
  });

  it("shows no copy button when the card does not offer it", () => {
    render(<TerminalCard card={{ ...lab, copy: false }} language="en" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("copies the command exactly, then says Copied and announces it, for 2 s", async () => {
    vi.useFakeTimers();
    writeText.mockResolvedValue();
    const { container } = render(<TerminalCard card={lab} language="en" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy: bd -C $DL_LAB ready" }));
    });
    expect(writeText).toHaveBeenCalledWith("bd -C $DL_LAB ready");
    const button = screen.getByRole("button", { name: "Copy: bd -C $DL_LAB ready" });
    expect(button.textContent).toBe("Copied");
    act(() => void vi.advanceTimersByTime(100));
    expect(screen.getByRole("status").textContent).toBe("Copied");
    act(() => void vi.advanceTimersByTime(2000));
    expect(button.textContent).toBe("");
    expect(container.querySelector("[data-copied]")).toBeNull();
  });

  it("says so when the copy fails, and never says Copied", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const execCommand = vi.fn(() => false);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });
    const { container } = render(<TerminalCard card={lab} language="en" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy: bd -C $DL_LAB ready" }));
    });
    expect(
      screen.getByRole("button", { name: "Copy: bd -C $DL_LAB ready" }).textContent,
    ).not.toContain("Copied");
    await act(async () => void (await new Promise((r) => setTimeout(r, 150))));
    expect(screen.getByRole("status").textContent).toBe(
      "Could not copy. Select the command and copy it by hand.",
    );
    expect(container.querySelector("[data-copy-failed]")).not.toBeNull();
  });

  it("prints adapted: a black border, the $ kept, wrapped between words, and no copy", () => {
    const { container } = render(<TerminalCard card={lab} language="en" paper />);
    const card = must(container.querySelector<HTMLElement>("[data-terminal]"));
    expect(card.className).toMatch(/border-black/);
    expect(card.className).not.toMatch(/code-surface/);
    expect(screen.queryByRole("button")).toBeNull();
    expect(must(container.querySelector('[role="group"][aria-label="Command"]')).className).toMatch(
      /whitespace-pre-wrap/,
    );
    expect(container.textContent).toContain("$");
  });
});

describe("cells", () => {
  it("size a tap cell from the kid layer and take colour from the theme", () => {
    expect(CELL).toMatch(KID_SIZE);
    expect(CELL_IDLE).toBe("bg-card");
  });
});

describe("Keypad", () => {
  it("sends a digit at pointerdown and from a hardware key", () => {
    const onEvent = vi.fn();
    render(<Keypad language="pl" clock={clock} onEvent={onEvent} />);
    fireEvent.pointerDown(screen.getByRole("button", { name: "7" }));
    fireEvent.keyDown(window, { key: "3" });
    expect(onEvent.mock.calls.map(([ev]) => [ev.type, ev.digit, ev.source])).toEqual([
      ["digit", "7", "click"],
      ["digit", "3", "keyboard"],
    ]);
  });

  // Enter addendum 4.1 (1b, dl-uukj.29.104).
  const signKeys = (signs: readonly string[]) => ({ signs, signOf: () => null, onSign: vi.fn() });
  const bottomRow = (container: HTMLElement) =>
    [...must(container.querySelector("[data-keypad]")).children].slice(9);

  it("has no → key: the cell left of 0 is empty on a number step and keeps its space", () => {
    const { container } = render(<Keypad language="pl" clock={clock} onEvent={vi.fn()} />);
    const row = bottomRow(container);
    const extra = must(row[0]);
    const zero = must(row[1]);
    const erase = must(row[2]);
    expect(extra.hasAttribute("data-key-empty")).toBe(true);
    expect(zero.textContent).toBe("0");
    expect(erase.getAttribute("aria-label")).toBe(copy("pl", "erase"));
    expect(container.querySelector("[data-next-field], [data-signs]")).toBeNull();
  });

  it("puts a decimal comma left of 0, with no row of signs", () => {
    const { container } = render(
      <Keypad language="pl" clock={clock} signKeys={signKeys([","])} onEvent={vi.fn()} />,
    );
    expect(bottomRow(container)[0]?.getAttribute("data-sign")).toBe(",");
    expect(container.querySelector("[data-signs]")).toBeNull();
  });

  it("draws an expression’s six signs in one row above the digits, and an equation’s = left of 0", () => {
    const signs = ["×", "÷", "+", "−", "(", ")"];
    const { container } = render(
      <Keypad language="pl" clock={clock} signKeys={signKeys([...signs, "="])} onEvent={vi.fn()} />,
    );
    const row = must(container.querySelector<HTMLElement>('[data-signs="row"]'));
    expect([...row.children].map((k) => k.getAttribute("data-sign"))).toEqual(signs);
    expect(row.style.gridTemplateColumns).toBe("repeat(6, minmax(0, 1fr))");
    // The row comes first, above the digits, and only one block of signs is drawn.
    expect(
      row.compareDocumentPosition(must(container.querySelector("[data-keypad]"))) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(container.querySelectorAll("[data-signs]")).toHaveLength(1);
    expect(bottomRow(container)[0]?.getAttribute("data-sign")).toBe("=");
  });

  it("sizes the keys as drawn: digits 72 tall and 30 px, the sign row 56 tall and 28 px, 8 apart", () => {
    const { container } = render(
      <Keypad language="pl" clock={clock} signKeys={signKeys(["×", "+"])} onEvent={vi.fn()} />,
    );
    const seven = screen.getByRole("button", { name: "7" });
    expect(seven.className).toContain("min-h-[var(--kid-key-size)]");
    expect(seven.className).toContain("text-[1.875rem]");
    expect(seven.className).toContain("rounded-[1rem]");
    const times = must(container.querySelector<HTMLElement>('[data-sign="×"]'));
    expect(times.className).toContain("min-h-[var(--kid-tap-min)]");
    expect(times.className).toContain("text-[1.75rem]");
    expect(must(container.querySelector("[data-keypad]")).className).toContain("gap-2");
  });
});

/** A ChoiceList in its frame, holding the selection the way a block does. */
function Choices({
  locked = false,
  onChoose,
}: {
  locked?: boolean;
  onChoose(value: string, modality: string): void;
}): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <StepFrame stepId="s1" letters>
      <ChoiceList
        label="Wybierz odpowiedź"
        selected={selected}
        locked={locked}
        clock={clock}
        onChoose={(value, _at, modality) => {
          setSelected(value);
          onChoose(value, modality);
        }}
        options={["A", "B", "C", "D", "E"].map((letter) => ({
          value: letter,
          children: letter,
          data: { "data-letter": letter },
        }))}
      />
    </StepFrame>
  );
}

const option = (letter: string) =>
  must(document.querySelector<HTMLElement>(`[data-letter="${letter}"]`));
const radio = (letter: string) => must(option(letter).querySelector("input"));

describe("ChoiceList on Questionnaire", () => {
  it("is one radio group: a tap selects at pointerdown, and the forwarded click does not count twice", () => {
    const onChoose = vi.fn();
    render(<Choices onChoose={onChoose} />);
    expect(screen.getByRole("radiogroup", { name: "Wybierz odpowiedź" })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.pointerDown(option("B"));
    fireEvent.click(option("B"), { detail: 0 });
    expect(onChoose.mock.calls).toEqual([["B", "click"]]);
    expect(radio("B").checked).toBe(true);
  });

  it("selects from the keyboard (click, detail 0)", () => {
    const onChoose = vi.fn();
    render(<Choices onChoose={onChoose} />);
    fireEvent.click(option("D"), { detail: 0 });
    expect(onChoose.mock.calls).toEqual([["D", "keyboard"]]);
  });

  it("maps letter keys to the options in order: c picks the third", () => {
    const onChoose = vi.fn();
    render(<Choices onChoose={onChoose} />);
    radio("A").focus();
    fireEvent.keyDown(radio("A"), { key: "c" });
    expect(onChoose.mock.calls).toEqual([["C", "keyboard"]]);
    expect(radio("C").checked).toBe(true);
  });

  it("chooses nothing while locked", () => {
    const onChoose = vi.fn();
    render(<Choices locked onChoose={onChoose} />);
    fireEvent.pointerDown(option("A"));
    fireEvent.click(option("B"), { detail: 0 });
    expect(onChoose).not.toHaveBeenCalled();
    expect(["A", "B", "C", "D", "E"].every((l) => radio(l).disabled)).toBe(true);
  });
});

describe("StepFrame: focus for the letter shortcuts (dl-7k3l)", () => {
  it("takes focus on the first step, so a letter key picks an option with no tap first", () => {
    const onChoose = vi.fn();
    render(<Choices onChoose={onChoose} />);
    const step = must(document.querySelector("[data-step-frame] fieldset"));
    expect(document.activeElement).toBe(step);
    // No ring on the step itself: focus is there for the keys, not to be seen.
    expect(step.className).toMatch(/(^|\s)outline-none(\s|$)/);
    fireEvent.keyDown(must(document.activeElement), { key: "c" });
    expect(onChoose.mock.calls).toEqual([["C", "keyboard"]]);
  });

  it("never takes focus from a control that holds it", () => {
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    render(<Choices onChoose={vi.fn()} />);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("takes focus again on the next step once the control that moved on is gone", () => {
    const view = render(
      <StepFrame key="s1" stepId="s1">
        <button type="button">Sprawdź</button>
      </StepFrame>,
    );
    screen.getByRole("button").focus();
    view.rerender(
      <StepFrame key="s2" stepId="s2">
        next
      </StepFrame>,
    );
    expect(document.activeElement).toBe(document.querySelector("[data-step-frame] fieldset"));
  });
});

describe("StepFrame: the server owns the step", () => {
  it("stays on the step through Enter, arrows and a submit, and shows no progress", () => {
    const onChoose = vi.fn();
    render(<Choices onChoose={onChoose} />);
    fireEvent.pointerDown(option("B"));
    const frame = must(document.querySelector<HTMLFormElement>("[data-step-frame]"));
    fireEvent.keyDown(radio("B"), { key: "Enter" });
    fireEvent.keyDown(frame, { key: "ArrowRight" });
    fireEvent.keyDown(frame, { key: "ArrowLeft" });
    fireEvent.submit(frame);
    const item = must(frame.querySelector("fieldset"));
    expect(item.hidden).toBe(false);
    expect(option("B")).toBeTruthy();
    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(frame.textContent).not.toMatch(/\d+\s*(\/|z|of)\s*\d+/);
  });

  it("follows the runner to the next step", () => {
    const view = render(<StepFrame stepId="s1">first</StepFrame>);
    view.rerender(<StepFrame stepId="s2">second</StepFrame>);
    const item = must(document.querySelector("fieldset"));
    expect(item.hidden).toBe(false);
    expect(item.textContent).toBe("second");
  });
});
