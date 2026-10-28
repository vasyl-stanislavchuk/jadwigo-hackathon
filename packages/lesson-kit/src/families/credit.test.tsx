/**
 * The credit on a borrowed question (dl-uukj.29.136, docs/plan/design-system/source-credit/README.md
 * §1 to §3): "z Khan Academy" in the instruction row of a live step, its card, and the confirmation
 * that stands before every link out of Jadwigo (owner, 2026-10-27). Enter on the credit opens the
 * card and never checks the answer; Esc closes it and gives the focus back; our own and bank
 * questions show nothing.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../parts/must.ts";
import {
  BESIDE_EDGE,
  BESIDE_GAP,
  besideWidth,
  type CreditShown,
  fitsAboveColumn,
  QuestionCredit,
} from "../parts/QuestionCredit.tsx";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import type { Language } from "../stage/types.ts";
import { ChooseView } from "./choose/ChooseView.tsx";
import { Family, QuestionType } from "./names.ts";
import { pageSpec, type SpecOf } from "./types.ts";
import { ViewMode, type ViewProps } from "./view.ts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-27T00:00:00.000Z" }) };

/** A Khan Academy item written in English, as the credit shows it in each language: translated
 * into Polish, shared as is in English. */
const KHAN: Record<Language, CreditShown> = {
  pl: {
    source: "Khan Academy",
    licence: "CC BY-NC-SA 4.0",
    deedUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pl",
    line: "translated",
    notice: "Wszystkie materiały Khan Academy są dostępne za darmo na www.khanacademy.org",
    noticeLink: "www.khanacademy.org",
    home: "https://www.khanacademy.org",
    notAffiliated: true,
  },
  en: {
    source: "Khan Academy",
    licence: "CC BY-NC-SA 4.0",
    deedUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en",
    line: "shared",
    notice: "All Khan Academy content is available for free at www.khanacademy.org",
    noticeLink: "www.khanacademy.org",
    home: "https://www.khanacademy.org",
    notAffiliated: true,
  },
};

/** The flowers item as a Choose step: an instruction above a card that holds the question. */
const flowers: SpecOf<typeof Family.Choose> = {
  id: "k1",
  say: "Wybierz działanie.",
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    stem: { text: "Jest 7 rzędów kwiatów, a w każdym rzędzie 6 kwiatów." },
    options: ["7 × 6", "7 + 6 + 7 + 6", "7 + 6"].map((text, i) => ({
      id: `o${i + 1}`,
      content: { kind: "text", text },
    })),
    select: "one",
    layout: "list",
  },
  key: { correct: ["o1"] },
};

/** `shell` puts the step in a container with these attributes, as StepShell draws a lesson's. */
/** `credited` false draws a question of our own, which carries no credit. */
function draw(
  credited: boolean,
  language: Language = "pl",
  spec = flowers,
  shell?: Record<string, string>,
) {
  const onCommit = vi.fn();
  const props = {
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    language,
    category: "child",
    clock,
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
  };
  const container = document.body.appendChild(document.createElement("div"));
  for (const [name, value] of Object.entries(shell ?? {})) container.setAttribute(name, value);
  render(
    <QuestionCredit credit={credited ? KHAN[language] : null} language={language}>
      <StepFrame stepId={spec.id}>
        <ChooseView {...(props as unknown as ViewProps<typeof Family.Choose>)} />
      </StepFrame>
    </QuestionCredit>,
    { container },
  );
  return onCommit;
}

const trigger = () => must(document.querySelector<HTMLButtonElement>("[data-credit-trigger]"));
const card = () => must(document.querySelector<HTMLElement>("[data-credit-card]"));
const press = (el: Element, key: string) => fireEvent.keyDown(el, { key, bubbles: true });

describe("the credit on a borrowed question", () => {
  it("sits in the instruction row, after the instruction, named for a screen reader and closed", () => {
    draw(true);
    const row = must(document.querySelector("[data-instruction-row]"));
    expect(row.firstElementChild?.matches("[data-instruction]")).toBe(true);
    expect(trigger().textContent).toBe("z Khan Academy");
    expect(trigger().getAttribute("aria-label")).toBe("z Khan Academy, źródło i licencja");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(trigger().getAttribute("aria-controls")).toBe(card().id);
    expect(card().hidden).toBe(true);
    // The row comes before the question card, so the credit never moves when the answer does.
    expect(
      row.compareDocumentPosition(must(document.querySelector("[data-prompt-card]"))) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("opens a card named by its title, with the licence line, the notice and not affiliated", () => {
    draw(true);
    fireEvent.click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog", { name: "Zadanie z Khan Academy" });
    expect(dialog.querySelector("[data-credit-licence]")?.textContent).toBe(
      "Przetłumaczone na polski przez Jadwigo na licencji CC BY-NC-SA 4.0",
    );
    expect(dialog.querySelector("[data-credit-notice]")?.textContent).toBe(
      "Wszystkie materiały Khan Academy są dostępne za darmo na www.khanacademy.org",
    );
    expect(dialog.querySelector("[data-credit-not-affiliated]")?.textContent).toBe(
      "Jadwigo nie jest związane z Khan Academy",
    );
    const links = [...dialog.querySelectorAll<HTMLAnchorElement>("a")];
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pl"],
      ["www.khanacademy.org", "https://www.khanacademy.org"],
    ]);
    // Card lines are labels: no full stop at the end.
    for (const p of dialog.querySelectorAll("p")) expect(p.textContent?.endsWith(".")).toBe(false);
    fireEvent.click(trigger());
    expect(card().hidden).toBe(true);
  });

  it("credits an English item as shared, in English", () => {
    draw(true, "en");
    expect(trigger().textContent).toBe("from Khan Academy");
    fireEvent.click(trigger());
    expect(document.querySelector("[data-credit-licence]")?.textContent).toBe(
      "Shared under CC BY-NC-SA 4.0",
    );
  });

  it("takes Enter as its own: Enter on the credit opens the card and does not check the answer", () => {
    const onCommit = draw(true);
    const option = must(screen.getAllByRole("radio")[0]);
    fireEvent.click(option);
    trigger().focus();
    press(trigger(), "Enter");
    press(trigger(), " ");
    expect(onCommit).not.toHaveBeenCalled();
    // A browser presses a focused button on Enter: the press toggles the card.
    fireEvent.click(trigger(), { detail: 0 });
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(onCommit).not.toHaveBeenCalled();
    // The same Enter from the picked option does check: the rule the credit is the exception to.
    option.focus();
    press(option, "Enter");
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("closes on Esc and gives the focus back to the credit", () => {
    draw(true);
    trigger().focus();
    fireEvent.click(trigger());
    const link = must(card().querySelector<HTMLElement>("a"));
    link.focus();
    press(link, "Escape");
    expect(card().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it("closes on its ×, and on a press outside it (Sprawdź among them)", () => {
    draw(true);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(card().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    fireEvent.click(trigger());
    fireEvent.pointerDown(must(document.querySelector("[data-prompt-card]")));
    expect(card().hidden).toBe(true);
  });

  it("puts the confirmation between the card and the outside link, the focus on stay", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    draw(true);
    fireEvent.click(trigger());
    const licence = must(card().querySelector<HTMLAnchorElement>("a"));
    const followed = fireEvent.click(licence);
    // The link does not leave: its default is stopped and nothing opens yet.
    expect(followed).toBe(false);
    expect(open).not.toHaveBeenCalled();
    const confirm = screen.getByRole("alertdialog", { name: "Ten link prowadzi poza Jadwigo" });
    expect(confirm.textContent).toContain("Otworzy się creativecommons.org w nowej karcie");
    expect(document.activeElement?.textContent).toBe("Zostań");
    expect(card().hidden).toBe(false);
    // Stay: the card's lines come back, the focus on the link, and nothing opened.
    fireEvent.click(screen.getByRole("button", { name: "Zostań" }));
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(licence);
    expect(open).not.toHaveBeenCalled();
    // Esc in the confirmation is stay too, and the card stays open.
    fireEvent.click(licence);
    press(must(document.activeElement), "Escape");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(card().hidden).toBe(false);
    // Going on opens the page in a new tab.
    fireEvent.click(must(card().querySelectorAll<HTMLAnchorElement>("a")[1]));
    fireEvent.click(screen.getByRole("button", { name: "Otwórz" }));
    expect(open).toHaveBeenCalledWith(
      "https://www.khanacademy.org",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("shows nothing on a question of our own, and keeps no space", () => {
    draw(false);
    expect(document.querySelector("[data-credit-trigger]")).toBeNull();
    expect(document.querySelector("[data-instruction-row]")).toBeNull();
    expect(document.querySelector("[data-instruction]")?.textContent).toBe("Wybierz działanie.");
  });

  it("stands alone above the card when the card holds the task itself", () => {
    draw(true, "pl", {
      ...flowers,
      data: { ...flowers.data, stem: undefined },
    } as SpecOf<typeof Family.Choose>);
    const row = must(document.querySelector("[data-instruction-row]"));
    expect(row.hasAttribute("data-alone")).toBe(true);
    expect(row.querySelector("[data-instruction]")).toBeNull();
    expect(row.querySelector("[data-credit-trigger]")).not.toBeNull();
  });
});

/**
 * The owner's placement (2026-10-27, dl-uukj.29.138): the open card covers nothing of the question.
 * Beside the column when the margin holds it; in the playground, else above the column; else
 * under the credit.
 */
describe("where the open card stands", () => {
  const lessonAt = (width: number) =>
    besideWidth({ roomRight: width, columnRight: (width + 720) / 2 });
  const credit = () => screen.getByRole("button", { name: /z Khan Academy, źródło i licencja/ });

  it("stands beside the 720 lesson column on a laptop from a window 1256 wide, under the credit below that", () => {
    expect(lessonAt(1024)).toBeNull();
    expect(lessonAt(1255)).toBeNull();
    expect(lessonAt(1256)).toBe(240);
    expect(lessonAt(1280)).toBe(252);
    expect(lessonAt(1440)).toBe(320);
  });

  it("never leaves its room: the gap, the card and the edge fit in the margin", () => {
    for (const width of [1256, 1280, 1366, 1440, 1920]) {
      expect(
        (width + 720) / 2 + BESIDE_GAP + must(lessonAt(width)) + BESIDE_EDGE,
      ).toBeLessThanOrEqual(width);
    }
  });

  it("in the playground, stands beside only when the page left of the controls holds it", () => {
    // Try it at 1280 with the controls open: the column ends at 891, the page at 960.
    expect(besideWidth({ roomRight: 960, columnRight: 891 })).toBeNull();
    // The controls closed: the page runs to the window's edge.
    expect(besideWidth({ roomRight: 1280, columnRight: 891 })).toBe(320);
    // Nowhere to stand beside: a phone, a tablet.
    expect(besideWidth({ roomRight: null, columnRight: 374 })).toBeNull();
  });

  it("fits above the column only when the card clears the header", () => {
    expect(fitsAboveColumn({ columnTop: 319, ceiling: 48, cardHeight: 225 })).toBe(true);
    expect(fitsAboveColumn({ columnTop: 200, ceiling: 48, cardHeight: 225 })).toBe(false);
  });

  it("opens beside in a laptop lesson, and Esc still closes it", () => {
    // happy-dom lays nothing out: the column measures 0 wide, in a window 1440 wide.
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1440);
    draw(true, "pl", flowers, {
      "data-step-shell": "",
      "data-framed": "",
      "data-frame": "laptop",
    });
    fireEvent.click(credit());
    const card = must(document.querySelector<HTMLElement>("[data-credit-card]"));
    expect(card.hidden).toBe(false);
    expect(card.dataset["place"]).toBe("beside");
    expect(card.style.getPropertyValue("--credit-width")).toMatch(/^\d+px$/);
    expect(card.style.getPropertyValue("--credit-bridge")).toBe(`${BESIDE_GAP}px`);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(card.hidden).toBe(true);
    expect(card.dataset["place"]).toBe("below");
  });

  it("opens above the column in the playground when the controls leave no margin", () => {
    // Try it at 1280: the page 304 to 960 under a 48 header, the column from 319, the credit at 380.
    const box = (left: number, top: number, right: number, bottom: number): DOMRect =>
      ({
        left,
        top,
        right,
        bottom,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        toJSON: () => ({}),
      }) as DOMRect;
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      if (this.hasAttribute("data-credit-room")) return box(304, 48, 960, 1200);
      if (this.hasAttribute("data-credit-card")) return box(571, 404, 891, 635);
      if (this.hasAttribute("data-credit-panel")) return box(571, 410, 891, 635);
      if (this.hasAttribute("data-credit-wrap")) return box(769, 380, 891, 404);
      if (this.hasAttribute("data-credit-trigger")) return box(769, 368, 891, 416);
      return box(373, 319, 891, 1044);
    });
    draw(true, "pl", flowers, { "data-credit-room": "" });
    fireEvent.click(credit());
    const card = must(document.querySelector<HTMLElement>("[data-credit-card]"));
    expect(card.dataset["place"]).toBe("over-column");
    // The bridge runs from the credit up past the column's top: 380 - 319 + 12.
    expect(card.style.getPropertyValue("--credit-lift")).toBe("73px");
  });

  it.each([
    ["a step with no room marked", { "data-step-shell": "", "data-frame": "laptop" }],
    ["a lesson on a phone", { "data-step-shell": "", "data-framed": "", "data-frame": "phone" }],
  ])("opens under the credit in %s", (_, shell) => {
    draw(true, "pl", flowers, shell);
    fireEvent.click(credit());
    expect(must(document.querySelector<HTMLElement>("[data-credit-card]")).dataset["place"]).toBe(
      "below",
    );
  });
});
