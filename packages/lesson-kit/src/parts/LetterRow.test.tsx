/**
 * The Polish letter row (dl-uukj.28): all nine letters always, capitals on an empty field only
 * where a capital is expected and lowercase after the first letter (dl-w3.68.22), a tap that puts the letter at the caret and keeps the focus
 * and caret in the field, a pressed key, and the press instant as the onset. Its feel
 * (dl-w3.68.30): one row of small pills inside kid-size keys, two rows of five only in a narrow
 * column, a press that sinks the pill, the letter popping in, the glyphs turning over on a case
 * flip, a key lit by the device keyboard's letter, and none of the motion under reduced.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../stage/clock.ts";
import { added, ECHO_MS, insertAt, LetterRow, POLISH_LETTERS } from "./LetterRow.tsx";
import { must } from "./must.ts";

// Each motion is a Web Animations call on one element: recorded here, by what it moved.
const animated: Element[] = [];
let reduced = false;
beforeEach(() => {
  animated.length = 0;
  reduced = false;
  HTMLElement.prototype.animate = function (this: HTMLElement) {
    animated.push(this);
    return { onfinish: null, oncancel: null } as unknown as Animation;
  };
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: reduced && query.includes("reduce"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  );
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  for (const g of document.querySelectorAll("[data-letter-pop]")) g.remove();
});

const AT: Instant = { perf: 7, wall: "2026-10-23T00:00:00.000Z" };
const clock: Clock = { now: () => AT };

/** A field and its row, the way a family view holds them. */
function Field({
  initial = "",
  capitalStart,
  locked = false,
  max,
  onInsert,
  level,
}: {
  initial?: string;
  capitalStart?: boolean;
  locked?: boolean;
  max?: number;
  onInsert?: (...args: unknown[]) => void;
  level?: string;
}): JSX.Element {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  const page = (children: ReactNode) =>
    level === undefined ? <>{children}</> : <div data-motion-level={level}>{children}</div>;
  return page(
    <>
      <input aria-label="answer" ref={ref} value={text} onChange={(e) => setText(e.target.value)} />
      <LetterRow
        language="pl"
        clock={clock}
        field={() => ref.current}
        text={text}
        capitalStart={capitalStart}
        max={max}
        locked={locked}
        onInsert={(next, at, modality) => {
          onInsert?.(next, at, modality);
          setText(next);
        }}
      />
    </>,
  );
}

const field = () => screen.getByLabelText("answer") as HTMLInputElement;
const key = (letter: string) =>
  document.querySelector(`[data-letter="${letter}"]`) as HTMLButtonElement;
const tap = (letter: string) => fireEvent.pointerDown(key(letter), { button: 0 });
const letters = () =>
  [...document.querySelectorAll("[data-letter]")].map((k) => k.getAttribute("data-letter"));
const row = () => screen.getByRole("group", { name: "Polskie litery" });
const capitalsKey = () => screen.getByRole("button", { name: "Wielkie litery" });
const pops = () => [...document.querySelectorAll("[data-letter-pop]")].map((g) => g.textContent);
const moved = (selector: string) => animated.filter((el) => el.matches(selector));

describe("insertAt", () => {
  it("puts the letter over the selection and the caret after it", () => {
    expect(insertAt("mrz", "ó", 2, 2)).toEqual({ text: "mróz", caret: 3 });
    expect(insertAt("abc", "ż", 1, 3)).toEqual({ text: "aż", caret: 2 });
    expect(insertAt("", "Ł", 0, 0)).toEqual({ text: "Ł", caret: 1 });
  });
});

describe("LetterRow", () => {
  it("shows all nine letters, in capitals on an empty field that starts a sentence, with a capitals key", () => {
    render(<Field capitalStart />);
    expect(POLISH_LETTERS).toEqual(["ą", "ć", "ę", "ł", "ń", "ó", "ś", "ź", "ż"]);
    expect(letters()).toEqual(["Ą", "Ć", "Ę", "Ł", "Ń", "Ó", "Ś", "Ź", "Ż"]);
    expect(screen.getByRole("group", { name: "Polskie litery" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Wielkie litery" }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("drops to lowercase after the first letter, and the capitals key switches all nine", () => {
    render(<Field capitalStart />);
    tap("Ł");
    expect(field().value).toBe("Ł");
    expect(letters()).toEqual([...POLISH_LETTERS]);
    fireEvent.pointerDown(screen.getByRole("button", { name: "Wielkie litery" }), { button: 0 });
    expect(letters()).toEqual(POLISH_LETTERS.map((l) => l.toUpperCase()));
    fireEvent.change(field(), { target: { value: "" } });
    expect(letters()).toEqual(POLISH_LETTERS.map((l) => l.toUpperCase()));
  });

  it("starts lowercase on an empty field where no capital is expected: a gap inside a word (dl-w3.68.22)", () => {
    render(<Field />);
    expect(letters()).toEqual([...POLISH_LETTERS]);
    expect(
      screen.getByRole("button", { name: "Wielkie litery" }).getAttribute("aria-pressed"),
    ).toBe("false");
    tap("ó");
    expect(field().value).toBe("ó");
    fireEvent.change(field(), { target: { value: "" } });
    expect(letters()).toEqual([...POLISH_LETTERS]);
  });

  it("starts in lowercase on a field that already holds a word", () => {
    render(<Field capitalStart initial="mr" />);
    expect(letters()).toEqual([...POLISH_LETTERS]);
  });

  it("puts the letter at the caret, keeps the focus there and moves the caret after it", () => {
    render(<Field initial="mrz" />);
    field().focus();
    field().setSelectionRange(2, 2);
    tap("ó");
    expect(field().value).toBe("mróz");
    expect(document.activeElement).toBe(field());
    expect(field().selectionStart).toBe(3);
    expect(field().selectionEnd).toBe(3);
  });

  it("never takes the focus from the field: the key’s pointerdown is cancelled", () => {
    render(<Field initial="a" />);
    const down = new Event("mousedown", { bubbles: true, cancelable: true });
    key("ę").dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
  });

  it("stamps the press instant and says it was a tap; a keyboard activation says keyboard", () => {
    const onInsert = vi.fn();
    render(<Field capitalStart onInsert={onInsert} />);
    tap("Ż");
    expect(onInsert).toHaveBeenLastCalledWith("Ż", AT, "click");
    fireEvent.click(key("ą"), { detail: 0 });
    expect(onInsert).toHaveBeenLastCalledWith("Żą", AT, "keyboard");
  });

  it("shows the key as pressed while the finger is on it", () => {
    render(<Field capitalStart />);
    tap("Ę");
    expect(key("ę").getAttribute("data-pressed")).toBe("true");
    fireEvent.pointerUp(key("ę"));
    expect(key("ę").getAttribute("data-pressed")).toBe("false");
  });

  it("types nothing when locked or when the field is full", () => {
    const onInsert = vi.fn();
    const { unmount } = render(<Field capitalStart locked onInsert={onInsert} />);
    tap("Ą");
    unmount();
    render(<Field initial="ab" max={2} onInsert={onInsert} />);
    tap("ą");
    expect(onInsert).not.toHaveBeenCalled();
    expect(field().value).toBe("ab");
  });

  it("lays the ten keys in one row, the capitals key first, and two rows of five only in a narrow column (dl-w3.68.28, dl-w3.68.30)", () => {
    render(<Field />);
    expect(row().className).toMatch(/\bgrid\b/);
    expect(row().className).toMatch(/(^|\s)grid-cols-5\b/);
    expect(row().className).toMatch(/@min-\[35rem\]:grid-cols-10\b/);
    expect(row().className).not.toMatch(/flex-wrap/);
    // 35rem is ten kid-size targets: the query is on the row's own column.
    expect(must(row().parentElement).className).toMatch(/@container/);
    const keys = [...row().querySelectorAll("button")].map(
      (k) => k.getAttribute("data-letter") ?? "capitals",
    );
    expect(keys).toEqual(["capitals", ...POLISH_LETTERS]);
  });

  it("draws each key as a tile inside a kid-size target, lowercase by default", () => {
    render(<Field />);
    for (const k of row().querySelectorAll("button")) {
      expect(k.className).toMatch(/size-\[var\(--kid-tap-min\)\]/);
      expect(k.querySelector("[data-pill]")).not.toBeNull();
    }
    expect(letters()).toEqual([...POLISH_LETTERS]);
  });

  it("draws every key at least the kid tap size", () => {
    render(<Field />);
    for (const k of document.querySelectorAll("[data-letters] button"))
      expect(k.className).toMatch(/min-h-\[var\(--kid-tap-min\)\]/);
  });

  it("lights the key for a marked letter the keyboard typed, for a beat, and not for a plain letter", () => {
    vi.useFakeTimers();
    render(<Field initial="mr" />);
    fireEvent.change(field(), { target: { value: "mró" } });
    expect(key("ó").getAttribute("data-lit")).toBe("true");
    act(() => vi.advanceTimersByTime(ECHO_MS));
    expect(key("ó").getAttribute("data-lit")).toBe("false");
    fireEvent.change(field(), { target: { value: "mróz" } });
    expect(document.querySelector('[data-lit="true"]')).toBeNull();
    // A capital on the keyboard lights its key too.
    fireEvent.change(field(), { target: { value: "Żmróz" } });
    expect(key("ż").getAttribute("data-lit")).toBe("true");
  });

  it("reads the one letter a change added, wherever it went", () => {
    expect(added("mrz", "mróz")).toBe("ó");
    expect(added("", "Ł")).toBe("Ł");
    expect(added("ab", "abc")).toBe("c");
    expect(added("ab", "xy")).toBeNull();
    expect(added("ab", "abcd")).toBeNull();
  });

  it("in full motion sinks the pill, pops the letter in and turns the glyphs over on a case flip", () => {
    render(<Field initial="mr" />);
    expect(row().getAttribute("data-motion")).toBe("full");
    field().focus();
    field().setSelectionRange(2, 2);
    tap("ó");
    expect(moved("[data-pill]")).toHaveLength(1);
    expect(pops()).toEqual(["ó"]);
    fireEvent.pointerDown(capitalsKey(), { button: 0 });
    expect(moved("[data-glyph]")).toHaveLength(10);
  });

  it("plays calm when the page says calm: the same motions, only shorter", () => {
    render(<Field initial="mr" level="calm" />);
    expect(row().getAttribute("data-motion")).toBe("calm");
    tap("ó");
    expect(moved("[data-pill]")).toHaveLength(1);
  });

  it("plays no motion under reduced, from the page or the device, and still types and lights", () => {
    render(<Field initial="mr" level="reduced" />);
    expect(row().getAttribute("data-motion")).toBe("reduced");
    tap("ó");
    fireEvent.pointerDown(capitalsKey(), { button: 0 });
    expect(field().value).toBe("mró");
    expect(letters()).toEqual(POLISH_LETTERS.map((l) => l.toUpperCase()));
    expect(animated).toEqual([]);
    expect(pops()).toEqual([]);
    expect(key("Ó").getAttribute("data-pressed")).toBe("true");
    cleanup();
    reduced = true;
    render(<Field initial="mr" />);
    expect(row().getAttribute("data-motion")).toBe("reduced");
    tap("ę");
    expect(animated).toEqual([]);
  });

  it("shows all nine letters in both cases, whatever was typed", () => {
    render(<Field initial="mr" />);
    expect(letters()).toEqual([...POLISH_LETTERS]);
    fireEvent.pointerDown(capitalsKey(), { button: 0 });
    expect(letters()).toEqual(POLISH_LETTERS.map((l) => l.toUpperCase()));
  });

  it("marks every key for a page that clicks on each tap", () => {
    render(<Field />);
    for (const k of row().querySelectorAll("button"))
      expect(k.hasAttribute("data-key-click")).toBe(true);
  });
});
