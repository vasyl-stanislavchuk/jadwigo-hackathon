// @vitest-environment happy-dom
/**
 * The lesson card's actions (dl-uukj.47.55), the footer's before #740 (dl-z5ja.108.1.1). Daj
 * lekcję: with no child it opens a dialog with 2 choices;
 * "Drukuj" draws the lesson's print sheet and asks the browser to print; "Otwórz na tym
 * komputerze" is quiet with its reason until a route opens the lesson for the player. With a child
 * the primary is "Pokaż {imię}". Not ready, nothing opens.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LessonActions } from "./LessonActions.tsx";

afterEach(cleanup);

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

  it("says where the lesson waits once given, and why when it was refused", () => {
    footer({
      child: ola,
      given: { kind: "given", name: "Ola", href: "/play/asg_x?learner=lrn_y" },
    });
    const state = document.querySelector("[data-give-state]");
    expect(state?.textContent).toBe("Lekcja czeka na: Ola. Link do lekcji");
    expect(screen.getByRole("link", { name: "Link do lekcji" }).getAttribute("href")).toBe(
      "/play/asg_x?learner=lrn_y",
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
  it("with no child opens a dialog with the 2 choices", async () => {
    footer();
    await act(async () => fireEvent.click(give()));
    const dialog = screen.getByRole("dialog", { name: "Jak dać lekcję?" });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("button", { name: "Otwórz na tym komputerze" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Drukuj" })).toBeTruthy();
  });

  it("Drukuj closes the dialog, draws the sheet of every step with no answer, and prints", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((go) => {
      go(0);
      return 0;
    });
    const props = footer();
    await act(async () => fireEvent.click(give()));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Drukuj" })));
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("Otwórz na tym komputerze is quiet with its reason until it can open the lesson", async () => {
    const onOpenHere = vi.fn();
    footer();
    await act(async () => fireEvent.click(give()));
    const here = screen.getByRole("button", { name: "Otwórz na tym komputerze" });
    expect(here.getAttribute("aria-disabled")).toBe("true");
    const reason = document.getElementById(here.getAttribute("aria-describedby") ?? "");
    expect(reason?.textContent).toBe("Otwieranie lekcji na komputerze jest w drodze.");
    cleanup();
    footer({ onOpenHere });
    await act(async () => fireEvent.click(give()));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Otwórz na tym komputerze" })),
    );
    expect(onOpenHere).toHaveBeenCalledTimes(1);
  });

  it("with a child the primary is Pokaż and opens no dialog; not ready, nothing opens", async () => {
    const props = footer({ child: ola });
    await act(async () => fireEvent.click(give()));
    expect(props.onGive).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    footer({ ready: false });
    await act(async () => fireEvent.click(give()));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
