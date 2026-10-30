/**
 * The controls panel's segmented choice (language, learner, network, feedback): one radio group
 * named by its label, every option a radio named by its whole label, the current one checked, a
 * greyed option still in place with its title saying why, and a tap on the current one keeps it.
 * happy-dom lays nothing out, so whether a label ever clips (dl-w3.61: "Same liczby" read
 * "ame liczb") is a layout claim for a browser, not for this test (dl-5ssh.73).
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Segmented } from "./controls.tsx";

afterEach(cleanup);

const OPTIONS = [
  { value: "pl", label: "Polski" },
  { value: "en", label: "English" },
  {
    value: "same",
    label: "Same liczby, a long label that wraps",
    title: "Not for this example",
    disabled: true,
  },
] as const;

function shown(onChange: (next: string) => void = () => undefined): void {
  render(<Segmented<string> label="Shown in" value="pl" options={OPTIONS} onChange={onChange} />);
}

describe("Segmented", () => {
  it("is one radio group named by its label, a radio per option named by its whole label", () => {
    shown();
    const group = screen.getByRole("radiogroup", { name: "Shown in" });
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.textContent)).toEqual(OPTIONS.map((o) => o.label));
    for (const r of radios) expect(group.contains(r)).toBe(true);
  });

  it("checks the current option and keeps a greyed one in place with its reason", () => {
    shown();
    expect(screen.getByRole("radio", { name: "Polski" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "English" }).getAttribute("aria-checked")).toBe(
      "false",
    );
    const greyed = screen.getByRole("radio", { name: "Same liczby, a long label that wraps" });
    expect(greyed.hasAttribute("disabled")).toBe(true);
    expect(greyed.getAttribute("title")).toBe("Not for this example");
  });

  it("passes on a new choice, and keeps the current one when it is tapped again", () => {
    const onChange = vi.fn();
    shown(onChange);
    fireEvent.click(screen.getByRole("radio", { name: "Polski" }));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: "English" }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith("en");
  });
});
