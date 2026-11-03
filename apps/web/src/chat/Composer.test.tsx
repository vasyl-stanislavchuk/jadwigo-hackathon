// @vitest-environment happy-dom
/**
 * The parent's composer (handoff dl-uukj.47.71 §4.5, S6, S22, §3; lane D): Zatrzymaj while a turn
 * runs, Zatrzymuję… at the same width once pressed, Esc from the box stops unless a menu or dialog
 * owns it, one focus ring, Wyślij quiet with its reason while empty, and the focus kept in the
 * composer when the turn ends.
 */

import { type Run, RunEvent, RunId } from "@jadwigo/contracts/run";
import { foldRun } from "@jadwigo/core";
import { RUN_LOGS } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatPane } from "./ChatPane.tsx";
import type { Turn } from "./conversation.ts";

afterEach(cleanup);

const log = (RUN_LOGS.find((l) => l.name === "happy-turn")?.events ?? []).map((e) =>
  RunEvent.parse(e),
);

/** happy-turn up to `seq`: open while it runs, ended with all of it. */
function turn(seq = Number.POSITIVE_INFINITY): Turn {
  const view = foldRun(log.filter((e) => e.seq <= seq));
  return { run: { id: RunId.parse(log[0]?.run_id), status: view.status } as Run, view };
}

function pane(over: { turns?: Turn[]; stopping?: boolean } = {}) {
  const onStop = vi.fn();
  const onSend = vi.fn();
  const props = {
    language: "pl" as const,
    variant: "parent" as const,
    turns: over.turns ?? [turn(2)],
    queued: [],
    restoring: false,
    stopping: over.stopping ?? false,
    sendFailed: false,
    onSend,
    onStop,
  };
  const view = render(<ChatPane {...props} />);
  return {
    onStop,
    onSend,
    rerender: (p: Partial<typeof props>) => view.rerender(<ChatPane {...props} {...p} />),
  };
}

const words = () => screen.getByRole("textbox", { name: "Twoja wiadomość" }) as HTMLTextAreaElement;
const stop = () => document.querySelector("[data-stop]") as HTMLButtonElement | null;

describe("the composer's Stop (S6)", () => {
  it("shows Zatrzymaj only while a turn runs", () => {
    pane();
    expect(stop()?.textContent).toContain("Zatrzymaj");
    cleanup();
    pane({ turns: [turn()] });
    expect(stop()).toBeNull();
  });

  it("Esc sends cancel and the focus stays in the textarea", () => {
    const { onStop } = pane();
    words().focus();
    fireEvent.keyDown(words(), { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(words());
  });

  it("Esc from a button in the box stops too", () => {
    const { onStop } = pane();
    fireEvent.keyDown(stop() as HTMLElement, { key: "Escape" });
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("Esc does nothing while a dialog is open, once already stopping, or with no turn running", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.append(dialog);
    const first = pane();
    fireEvent.keyDown(words(), { key: "Escape" });
    expect(first.onStop).not.toHaveBeenCalled();
    dialog.remove();
    cleanup();
    const stopping = pane({ stopping: true });
    fireEvent.keyDown(words(), { key: "Escape" });
    expect(stopping.onStop).not.toHaveBeenCalled();
    cleanup();
    const ended = pane({ turns: [turn()] });
    fireEvent.keyDown(words(), { key: "Escape" });
    expect(ended.onStop).not.toHaveBeenCalled();
  });

  it("reads Zatrzymuję… once pressed, at the width it had, and a second press sends nothing", () => {
    const { onStop } = pane({ stopping: true });
    const button = stop() as HTMLButtonElement;
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.querySelector("[data-slot='spinner']")).not.toBeNull();
    // Both words stay in the one cell, the hidden one invisible: the width holds.
    const cell = [...button.querySelectorAll(".row-start-1")];
    expect(cell.map((c) => c.textContent)).toEqual(["Zatrzymaj", "Zatrzymuję…"]);
    expect(cell[0]?.className).toContain("invisible");
    fireEvent.click(button);
    expect(onStop).not.toHaveBeenCalled();
  });

  it("keeps the focus in the composer when the turn ends and Zatrzymaj leaves", () => {
    const { rerender } = pane();
    (stop() as HTMLButtonElement).focus();
    rerender({ turns: [turn()] });
    expect(stop()).toBeNull();
    expect(document.activeElement).toBe(words());
  });
});

describe("one focus ring (S22, dl-uukj.47.73)", () => {
  it("draws the ring on the box while the words have focus, and none on the textarea", () => {
    pane();
    const box = document.querySelector("[data-composer]") as HTMLElement;
    // The box's ring follows the textarea only, so a focused button inside draws just its own.
    expect(box.className).toMatch(/has-\[textarea:focus\]:ring-3/);
    expect(box.className).not.toMatch(/focus-within:ring/);
    // The textarea turns off the adult halo the base styles give a focused textarea.
    expect(words().className).toContain("focus-visible:[box-shadow:none]");
    expect(words().className).not.toMatch(/(^|\s)(focus-visible:)?ring-(?!0)/);
  });
});

describe("Wyślij (§4.5)", () => {
  it("is quiet with its reason while empty, and the primary with words", () => {
    const { onSend } = pane({ turns: [] });
    const send = screen.getByRole("button", { name: "Wyślij" });
    expect(send.getAttribute("aria-disabled")).toBe("true");
    expect(document.body.textContent).toContain("Napisz coś albo dodaj zdjęcie.");
    fireEvent.click(send);
    expect(onSend).not.toHaveBeenCalled();
    act(() => {
      fireEvent.change(words(), { target: { value: "Ułamki" } });
    });
    const ready = screen.getByRole("button", { name: "Wyślij" });
    expect(ready).toBe(send);
    expect(ready.getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(ready);
    expect(onSend).toHaveBeenCalledWith("Ułamki");
  });
});
