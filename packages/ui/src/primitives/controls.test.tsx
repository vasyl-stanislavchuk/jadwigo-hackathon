// @vitest-environment happy-dom
// The settings and navigation controls promoted from the System page (dl-uukj.32.3): RadioGroup,
// SegmentedControl, Tabs and SideMenu. Each is named, works from the keyboard and the pointer as
// radix gives it, and sits at decision dl-og82's sizes: 48 (min-h-jw-control), and 44 for sm and
// a sub-row. happy-dom does no layout, so the size classes are the contract.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RadioGroup } from "./radio-group.tsx";
import { SegmentedControl } from "./segmented-control.tsx";
import { type MenuEntry, SideMenu } from "./side-menu.tsx";
import { Tabs } from "./tabs.tsx";

afterEach(cleanup);

const LANGS = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "English" },
] as const;

const has = (el: Element, c: string): boolean => el.classList.contains(c);

describe("RadioGroup", () => {
  function Picker({ onChange }: { onChange: (v: string) => void }) {
    const [value, setValue] = useState("pl");
    return (
      <RadioGroup
        label="Język"
        options={LANGS}
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    );
  }

  it("is a radio group named by its legend, one radio per option, the value checked", () => {
    render(<Picker onChange={vi.fn()} />);
    const group = screen.getByRole("radiogroup", { name: "Język" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "Polski" }).getAttribute("aria-checked")).toBe("true");
  });

  it("picks an option when its words are pressed: the whole row is the target", () => {
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);
    fireEvent.click(screen.getByText("English"));
    expect(onChange).toHaveBeenCalledWith("en");
    expect(screen.getByRole("radio", { name: "English" }).getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("makes each row 48 and keeps the lesson's option rules off its radios", () => {
    render(<Picker onChange={vi.fn()} />);
    for (const radio of screen.getAllByRole("radio")) {
      const row = radio.closest("label");
      expect(row && has(row, "min-h-jw-control")).toBe(true);
      expect(radio.hasAttribute("data-plain")).toBe(true);
    }
  });

  it("gives two groups with the same legend different ids", () => {
    render(
      <>
        <RadioGroup label="Język" options={LANGS} value="pl" onChange={vi.fn()} />
        <RadioGroup label="Język" options={LANGS} value="en" onChange={vi.fn()} />
      </>,
    );
    const [a, b] = screen.getAllByRole("radiogroup", { name: "Język" });
    expect(a?.getAttribute("aria-labelledby")).not.toBe(b?.getAttribute("aria-labelledby"));
  });
});

describe("SegmentedControl", () => {
  it("is a named radio group whose chosen segment is checked; a press picks another", () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Widok" options={LANGS} value="pl" onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Widok" });
    expect(within(group).getByRole("radio", { name: "Polski" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    fireEvent.click(within(group).getByRole("radio", { name: "English" }));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("is 48 at md and 44 at sm: the track carries the height", () => {
    render(
      <>
        <SegmentedControl label="Duży" options={LANGS} value="pl" onChange={vi.fn()} />
        <SegmentedControl label="Mały" options={LANGS} value="pl" onChange={vi.fn()} size="sm" />
      </>,
    );
    const md = screen.getByRole("radiogroup", { name: "Duży" });
    const sm = screen.getByRole("radiogroup", { name: "Mały" });
    expect(has(md, "min-h-jw-control")).toBe(true);
    expect(has(sm, "min-h-11")).toBe(true);
    expect(has(sm, "min-h-jw-control")).toBe(false);
  });

  it("keeps the legend for a screen reader when hidden", () => {
    render(
      <SegmentedControl label="Widok" options={LANGS} value="pl" onChange={vi.fn()} hideLabel />,
    );
    expect(screen.getByRole("radiogroup", { name: "Widok" })).toBeTruthy();
    expect(has(screen.getByText("Widok"), "sr-only")).toBe(true);
  });
});

describe("Tabs", () => {
  const tabs = [
    { value: "a", label: "Pytania", panel: <p>Lista pytań</p> },
    { value: "b", label: "Uczniowie", panel: <p>Lista uczniów</p> },
  ];

  it("is a named tab list whose active tab shows its panel; a press asks for another", () => {
    const onChange = vi.fn();
    render(<Tabs label="Widoki" tabs={tabs} value="a" onChange={onChange} />);
    const list = screen.getByRole("tablist", { name: "Widoki" });
    const active = within(list).getByRole("tab", { name: "Pytania" });
    expect(active.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Lista pytań");
    // radix selects on mousedown with the primary button.
    fireEvent.mouseDown(within(list).getByRole("tab", { name: "Uczniowie" }), { button: 0 });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("makes each tab 48", () => {
    render(<Tabs label="Widoki" tabs={tabs} value="a" onChange={vi.fn()} />);
    for (const tab of screen.getAllByRole("tab")) expect(has(tab, "min-h-jw-control")).toBe(true);
  });
});

describe("SideMenu", () => {
  const items: MenuEntry[] = [
    { heading: "Fundamenty" },
    { id: "colour", label: "Kolor" },
    {
      id: "controls",
      label: "Kontrolki",
      items: [
        { id: "radio", label: "Radio" },
        { id: "tabs", label: "Zakładki", href: "#tabs" },
      ],
    },
  ];

  it("is named navigation with the current page marked, and a heading that is not a row", () => {
    render(<SideMenu label="System" items={items} current="colour" />);
    const nav = screen.getByRole("navigation", { name: "System" });
    expect(within(nav).getByRole("button", { name: "Kolor" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(nav).queryByRole("button", { name: "Fundamenty" })).toBeNull();
    expect(within(nav).getByText("Fundamenty")).toBeTruthy();
  });

  it("folds a category open and shut, and its pages are a named group", () => {
    render(<SideMenu label="System" items={items} current="colour" />);
    const category = screen.getByRole("button", { name: "Kontrolki" });
    expect(category.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("group", { name: "Kontrolki" })).toBeNull();
    fireEvent.click(category);
    expect(category.getAttribute("aria-expanded")).toBe("true");
    const group = screen.getByRole("group", { name: "Kontrolki" });
    expect(within(group).getByRole("button", { name: "Radio" })).toBeTruthy();
    expect(within(group).getByRole("link", { name: "Zakładki" }).getAttribute("href")).toBe(
      "#tabs",
    );
    fireEvent.click(category);
    expect(screen.queryByRole("group", { name: "Kontrolki" })).toBeNull();
  });

  it("opens the category holding the current page, also when the page moves into it", () => {
    const { rerender } = render(<SideMenu label="System" items={items} current="colour" />);
    expect(screen.queryByRole("group", { name: "Kontrolki" })).toBeNull();
    rerender(<SideMenu label="System" items={items} current="radio" />);
    const group = screen.getByRole("group", { name: "Kontrolki" });
    expect(within(group).getByRole("button", { name: "Radio" }).getAttribute("aria-current")).toBe(
      "page",
    );
    // It opened the category itself, so it closes it again once the page leaves.
    rerender(<SideMenu label="System" items={items} current="colour" />);
    expect(screen.queryByRole("group", { name: "Kontrolki" })).toBeNull();
  });

  it("calls onPick with the row's id", () => {
    const onPick = vi.fn();
    render(<SideMenu label="System" items={items} current="radio" onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", { name: "Kolor" }));
    expect(onPick).toHaveBeenCalledWith("colour");
  });

  it("makes a row 48 and a sub-row 44", () => {
    render(<SideMenu label="System" items={items} current="radio" />);
    expect(has(screen.getByRole("button", { name: "Kolor" }), "min-h-jw-control")).toBe(true);
    expect(has(screen.getByRole("button", { name: "Kontrolki" }), "min-h-jw-control")).toBe(true);
    const sub = screen.getByRole("button", { name: "Radio" });
    expect(has(sub, "min-h-11")).toBe(true);
    expect(has(sub, "min-h-jw-control")).toBe(false);
  });
});
