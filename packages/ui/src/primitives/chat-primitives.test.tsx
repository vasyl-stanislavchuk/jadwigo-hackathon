// @vitest-environment happy-dom
// The primitives the chat redesign adds (dl-uukj.47.71.1, handoff §9): Collapsible, which a turn and
// its stages fold with; Separator, whose label is the day divider; and the adult's square icon
// sizes of Button. happy-dom does no layout, so a size is its data-size and its class contract.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Button } from "./button.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible.tsx";
import { Separator } from "./separator.tsx";

afterEach(cleanup);

function Stage({ open }: { open?: boolean }) {
  return (
    <Collapsible {...(open === undefined ? {} : { defaultOpen: open })}>
      <CollapsibleTrigger>Szukam pytań</CollapsibleTrigger>
      <CollapsibleContent>Znalazłam 3 zestawy</CollapsibleContent>
    </Collapsible>
  );
}

describe("Collapsible", () => {
  it("starts folded: the trigger says so and controls the hidden content", () => {
    render(<Stage />);
    const trigger = screen.getByRole("button", { name: "Szukam pytań" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Znalazłam 3 zestawy")).toBeNull();
  });

  it("opens and folds on a click, and the content it controls follows", () => {
    render(<Stage />);
    const trigger = screen.getByRole("button", { name: "Szukam pytań" });
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const content = screen.getByText("Znalazłam 3 zestawy");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("is a native, focusable button, so Enter and Space toggle it as a click does", () => {
    // happy-dom turns no key into a click; a browser does for a <button>, so the keyboard contract
    // is that the trigger is one, in the tab order. Playwright presses the keys in apps/web/e2e.
    render(<Stage />);
    const trigger = screen.getByRole("button", { name: "Szukam pytań" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.hasAttribute("disabled")).toBe(false);
    expect(trigger.getAttribute("tabindex")).toBeNull();
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
  });

  it("opens to the height Radix measures, and stands still under reduced motion", () => {
    render(<Stage open />);
    const content = screen.getByText("Znalazłam 3 zestawy");
    expect(content.getAttribute("data-state")).toBe("open");
    for (const c of [
      "overflow-hidden",
      "data-[state=open]:animate-jw-fold-open",
      "data-[state=closed]:animate-jw-fold-shut",
      "motion-reduce:animate-none",
    ])
      expect(content.classList.contains(c), c).toBe(true);
  });
});

describe("Separator", () => {
  it("is a decorative rule by default: a screen reader skips it", () => {
    const { container } = render(<Separator />);
    expect(screen.queryByRole("separator")).toBeNull();
    const rule = container.querySelector("[data-slot=separator]");
    expect(rule?.getAttribute("data-orientation")).toBe("horizontal");
  });

  it("runs down when vertical, and is a separator when not decorative", () => {
    render(<Separator orientation="vertical" decorative={false} />);
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("vertical");
  });

  it("puts a day's label between two rules, read as text", () => {
    render(<Separator label="Dziś" />);
    expect(screen.getByText("Dziś")).toBeTruthy();
    expect(screen.queryByRole("separator")).toBeNull();
  });

  it("names a labelled separator that is not decorative by its label", () => {
    render(<Separator label="Wczoraj" decorative={false} />);
    expect(screen.getByRole("separator", { name: "Wczoraj" })).toBeTruthy();
  });
});

describe("Button's adult icon sizes", () => {
  it.each([
    ["icon-sm", "size-jw-control-sm"],
    ["icon-control", "size-jw-control-icon"],
    ["icon-touch", "size-jw-control-lg"],
  ] as const)("%s is a square at its token, named by its label", (size, square) => {
    render(
      <Button size={size} variant="outline" aria-label="Rozwiń lekcję">
        <svg aria-hidden="true" />
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Rozwiń lekcję" });
    expect(button.getAttribute("data-size")).toBe(size);
    expect(button.classList.contains(square)).toBe(true);
  });
});
