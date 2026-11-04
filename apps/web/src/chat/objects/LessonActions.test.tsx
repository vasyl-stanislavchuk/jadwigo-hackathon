// @vitest-environment happy-dom
/**
 * The lesson card's actions (dl-uukj.47.55), the footer's before #740 (dl-z5ja.108.1.1). Daj
 * lekcję gives at once, with or without a child, and shows one link to copy or open. "Drukuj" draws
 * the lesson's print sheet and asks the browser to print. Not ready, nothing happens.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonActions } from "./LessonActions.tsx";

afterEach(cleanup);
// Daj lekcję opens a tab; a unit test opens none (no network).
beforeEach(() => {
  vi.spyOn(window, "open").mockReturnValue(null);
});

const lesson = foldRun(
  (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) => RunEvent.parse(e)),
).lesson;
const ola = {
  id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
  first_name: "Ola",
  school_grade: null,
} as unknown as Learner;

function footer(changes: Partial<Parameters<typeof LessonActions>[0]> = {}) {
  const props = {
    language: "pl" as const,
    ready: true,
    child: null,
    onGive: vi.fn(),
    lesson,
    print: vi.fn(),
    ...changes,
  };
  render(<LessonActions {...props} />);
  return props;
}

const give = () => document.querySelector("[data-give]") as HTMLElement;

describe("the lesson card's actions (dl-uukj.47.55)", () => {
  it("say who the lesson is for; Drukuj is an icon and prints with no dialog; no Zapisz", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((go) => {
      go(0);
      return 0;
    });
    const props = footer();
    expect(document.querySelector("[data-for-whom]")?.textContent).toBe("Dla kogo: Bez dziecka");
    // Every lesson is already in Lekcje (owner, 2026-11-03).
    expect(screen.queryByRole("button", { name: "Zapisz na później" })).toBeNull();
    expect(screen.getByRole("button", { name: "Drukuj" }).hasAttribute("data-print")).toBe(true);
    await act(async () => fireEvent.click(document.querySelector("[data-print]") as HTMLElement));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.print).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-print-sheet]")).not.toBeNull();
    await act(async () => window.dispatchEvent(new Event("afterprint")));
    expect(document.querySelector("[data-print-sheet]")).toBeNull();
    cleanup();
    footer({ child: ola });
    expect(document.querySelector("[data-for-whom]")?.textContent).toBe("Dla kogo: Ola");
    cleanup();
    // The page's Dla select takes the place of the words.
    footer({ forWhom: <span data-test-dla>Dla</span> });
    expect(document.querySelector("[data-test-dla]")).not.toBeNull();
    expect(document.querySelector("[data-for-whom]")).toBeNull();
  });

  it("Daj lekcję and Wydrukuj are quiet with their reason until the lesson's check passed", async () => {
    const props = footer({ ready: false });
    const print = document.querySelector("[data-print]") as HTMLElement;
    for (const button of [give(), print]) {
      expect(button.getAttribute("aria-disabled")).toBe("true");
      const reason = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(reason?.textContent).toBe(
        "„Daj lekcję” i „Wydrukuj” zadziałają, gdy lekcja przejdzie sprawdzenie",
      );
    }
    // A lesson that has not passed its check (a harsh word included) never reaches paper.
    await act(async () => fireEvent.click(print));
    expect(props.print).not.toHaveBeenCalled();
    expect(document.querySelector("[data-print-sheet]")).toBeNull();
    cleanup();
    footer();
    expect(give().getAttribute("aria-describedby")).toBeNull();
    expect(document.querySelector("[data-print]")?.getAttribute("aria-describedby")).toBeNull();
    expect(give().getAttribute("aria-disabled")).toBeNull();
  });
});

describe("giving and printing only a checked lesson (steward on #747)", () => {
  it("Wydrukuj is quiet with the same reason until the check passed, and prints nothing", async () => {
    const props = footer({ ready: false });
    const print = document.querySelector("[data-print]") as HTMLElement;
    expect(print.getAttribute("aria-disabled")).toBe("true");
    const reasonOf = (el: Element) =>
      document.getElementById(el.getAttribute("aria-describedby") ?? "")?.textContent;
    expect(reasonOf(print)).toBe(reasonOf(give()));
    await act(async () => fireEvent.click(print));
    expect(props.print).not.toHaveBeenCalled();
    expect(document.querySelector("[data-print-sheet]")).toBeNull();
  });

  it("with a child and nothing to give with, Daj lekcję is quiet with its reason", async () => {
    footer({ child: ola, onGive: undefined });
    expect(give().getAttribute("aria-disabled")).toBe("true");
    expect(
      document.getElementById(give().getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe("Dawanie lekcji zadziała po zalogowaniu.");
  });

  it("shows the given link to copy or open, and why when it was refused", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    footer({
      child: ola,
      given: { kind: "given", name: "Ola", href: "/play/asg_x?learner=lrn_y" },
    });
    const url = `${window.location.origin}/play/asg_x?learner=lrn_y`;
    expect(document.querySelector("[data-give-state='given']")?.textContent).toContain(
      "Lekcja czeka na: Ola.",
    );
    expect((document.querySelector("[data-given-url]") as HTMLInputElement).value).toBe(url);
    const open = screen.getByRole("link", { name: "Otwórz lekcję" });
    expect(open.getAttribute("href")).toBe("/play/asg_x?learner=lrn_y");
    expect(open.getAttribute("target")).toBe("_blank");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kopiuj" })));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(url);
    expect(screen.getByRole("button", { name: "Skopiowano" })).toBeTruthy();
    cleanup();
    // With no child, the same link, and it says anyone may play.
    footer({ given: { kind: "given", name: null, href: "/play/asg_x" } });
    expect(document.querySelector("[data-give-state='given']")?.textContent).toContain(
      "Każdy, kto ma ten link, może zagrać",
    );
    cleanup();
    footer({ child: ola, given: { kind: "refused", reason: "changed" } });
    expect(document.querySelector("[data-give-state]")?.textContent).toMatch(
      /^Lekcja zmieniła się od ostatniego sprawdzenia/,
    );
    cleanup();
    const props = footer({ child: ola, given: { kind: "giving" } });
    expect(document.querySelector("[data-give-state]")?.textContent).toBe("Daję lekcję…");
    fireEvent.click(give());
    expect(props.onGive).not.toHaveBeenCalled();
  });
});

describe("Daj lekcję (dl-z5ja.108.1.1)", () => {
  it("gives at once with or without a child, with no dialog; not ready, nothing happens", async () => {
    const none = footer();
    await act(async () => fireEvent.click(give()));
    expect(none.onGive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    const child = footer({ child: ola });
    await act(async () => fireEvent.click(give()));
    expect(child.onGive).toHaveBeenCalledTimes(1);
    cleanup();
    const quiet = footer({ ready: false });
    await act(async () => fireEvent.click(give()));
    expect(quiet.onGive).not.toHaveBeenCalled();
  });

  it("with no way to give, it is quiet with its reason, child or no child", () => {
    footer({ onGive: undefined });
    expect(give().getAttribute("aria-disabled")).toBe("true");
    expect(
      document.getElementById(give().getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe("Dawanie lekcji zadziała po zalogowaniu.");
  });

  it("Drukuj draws the sheet of every step with no answer, and prints", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((go) => {
      go(0);
      return 0;
    });
    const props = footer();
    await act(async () => fireEvent.click(document.querySelector("[data-print]") as HTMLElement));
    expect(props.print).toHaveBeenCalledTimes(1);
    const sheet = document.querySelector("[data-print-sheet]");
    expect(sheet?.parentElement).toBe(document.body);
    expect(
      [...(sheet?.querySelectorAll("[data-print-step]") ?? [])].map((s) =>
        s.getAttribute("data-print-step"),
      ),
    ).toEqual(["s02", "s05", "s06", "s07"]);
    expect(sheet?.textContent).not.toContain("Poprawna odpowiedź");
    // Only while the sheet is in the page does printing hide the app; after printing it leaves.
    expect(document.body.hasAttribute("data-printing")).toBe(true);
    await act(async () => window.dispatchEvent(new Event("afterprint")));
    expect(document.querySelector("[data-print-sheet]")).toBeNull();
    expect(document.body.hasAttribute("data-printing")).toBe(false);
  });
});
