// @vitest-environment happy-dom
/**
 * The lesson card's actions (dl-uukj.47.55), the footer's before #740 (dl-z5ja.108.1.1). Daj
 * lekcję gives at once, with or without a child, and shows one link to copy or open. "Drukuj" opens
 * a tab and sends it to the lesson's PDF from the print routes (dl-1eieq.8.11), or says why not.
 * Not ready, nothing happens.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { RunEvent } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LessonActions, PrintFailed } from "./LessonActions.tsx";

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
    print: vi.fn(async () => "https://bucket.test/sheet.pdf"),
    ...changes,
  };
  render(<LessonActions {...props} />);
  return props;
}

const give = () => document.querySelector("[data-give]") as HTMLElement;

describe("the lesson card's actions (dl-uukj.47.55)", () => {
  it("say who the lesson is for; Drukuj is an icon and prints with no dialog; no Zapisz", async () => {
    const props = footer();
    expect(document.querySelector("[data-for-whom]")?.textContent).toBe("Dla kogo: Bez dziecka");
    // Every lesson is already in Lekcje (owner, 2026-11-03).
    expect(screen.queryByRole("button", { name: "Zapisz na później" })).toBeNull();
    expect(screen.getByRole("button", { name: "Drukuj" }).hasAttribute("data-print")).toBe(true);
    await act(async () => fireEvent.click(document.querySelector("[data-print]") as HTMLElement));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(props.print).toHaveBeenCalledTimes(1);
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

  it("Drukuj opens a tab in the click and sends it to the lesson's PDF", async () => {
    const tab = { opener: {}, location: { href: "about:blank" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    let made: (url: string) => void = () => {};
    const print = vi.fn(() => new Promise<string>((done) => (made = done)));
    footer({ print });
    const button = document.querySelector("[data-print]") as HTMLElement;
    await act(async () => fireEvent.click(button));
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector("[data-print-said]")?.textContent).toBe("Przygotowuję kartkę…");
    // A second press while the PDF is made starts nothing new.
    await act(async () => fireEvent.click(button));
    expect(print).toHaveBeenCalledTimes(1);
    await act(async () => made("https://bucket.test/sheet.pdf"));
    expect(tab.location.href).toBe("https://bucket.test/sheet.pdf");
    expect(tab.opener).toBeNull();
    expect(document.querySelector("[data-print-said]")?.textContent).toBe("");
  });

  it("a print that fails closes its tab and says so, and Drukuj tries again", async () => {
    const tab = { opener: {}, location: { href: "about:blank" }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window);
    const print = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new PrintFailed("unavailable"))
      .mockRejectedValueOnce(new PrintFailed("slow"))
      .mockResolvedValueOnce("https://bucket.test/sheet.pdf");
    footer({ print });
    const button = document.querySelector("[data-print]") as HTMLElement;
    const said = () => document.querySelector("[data-print-said]")?.textContent;
    await act(async () => fireEvent.click(button));
    expect(tab.close).toHaveBeenCalledTimes(1);
    expect(said()).toBe("Nie udało się przygotować kartki. Spróbuj jeszcze raz.");
    await act(async () => fireEvent.click(button));
    expect(said()).toBe("Kartka jeszcze się przygotowuje. Spróbuj za chwilę.");
    await act(async () => fireEvent.click(button));
    expect(tab.location.href).toBe("https://bucket.test/sheet.pdf");
    expect(said()).toBe("");
  });

  it("with no route to print through, Drukuj is quiet with its reason", () => {
    footer({ print: undefined });
    const button = document.querySelector("[data-print]") as HTMLElement;
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(
      document.getElementById(button.getAttribute("aria-describedby") ?? "")?.textContent,
    ).toBe("Dawanie lekcji zadziała po zalogowaniu.");
  });
});
