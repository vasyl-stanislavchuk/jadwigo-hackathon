// @vitest-environment happy-dom
// Button and PopoverTrigger take a ref (dl-uukj.47.42, .46): Radix's Slot passes the trigger's ref
// to the element inside, and on React 18 a plain function component drops it with "Function
// components cannot be given refs", so the popover has no anchor. A file of its own, because React
// says that warning once per component: an earlier test in the same file would hide it.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button } from "./button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";

afterEach(cleanup);

describe("refs", () => {
  it("a ref passed to Button is the DOM button", () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Zmień</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe("Zmień");
  });

  it("PopoverTrigger asChild around a Button opens with no ref warning, and hands its ref on", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const ref = createRef<HTMLButtonElement>();
    render(
      <Popover>
        <PopoverTrigger asChild ref={ref}>
          <Button>Zmień</Button>
        </PopoverTrigger>
        <PopoverContent>Ola</PopoverContent>
      </Popover>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zmień" })));
    expect(screen.getByText("Ola")).toBeDefined();
    expect(ref.current).toBe(screen.getByRole("button", { name: "Zmień" }));
    const said = errors.mock.calls.map((call) => call.map(String).join(" "));
    errors.mockRestore();
    expect(said.filter((line) => line.includes("cannot be given refs"))).toEqual([]);
  });
});
