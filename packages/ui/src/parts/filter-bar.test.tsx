// @vitest-environment happy-dom
// The filter bar and its facets (dl-uukj.47.67.5, §7.1, S14, S17, S22): a facet the app hides isn't
// drawn, its trigger shows up to 2 chips then a count, it opens by Enter and its rows toggle by
// Space, Wyczyść shows only while a filter is set, and the filters read back in words. Both layouts
// are in the page (CSS picks one), so each test looks inside the laptop's or the phone's.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DensityScope } from "../lib/register.tsx";
import type { FacetOption } from "./facet.tsx";
import { activeFilterWords, FilterBar, type FilterBarFacet } from "./filter-bar.tsx";

const CHILDREN: FacetOption[] = [
  { value: "marta", label: "Marta", count: 12 },
  { value: "ola", label: "Ola", count: 7 },
  { value: "kuba", label: "Kuba", count: 3 },
];
const STATUS: FacetOption[] = [
  { value: "szkic", label: "Szkic" },
  { value: "zrobiona", label: "Zrobiona" },
];

function Harness({
  oneChild = false,
  initial = [],
}: {
  oneChild?: boolean;
  initial?: string[];
}): JSX.Element {
  const [children, setChildren] = useState<string[]>(initial);
  const [status, setStatus] = useState<string[]>([]);
  const facets: FilterBarFacet[] = [
    {
      id: "dziecko",
      label: "Dziecko",
      options: oneChild ? CHILDREN.slice(0, 1) : CHILDREN,
      value: children,
      onChange: setChildren,
      hidden: oneChild,
    },
    { id: "status", label: "Status", options: STATUS, value: status, onChange: setStatus },
  ];
  return (
    <DensityScope value="parent">
      <div data-audience="adult">
        <FilterBar
          facets={facets}
          onClear={() => {
            setChildren([]);
            setStatus([]);
          }}
          labels={{
            clearChoice: "Wyczyść wybór",
            chosen: (n) => `${n} wybrane`,
            clearAll: "Wyczyść",
            filters: (n) => `Filtry (${n})`,
            sheetTitle: "Filtry",
            sheetClose: "Zamknij",
            show: "Pokaż 38 lekcji",
          }}
        />
      </div>
    </DensityScope>
  );
}

const laptop = (container: HTMLElement) =>
  within(container.querySelector<HTMLElement>("[data-slot=filter-bar-laptop]") as HTMLElement);

afterEach(cleanup);

describe("FilterBar", () => {
  it("draws no facet the app hides (one child: no Dziecko)", () => {
    const { container } = render(<Harness oneChild />);
    const bar = laptop(container);
    expect(bar.queryByRole("button", { name: /Dziecko/ })).toBeNull();
    expect(bar.getByRole("button", { name: /Status/ })).toBeTruthy();
  });

  // Enter on a button and Space on a checkbox are the browser's activation: a click on a native
  // <button>. happy-dom doesn't synthesize it, so the test checks both are native buttons, fires the
  // click the key makes, and checks where the keyboard's focus goes.
  it("opens a facet by Enter, puts focus on its first row, toggles by Space, closes by Escape", async () => {
    const { container } = render(<Harness />);
    const trigger = laptop(container).getByRole("button", { name: /Dziecko/ });
    expect(trigger.tagName).toBe("BUTTON");
    trigger.focus();
    fireEvent.click(trigger);
    const group = await screen.findByRole("group", { name: "Dziecko" });
    const marta = within(group).getByRole("checkbox", { name: "Marta" });
    await waitFor(() => expect(document.activeElement).toBe(marta));
    expect(marta.tagName).toBe("BUTTON");
    fireEvent.click(marta);
    expect(marta.getAttribute("aria-checked")).toBe("true");
    expect(within(trigger).getByText("Marta")).toBeTruthy();
    fireEvent.keyDown(marta, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("group", { name: "Dziecko" })).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("shows up to 2 value chips, then one count", () => {
    const { container, unmount } = render(<Harness initial={["marta", "ola"]} />);
    const two = laptop(container).getByRole("button", { name: /Dziecko/ });
    expect(within(two).getByText("Marta")).toBeTruthy();
    expect(within(two).getByText("Ola")).toBeTruthy();
    unmount();
    const again = render(<Harness initial={["marta", "ola", "kuba"]} />);
    const three = laptop(again.container).getByRole("button", { name: /Dziecko/ });
    expect(within(three).getByText("3 wybrane")).toBeTruthy();
    expect(within(three).queryByText("Marta")).toBeNull();
  });

  it("shows Wyczyść only while a filter is set, and it clears them", () => {
    const { container } = render(<Harness initial={["ola"]} />);
    const bar = laptop(container);
    fireEvent.click(bar.getByRole("button", { name: "Wyczyść" }));
    expect(bar.queryByRole("button", { name: "Wyczyść" })).toBeNull();
    expect(within(bar.getByRole("button", { name: /Dziecko/ })).queryByText("Ola")).toBeNull();
  });

  it("counts the filters on the phone's button", () => {
    const { container } = render(<Harness initial={["marta", "ola"]} />);
    const phone = within(
      container.querySelector<HTMLElement>("[data-slot=filter-bar-phone]") as HTMLElement,
    );
    expect(phone.getByRole("button", { name: "Filtry (2)" })).toBeTruthy();
  });
});

describe("activeFilterWords", () => {
  it("names the filters for the empty-filtered state", () => {
    const onChange = vi.fn();
    expect(
      activeFilterWords([
        { id: "d", label: "Dziecko", options: CHILDREN, value: ["marta", "ola"], onChange },
        { id: "s", label: "Status", options: STATUS, value: ["zrobiona"], onChange },
        { id: "x", label: "Data", options: [], value: [], onChange },
      ]),
    ).toBe("Marta, Ola · Zrobiona");
  });
});
