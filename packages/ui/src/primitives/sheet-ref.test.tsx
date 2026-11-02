// @vitest-environment happy-dom
// The Sheet's overlay takes the ref Radix's portal gives it (dl-uukj.47.26): opening the parent's
// phone drawer logged "Function components cannot be given refs … at SheetOverlay". A file of its
// own, because React says a warning once per component: a sheet any earlier test opened would hide it.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "./sheet.tsx";

afterEach(cleanup);

describe("Sheet", () => {
  it("opens without React's ref warning", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <Sheet defaultOpen>
        <SheetContent side="left" closeLabel="Zamknij">
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Lekcje</SheetDescription>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog")).toBeDefined();
    const said = errors.mock.calls.map((call) => call.map(String).join(" "));
    errors.mockRestore();
    expect(said.filter((line) => line.includes("cannot be given refs"))).toEqual([]);
  });
});
