// @vitest-environment happy-dom
// The Sheet opens on its trigger and closes on its close cross, a SheetClose or Escape
// (dl-uukj.30.3). No clock and no network: radix renders the dialog synchronously.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet.tsx";

afterEach(cleanup);

function renderSheet(closeLabel?: string): void {
  render(
    <Sheet>
      <SheetTrigger>Pytanie 3</SheetTrigger>
      <SheetContent side="bottom" {...(closeLabel === undefined ? {} : { closeLabel })}>
        <SheetHeader>
          <SheetTitle>Pytanie 3</SheetTitle>
          <SheetDescription>Ile to 7 + 5?</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose>Gotowe</SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>,
  );
}

describe("Sheet", () => {
  it("opens on its trigger and closes on its close cross", () => {
    renderSheet("Zamknij");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Pytanie 3" }));
    const dialog = screen.getByRole("dialog", { name: "Pytanie 3" });
    expect(dialog.getAttribute("data-side")).toBe("bottom");
    expect(screen.getByText("Ile to 7 + 5?")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Zamknij" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes on a SheetClose and on Escape", () => {
    renderSheet();
    const trigger = screen.getByRole("button", { name: "Pytanie 3" });

    fireEvent.click(trigger);
    expect(screen.queryByRole("button", { name: "Zamknij" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Gotowe" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
