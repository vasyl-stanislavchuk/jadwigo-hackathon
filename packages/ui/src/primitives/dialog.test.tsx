// @vitest-environment happy-dom
// The Dialog (dl-xo0q, "small creation = dialog"): named by its title, closes on Escape and on a
// DialogClose, gives the focus back to the control that opened it, and carries the parent's density
// through its portal. happy-dom does no layout, so the 440 width is its utility.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DensityScope } from "../lib/register.tsx";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from "./dialog.tsx";

afterEach(cleanup);

function renderDialog(): void {
  render(
    <DensityScope value="parent">
      <Dialog>
        <DialogTrigger>+</DialogTrigger>
        <DialogContent title="Dodaj dziecko" description="Imię i klasa.">
          <input aria-label="Imię" />
          <DialogFooter>
            <DialogClose>Anuluj</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DensityScope>,
  );
}

describe("Dialog", () => {
  it("opens on its trigger, named by its title and described by its line", () => {
    renderDialog();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    const dialog = screen.getByRole("dialog", { name: "Dodaj dziecko" });
    expect(dialog.getAttribute("aria-describedby")).not.toBeNull();
    expect(screen.getByText("Imię i klasa.")).toBeDefined();
    expect(dialog.classList.contains("max-w-jw-dialog")).toBe(true);
    expect(dialog.classList.contains("rounded-jw-dialog")).toBe(true);
  });

  it("carries the parent's density through its portal", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    expect(screen.getByRole("dialog").getAttribute("data-density")).toBe("parent");
  });

  it("closes on its close and gives the focus back to the trigger", async () => {
    renderDialog();
    const plus = screen.getByRole("button", { name: "+" });
    plus.focus();
    fireEvent.click(plus);
    fireEvent.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    // Radix hands the focus back once the content unmounts, a tick later.
    await waitFor(() => expect(document.activeElement).toBe(plus));
  });

  it("closes on Escape", () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "+" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
