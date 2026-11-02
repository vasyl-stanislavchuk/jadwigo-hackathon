// @vitest-environment happy-dom
// The adult form controls (dl-uukj.47.67.3), by role and by keyboard: Field's description and its
// problem in the ink (never red, S3), Input and Textarea, the one-input OTP, Checkbox, Radio Group,
// Radio Cards, Switch, Select, the Combobox with no search (D13), Toggle Group as the segmented control
// and the labelled rating group (S11), and Tabs underlined. Each keeps a lesson's look where lesson-kit
// renders it. happy-dom does no layout, so a look is its utilities.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DensityScope } from "../lib/register.tsx";
import { Field } from "../parts/field.tsx";
import { Checkbox } from "./checkbox.tsx";
import { Combobox } from "./combobox.tsx";
import { Input } from "./input.tsx";
import { InputOtp } from "./input-otp.tsx";
import { RadioCards } from "./radio-cards.tsx";
import { RadioGroup } from "./radio-group.tsx";
import { SegmentedControl } from "./segmented-control.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select.tsx";
import { Switch } from "./switch.tsx";
import { Tabs } from "./tabs.tsx";
import { Textarea } from "./textarea.tsx";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group.tsx";

afterEach(cleanup);

function adult(ui: JSX.Element) {
  return render(<DensityScope value="parent">{ui}</DensityScope>);
}

const RED = /destructive|red-|miss|wrong|kid-incorrect/;

describe("Field", () => {
  it("ties the label, says the description, and swaps it for the problem in the ink", () => {
    const { rerender } = adult(
      <Field label="Imię" description="Tak, jak dziecko je zna.">
        <Input kind="text" />
      </Field>,
    );
    const box = screen.getByRole("textbox", { name: "Imię" });
    expect(box.getAttribute("aria-invalid")).toBeNull();
    const hint = document.getElementById(box.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe("Tak, jak dziecko je zna.");
    expect(box.className).toContain("border-input");

    rerender(
      <DensityScope value="parent">
        <Field
          label="Imię"
          description="Tak, jak dziecko je zna."
          problem="Wpisz imię, żeby dziecko je rozpoznało."
        >
          <Input kind="text" />
        </Field>
      </DensityScope>,
    );
    const problem = screen.getByRole("alert");
    expect(problem.textContent).toBe("Wpisz imię, żeby dziecko je rozpoznało.");
    expect(problem.className).toContain("text-jw-ink");
    expect(problem.className).not.toMatch(RED);
    expect(problem.querySelector("svg")).not.toBeNull();
    expect(screen.queryByText("Tak, jak dziecko je zna.")).toBeNull();
    const invalid = screen.getByRole("textbox", { name: "Imię" });
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    expect(invalid.className).toContain("aria-invalid:border-foreground");
    expect(invalid.className).not.toMatch(RED);
  });
});

describe("Textarea", () => {
  it("is the field's look, grows with its words and scrolls past 6 lines", () => {
    adult(<Textarea aria-label="Czego ma się uczyć?" />);
    const box = screen.getByRole("textbox", { name: "Czego ma się uczyć?" });
    expect(box.className).toContain("field-sizing-content");
    expect(box.className).toContain("max-h-[calc(6lh+1rem)]");
    expect(box.className).toContain("overflow-y-auto");
  });
});

describe("InputOtp", () => {
  function Code({ onDone }: { onDone?: (v: string) => void }): JSX.Element {
    const [code, setCode] = useState("");
    return (
      <InputOtp
        aria-label="Kod z e-maila"
        value={code}
        onChange={(v) => {
          setCode(v);
          onDone?.(v);
        }}
      />
    );
  }

  it("is one numeric field the phone can fill, keeping digits only, drawn as 6 cells", () => {
    const seen = vi.fn();
    const { container } = adult(<Code onDone={seen} />);
    const field = screen.getByRole("textbox", { name: "Kod z e-maila" });
    expect(field.getAttribute("inputmode")).toBe("numeric");
    expect(field.getAttribute("autocomplete")).toBe("one-time-code");
    expect(field.getAttribute("maxlength")).toBe("6");
    fireEvent.change(field, { target: { value: "12a3 4" } });
    expect(seen).toHaveBeenLastCalledWith("1234");
    const cells = [...container.querySelectorAll("[data-slot=input-otp] > span")];
    expect(cells).toHaveLength(6);
    expect(cells.map((c) => c.textContent).join("")).toBe("1234");
    act(() => field.focus());
    expect(cells[4]?.hasAttribute("data-active")).toBe(true);
  });
});

describe("Checkbox", () => {
  it("toggles, is 16 on the control's edge, and shows mixed", () => {
    function Box(): JSX.Element {
      const [on, setOn] = useState(false);
      return (
        <Checkbox aria-label="Marta" checked={on} onCheckedChange={(v) => setOn(v === true)} />
      );
    }
    adult(
      <>
        <Box />
        <Checkbox aria-label="Wszystkie" checked="indeterminate" />
      </>,
    );
    const box = screen.getByRole("checkbox", { name: "Marta" });
    expect(box.className).toContain("size-4");
    expect(box.className).toContain("border-control-edge");
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("checkbox", { name: "Wszystkie" }).getAttribute("aria-checked")).toBe(
      "mixed",
    );
  });
});

const WHERE = [
  { value: "screen", label: "Na ekranie", hint: "Na tym komputerze" },
  { value: "paper", label: "Na papierze", hint: "Wydrukuj kartę" },
] as const;

describe("RadioGroup", () => {
  it("draws the adult's 16 ring with its second line on an app page, and the kid's in a lesson", () => {
    const onChange = vi.fn();
    adult(<RadioGroup label="Gdzie" options={WHERE} value="screen" onChange={onChange} />);
    const paper = screen.getByRole("radio", { name: /Na papierze/ });
    expect(paper.className).toContain("size-4");
    expect(screen.getByText("Wydrukuj kartę")).toBeDefined();
    fireEvent.click(paper);
    expect(onChange).toHaveBeenCalledWith("paper");
    cleanup();
    render(<RadioGroup label="Gdzie" options={WHERE} value="screen" onChange={onChange} />);
    expect(screen.getByRole("radio", { name: /Na papierze/ }).className).toContain("size-6");
    expect(screen.queryByText("Wydrukuj kartę")).toBeNull();
  });
});

const CLASSES = [1, 2, 3, 4, 5, 6].map((n) => ({
  value: String(n),
  label: `${n} klasa`,
  hint: `${n + 6}–${n + 7} lat`,
}));

describe("RadioCards", () => {
  it("shows every class with its age line, picks one, and goes 6 across when compact", () => {
    function Pick(): JSX.Element {
      const [v, setV] = useState<string | undefined>(undefined);
      return <RadioCards label="Klasa" options={CLASSES} value={v} onChange={setV} compact />;
    }
    adult(<Pick />);
    const group = screen.getByRole("radiogroup", { name: "Klasa" });
    expect(group.className).toContain("grid-cols-6");
    expect(within(group).getAllByRole("radio")).toHaveLength(6);
    const third = screen.getByRole("radio", { name: /3 klasa/ });
    fireEvent.click(third);
    expect(third.getAttribute("aria-checked")).toBe("true");
    expect(third.className).toContain("data-[state=checked]:bg-selected");
    expect(screen.getByText("9–10 lat")).toBeDefined();
  });
});

describe("Switch", () => {
  it("is the adult's 32 × 18 on an app page and keeps the pause sheet's in a lesson", () => {
    adult(<Switch>Przypomnienia</Switch>);
    const on = screen.getByRole("switch", { name: "Przypomnienia" });
    fireEvent.click(on);
    expect(on.getAttribute("aria-checked")).toBe("true");
    expect(on.querySelector("[data-slot=switch-track]")?.className).toContain("w-8");
    cleanup();
    render(<Switch>Dźwięk</Switch>);
    const kid = screen.getByRole("switch", { name: "Dźwięk" });
    expect(kid.querySelector("[data-slot=switch-track]")?.className).toContain("w-14");
    expect(kid.className).toContain("min-h-kid-tap");
  });
});

describe("Select", () => {
  it("opens by keyboard, picks, and gives the focus back to its trigger", async () => {
    const onChange = vi.fn();
    adult(
      <Select defaultValue="pl" onValueChange={onChange}>
        <SelectTrigger aria-label="Język lekcji">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pl">Polski</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "Język lekcji" });
    expect(trigger.textContent).toContain("Polski");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    const list = await screen.findByRole("listbox");
    expect(list.closest("[data-audience]")?.getAttribute("data-audience")).toBe("adult");
    fireEvent.click(screen.getByRole("option", { name: "English" }));
    expect(onChange).toHaveBeenCalledWith("en");
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});

const KIDS = [
  { value: "none", label: "Bez dziecka" },
  { value: "marta", label: "Marta", grade: 2 },
  { value: "maja", label: "Maja", grade: 1 },
  { value: "kuba", label: "Kuba", grade: 3 },
];

function Dla({ onAdd }: { onAdd: () => void }): JSX.Element {
  const [v, setV] = useState("marta");
  return (
    <Combobox
      label="Dla"
      options={KIDS}
      value={v}
      onChange={setV}
      renderValue={(o) => <span>{o?.label}</span>}
      renderOption={(o) => (
        <span>
          {o.label}
          {"grade" in o && <span> klasa {o.grade}</span>}
        </span>
      )}
      footer={{ label: "Dodaj dziecko…", onSelect: onAdd }}
    />
  );
}

describe("Combobox", () => {
  it("opens on ↓ at the pick, moves with ↑ ↓, jumps by a typed letter, and picks with Enter", async () => {
    adult(<Dla onAdd={() => undefined} />);
    const trigger = screen.getByRole("combobox", { name: "Dla" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const list = await screen.findByRole("listbox", { name: "Dla" });
    expect(within(list).queryByRole("textbox")).toBeNull();
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("option", { name: /Marta/ })),
    );
    expect(screen.getByRole("option", { name: /Marta/ }).getAttribute("aria-selected")).toBe(
      "true",
    );
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "Bez dziecka" }));
    fireEvent.keyDown(document.activeElement as Element, { key: "k" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Kuba/ }));
    fireEvent.keyDown(document.activeElement as Element, { key: "m" });
    expect(document.activeElement).toBe(screen.getByRole("option", { name: /Marta/ }));
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
    fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(trigger.textContent).toContain("Maja");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Esc back to the trigger", async () => {
    adult(<Dla onAdd={() => undefined} />);
    const trigger = screen.getByRole("combobox", { name: "Dla" });
    fireEvent.click(trigger);
    await screen.findByRole("listbox");
    fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("runs the footer item after the focus is back on the trigger", async () => {
    let focusedAtAdd: Element | null = null;
    const onAdd = vi.fn(() => {
      focusedAtAdd = document.activeElement;
    });
    adult(<Dla onAdd={onAdd} />);
    const trigger = screen.getByRole("combobox", { name: "Dla" });
    fireEvent.click(trigger);
    await screen.findByRole("listbox");
    fireEvent.keyDown(document.activeElement as Element, { key: "End" });
    expect(document.activeElement?.textContent).toBe("Dodaj dziecko…");
    fireEvent.click(screen.getByRole("button", { name: "Dodaj dziecko…" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalledOnce());
    expect(focusedAtAdd).toBe(trigger);
  });
});

describe("ToggleGroup", () => {
  it("as the segmented control: one view on a stone track", () => {
    adult(
      <ToggleGroup type="single" kind="segment" defaultValue="week" aria-label="Okres">
        <ToggleGroupItem value="week">Tydzień</ToggleGroupItem>
        <ToggleGroupItem value="month">Miesiąc</ToggleGroupItem>
      </ToggleGroup>,
    );
    const group = screen.getByLabelText("Okres");
    expect(group.className).toContain("bg-muted");
    const month = screen.getByRole("radio", { name: "Miesiąc" });
    expect(month.className).not.toMatch(/kid-tap/);
    fireEvent.click(month);
    expect(month.getAttribute("aria-checked")).toBe("true");
  });

  it("as the labelled rating: each choice says what it means, the pick on the pick's fill", () => {
    const onChange = vi.fn();
    adult(
      <ToggleGroup type="single" kind="rating" aria-label="Jak trudna?" onValueChange={onChange}>
        <ToggleGroupItem value="easy">Za łatwa</ToggleGroupItem>
        <ToggleGroupItem value="right">W sam raz</ToggleGroupItem>
        <ToggleGroupItem value="hard">Za trudna</ToggleGroupItem>
      </ToggleGroup>,
    );
    const right = screen.getByRole("radio", { name: "W sam raz" });
    expect(right.className).toContain("data-[state=on]:bg-selected");
    fireEvent.click(right);
    expect(onChange).toHaveBeenCalledWith("right");
  });

  it("keeps the kid's toggles by default", () => {
    render(
      <ToggleGroup type="single">
        <ToggleGroupItem value="yes">Tak</ToggleGroupItem>
      </ToggleGroup>,
    );
    expect(screen.getByRole("radio", { name: "Tak" }).className).toContain("min-h-kid-tap");
  });
});

const TABS = [
  { value: "overview", label: "Przegląd", panel: "Tydzień Marty" },
  { value: "lessons", label: "Lekcje", count: 12, panel: "12 lekcji" },
];

describe("Tabs", () => {
  it("are underlined with a count on an app page, and arrows move", async () => {
    function Page(): JSX.Element {
      const [v, setV] = useState("overview");
      return <Tabs label="Strona dziecka" tabs={TABS} value={v} onChange={setV} />;
    }
    adult(<Page />);
    const lessons = screen.getByRole("tab", { name: /Lekcje/ });
    expect(lessons.className).toContain("border-b-2");
    expect(lessons.textContent).toContain("12");
    const first = screen.getByRole("tab", { name: "Przegląd" });
    act(() => first.focus());
    fireEvent.keyDown(first, { key: "ArrowRight" });
    // Radix's roving focus moves on the next tick.
    await waitFor(() => expect(document.activeElement).toBe(lessons));
  });

  it("keep the notebook in a lesson's register", () => {
    render(<Tabs label="Strona" tabs={TABS} value="overview" onChange={() => undefined} />);
    expect(screen.getByRole("tab", { name: "Przegląd" }).className).toContain("rounded-t-jw-small");
  });
});

describe("SegmentedControl", () => {
  it("takes the adult's track on an app page and keeps the kid's elsewhere", () => {
    const opts = [
      { value: "pl", label: "Polski" },
      { value: "en", label: "English" },
    ];
    adult(<SegmentedControl label="Język" options={opts} value="pl" onChange={() => undefined} />);
    expect(screen.getByRole("radiogroup", { name: "Język" }).className).toContain("bg-muted");
    cleanup();
    render(<SegmentedControl label="Język" options={opts} value="pl" onChange={() => undefined} />);
    expect(screen.getByRole("radiogroup", { name: "Język" }).className).toContain("border-2");
  });
});
