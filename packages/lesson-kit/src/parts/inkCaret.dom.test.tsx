/**
 * The ink caret drawn on a page (dl-uukj.29.110): where the bar stands in a left-aligned field and
 * in a centred gap, and that it follows a focused field whose own box grows while the body keeps
 * its size, as a Slots text gap does over its width transition after a letter-mark miss. Happy-dom
 * lays nothing out, so each box and each measured run of text is given here: a letter is 15 px.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { installInkCaret } from "./inkCaret.ts";
import { must } from "./must.ts";

const LETTER = 15;
const boxes = new Map<Element, { left: number; width: number }>();
const watchers: { cb: ResizeObserverCallback; targets: Set<Element> }[] = [];
const realRect = HTMLElement.prototype.getBoundingClientRect;

class FakeObserver {
  entry: { cb: ResizeObserverCallback; targets: Set<Element> };
  constructor(cb: ResizeObserverCallback) {
    this.entry = { cb, targets: new Set() };
    watchers.push(this.entry);
  }
  observe(t: Element) {
    this.entry.targets.add(t);
  }
  unobserve(t: Element) {
    this.entry.targets.delete(t);
  }
  disconnect() {
    this.entry.targets.clear();
  }
}

/** What a browser does when a box changes size: every observer watching it is told. */
function resized(el: Element) {
  for (const w of watchers) if (w.targets.has(el)) w.cb([], {} as ResizeObserver);
}

const frame = () => new Promise((r) => setTimeout(r, 40));
const bar = () => must(document.querySelector<HTMLElement>("[data-ink-caret]"));

function field(
  align: "left" | "center",
  value: string,
  left: number,
  width: number,
): HTMLInputElement {
  const el = document.createElement("input");
  el.type = "text";
  el.value = value;
  // A Slots gap's box: 2 px border, 8 px padding a side.
  el.style.cssText = `text-align:${align};border:2px solid black;padding:0 8px;font-size:26px;box-sizing:border-box`;
  boxes.set(el, { left, width });
  must(document.querySelector("[data-lesson-theme='zeszyt']")).append(el);
  return el;
}

beforeAll(() => {
  globalThis.ResizeObserver = FakeObserver as unknown as typeof ResizeObserver;
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const box = boxes.get(this);
    if (box !== undefined)
      return {
        left: box.left,
        top: 100,
        width: box.width,
        height: 60,
        right: box.left + box.width,
        bottom: 160,
        x: box.left,
        y: 100,
        toJSON() {},
      } as DOMRect;
    // The ruler: a run of text measured as LETTER px a letter.
    const width = (this.textContent ?? "").length * LETTER;
    return {
      left: 0,
      top: 0,
      width,
      height: 30,
      right: width,
      bottom: 30,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect;
  };
  const page = document.createElement("div");
  page.dataset["lessonTheme"] = "zeszyt";
  document.body.append(page);
  installInkCaret();
});

afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = realRect;
});

describe("the ink caret on a page", () => {
  it("stands after the prefix in a left-aligned field", async () => {
    const el = field("left", "dwanaście", 100, 300);
    el.focus();
    el.setSelectionRange(3, 3);
    el.dispatchEvent(new Event("select", { bubbles: true }));
    document.dispatchEvent(new Event("selectionchange"));
    await frame();
    // Content starts at 100 + 2 + 8; three letters in; the bar's 3 px stand 1 px before the end.
    expect(bar().style.display).toBe("block");
    expect(parseFloat(bar().style.left)).toBe(110 + 3 * LETTER - 1);
    el.remove();
  });

  it("stands at the end of the selected letter in a centred gap, and follows the gap as it grows (dl-uukj.29.110)", async () => {
    // polish-spelling-practice s16 after a letter-mark miss: 'morsko' with its last letter
    // selected, the gap 120 px early in its width transition and 130.2 px when it settles.
    const el = field("center", "morsko", 824.5, 120);
    el.focus();
    el.setSelectionRange(5, 6);
    document.dispatchEvent(new Event("selectionchange"));
    await frame();
    const content = (w: number) => w - 2 * 2 - 2 * 8;
    const end = (w: number) => 824.5 + 10 + (content(w) - 6 * LETTER) / 2 + 6 * LETTER - 1;
    expect(parseFloat(bar().style.left)).toBeCloseTo(end(120), 3);

    // The gap widens with no event but its own resize: the body keeps its size.
    boxes.set(el, { left: 824.5, width: 130.2 });
    resized(el);
    await frame();
    expect(parseFloat(bar().style.left)).toBeCloseTo(end(130.2), 3);
    el.remove();
  });

  it("stops watching a field once the focus leaves it", async () => {
    const el = field("center", "morze", 50, 140);
    el.focus();
    await frame();
    el.blur();
    await frame();
    expect(watchers.some((w) => w.targets.has(el))).toBe(false);
    expect(bar().style.display).toBe("none");
    el.remove();
  });
});
