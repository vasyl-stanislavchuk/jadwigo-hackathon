// @vitest-environment happy-dom
/**
 * The first screen (dl-uukj.47.2, decision dl-xo0q): the question and one box with the caret in it;
 * "Zrób lekcję" quiet with its reason until there are words; Enter sends, Shift+Enter does not;
 * Dla defaults to "Bez dziecka" and lists each child, then "Dodaj dziecko…"; photos stay off until
 * the upload route exists.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewLessonBox } from "./NewLessonBox.tsx";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const ola = { id: OLA, first_name: "Ola", school_grade: null } as unknown as Learner;

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

function box(changes: Partial<Parameters<typeof NewLessonBox>[0]> = {}) {
  const props = {
    language: "pl" as const,
    learners: [ola],
    forLearner: null,
    onForChange: vi.fn(),
    onAddChild: vi.fn(),
    onSend: vi.fn(),
    ...changes,
  };
  render(<NewLessonBox {...props} />);
  return props;
}

const field = () => screen.getByRole("textbox", { name: "Opisz zadanie domowe" });
const send = () => screen.getByRole("button", { name: /Zrób lekcję/ });

describe("the first screen's draft (dl-uukj.47.24)", () => {
  it("keeps the words and Dla across an unmount and a remount", () => {
    box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "Odejmowanie przez 10" } });
    cleanup();

    const props = box();
    expect((field() as HTMLTextAreaElement).value).toBe("Odejmowanie przez 10");
    expect(props.onForChange).toHaveBeenCalledWith(OLA);
  });

  it("keeps the child a page names (?for) over the tab's Dla", () => {
    box({ forLearner: OLA });
    cleanup();
    const tymek = LearnerId.parse("lrn_7qre3atahx8cpak6xbjtz73var");
    const props = box({
      learners: [ola, { ...ola, id: tymek, first_name: "Tymek" } as Learner],
      forLearner: tymek,
    });
    expect(props.onForChange).not.toHaveBeenCalled();
  });

  it("forgets a child who is no longer in the family", () => {
    box({ forLearner: OLA });
    cleanup();
    const props = box({ learners: [] });
    expect(props.onForChange).not.toHaveBeenCalled();
  });

  it("clears the words and Dla once they are sent", () => {
    box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "15 − 7" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    cleanup();

    const props = box();
    expect((field() as HTMLTextAreaElement).value).toBe("");
    expect(props.onForChange).not.toHaveBeenCalled();
  });
});

describe("the first screen", () => {
  it("asks one question over one box, with the caret in it and the example as its placeholder", () => {
    box();
    expect(
      screen.getByRole("heading", { level: 1, name: "Jaką lekcję przygotować?" }),
    ).toBeDefined();
    expect(document.activeElement).toBe(field());
    expect(field().getAttribute("placeholder")).toBe(
      "Np. Odejmowanie przez 10. Pomyliła się w 15 − 7 i 12 − 5.",
    );
    // Photos wait on the upload route (dl-z5ja.11).
    expect(screen.queryByText("Dodaj zdjęcie")).toBeNull();
  });

  it("keeps Zrób lekcję quiet with its reason until there are words, and never sends empty", () => {
    const props = box();
    expect(send().getAttribute("aria-disabled")).toBe("true");
    const reason = screen.getByText("Najpierw opisz zadanie albo dodaj zdjęcie");
    expect(send().getAttribute("aria-describedby")).toBe(reason.id);
    fireEvent.click(send());
    expect(props.onSend).not.toHaveBeenCalled();

    fireEvent.change(field(), { target: { value: "Odejmowanie przez 10" } });
    expect(send().getAttribute("aria-disabled")).toBe("false");
    expect(screen.queryByText("Najpierw opisz zadanie albo dodaj zdjęcie")).toBeNull();
    expect(document.querySelector("[data-new-lesson]")?.hasAttribute("data-ready")).toBe(true);
  });

  it("sends on Enter with the words and the child, and makes a new line on Shift+Enter", () => {
    const props = box({ forLearner: OLA });
    fireEvent.change(field(), { target: { value: "  15 − 7  " } });
    fireEvent.keyDown(field(), { key: "Enter", shiftKey: true });
    expect(props.onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(field(), { key: "Enter" });
    expect(props.onSend).toHaveBeenCalledWith({ text: "15 − 7", photos: [], learner: OLA });
  });

  it("says Dla: Bez dziecka, lists each child, and ends the menu with Dodaj dziecko…", async () => {
    const props = box();
    const dla = document.querySelector("[data-dla]") as HTMLElement;
    expect(dla.textContent).toContain("Dla:");
    expect(dla.textContent).toContain("Bez dziecka");
    await act(async () => fireEvent.click(dla));
    const menu = screen.getByRole("menu", { name: "Dla:" });
    const options = within(menu).getAllByRole("menuitemradio");
    expect(options.map((o) => [o.textContent, o.getAttribute("aria-checked")])).toEqual([
      ["Bez dziecka", "true"],
      ["Ola", "false"],
    ]);
    await act(async () => fireEvent.click(options[1] as HTMLElement));
    expect(props.onForChange).toHaveBeenCalledWith(OLA);

    await act(async () => fireEvent.click(dla));
    const add = within(screen.getByRole("menu")).getByRole("menuitem");
    expect(add.textContent).toContain("Dodaj dziecko…");
    expect(add.textContent).toContain("Imię i klasa.");
    await act(async () => fireEvent.click(add));
    expect(props.onAddChild).toHaveBeenCalledOnce();
  });

  it("shows the chosen child in Dla", () => {
    box({ forLearner: OLA });
    expect(document.querySelector("[data-dla]")?.textContent).toContain("Ola");
  });
});
