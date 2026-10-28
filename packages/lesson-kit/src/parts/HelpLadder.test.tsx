import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelpLadder } from "./HelpLadder.tsx";

const STEPS = ["Spójrz na dziesiątki.", "4 + 8 = 12.", "Dopisz 1 nad setkami."];

// A keyboard activation: press() acts on a click with detail 0.
const keyed = (fn: () => void) => ({
  onPointerDown: () => {},
  onClick: (e: { detail: number }) => e.detail === 0 && fn(),
});

function Note({ onDontKnow = () => {} }: { onDontKnow?: () => void }): JSX.Element {
  const [shown, setShown] = useState(1);
  return (
    <HelpLadder
      language="pl"
      cards={STEPS.slice(0, shown)}
      of={STEPS.length}
      more={shown < STEPS.length ? keyed(() => setShown((n) => n + 1)) : null}
      dontKnow={keyed(onDontKnow)}
    />
  );
}

describe("HelpLadder: the help note", () => {
  afterEach(cleanup);

  it("grows card by card under one counter, older cards muted, and has no more to ask at the end", () => {
    render(<Note />);
    expect(screen.getByText("1 z 3")).toBeTruthy();
    expect(screen.queryByText("4 + 8 = 12.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Więcej pomocy" }), { detail: 0 });
    expect(screen.getByText("2 z 3")).toBeTruthy();
    expect(
      screen
        .getByText("Spójrz na dziesiątki.")
        .closest("[data-help-card]")
        ?.hasAttribute("data-old"),
    ).toBe(true);
    expect(
      screen.getByText("4 + 8 = 12.").closest("[data-help-card]")?.hasAttribute("data-old"),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Więcej pomocy" }), { detail: 0 });
    expect(screen.getByText("3 z 3")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Więcej pomocy" })).toBeNull();
  });

  it('keeps the focus on "Więcej pomocy" as a card joins, so a second press works (§3.2)', () => {
    render(<Note />);
    const more = screen.getByRole("button", { name: "Więcej pomocy" });
    more.focus();
    fireEvent.click(more, { detail: 0 });
    expect(document.activeElement).toBe(more);
    expect(screen.getByText("2 z 3")).toBeTruthy();
  });

  it('ends with "Jeszcze nie wiem", the way out of the step', () => {
    const out = vi.fn();
    render(<Note onDontKnow={out} />);
    const link = screen.getByRole("button", { name: "Jeszcze nie wiem" });
    expect(link.closest("[data-help-note]")?.lastElementChild).toBe(link);
    fireEvent.click(link, { detail: 0 });
    expect(out).toHaveBeenCalledOnce();
  });

  // Choose addendum 1.1 (dl-uukj.29.77): the note that opens or grows shows whole, not its head.
  it("in a lesson brings the whole note into view as it opens and grows, or its newest card once it is taller than the room", async () => {
    const scroll = await import("./scroll.ts");
    const show = vi.spyOn(scroll, "scrollToShow").mockImplementation(() => undefined);
    const rects = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 700, bottom: 900, height: 200 } as DOMRect);
    render(
      <div data-learner-view>
        <Note />
      </div>,
    );
    const note = document.querySelector("[data-help-note]");
    expect(show).toHaveBeenLastCalledWith(note, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Więcej pomocy" }), { detail: 0 });
    expect(show).toHaveBeenLastCalledWith(note, expect.anything());
    rects.mockReturnValue({ top: 100, bottom: 5100, height: 5000 } as DOMRect);
    fireEvent.click(screen.getByRole("button", { name: "Więcej pomocy" }), { detail: 0 });
    expect(show).toHaveBeenLastCalledWith(
      screen.getByText("Dopisz 1 nad setkami.").closest("[data-help-card]"),
      expect.anything(),
    );
    expect(show).toHaveBeenCalledTimes(3);
    show.mockRestore();
    rects.mockRestore();
  });
});
