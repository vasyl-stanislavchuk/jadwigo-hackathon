// @vitest-environment happy-dom
/**
 * Daj lekcję (handoff §5.6, dl-z5ja.108.1.1): with no child it opens a dialog with 2 choices;
 * "Wydrukuj" draws the lesson's print sheet and asks the browser to print; "Otwórz na tym
 * komputerze" is quiet with its reason until a route opens the lesson for the player. With a child
 * the primary is "Pokaż {imię}". Not ready, nothing opens.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LessonFooter } from "./LessonFooter.tsx";

afterEach(cleanup);

const lesson = foldRun(
  (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) => RunEvent.parse(e)),
).lesson;
const ola = {
  id: LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq"),
  first_name: "Ola",
  school_grade: null,
} as unknown as Learner;

function footer(changes: Partial<Parameters<typeof LessonFooter>[0]> = {}) {
  const props = {
    language: "pl" as const,
    status: "Gotowe zadania: 4 z 4",
    ready: true,
    child: null,
    onSave: vi.fn(),
    onGive: vi.fn(),
    lesson,
    print: vi.fn(),
    ...changes,
  };
  render(<LessonFooter {...props} />);
  return props;
}

const give = () => document.querySelector("[data-give]") as HTMLElement;

describe("Daj lekcję (dl-z5ja.108.1.1)", () => {
  it("with no child opens a dialog with the 2 choices", async () => {
    footer();
    await act(async () => fireEvent.click(give()));
    const dialog = screen.getByRole("dialog", { name: "Jak dać lekcję?" });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole("button", { name: "Otwórz na tym komputerze" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Wydrukuj" })).toBeTruthy();
  });

  it("Wydrukuj closes the dialog, draws the sheet of every step with no answer, and prints", async () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((go) => {
      go(0);
      return 0;
    });
    const props = footer();
    await act(async () => fireEvent.click(give()));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Wydrukuj" })));
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
