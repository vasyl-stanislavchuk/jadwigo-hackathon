/**
 * Dodaj dziecko's dialog (dl-uukj.47.20): with no name, Dodaj is quiet with its reason beside it, in
 * the page's language, and the browser's own validation never speaks; a child with no class is
 * added; the dialog closes once the add resolves.
 */

import type { Language } from "@jadwigo/copy";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddChildDialog } from "./AddChildDialog.tsx";

afterEach(cleanup);

function opened(language: Language, onAdd = vi.fn(async () => {})) {
  const onOpenChange = vi.fn();
  render(<AddChildDialog language={language} open onOpenChange={onOpenChange} onAdd={onAdd} />);
  const dialog = screen.getByRole("dialog");
  const add = dialog.querySelector<HTMLButtonElement>("[data-add]");
  if (add === null) throw new Error("no Dodaj");
  return { dialog, add, onAdd, onOpenChange };
}

describe("AddChildDialog", () => {
  it.each([
    ["pl", "Najpierw wpisz imię"],
    ["en", "Type a name first"],
  ] as const)(
    "keeps Dodaj quiet with its reason while the name is empty (%s)",
    async (language, reason) => {
      const { dialog, add, onAdd } = opened(language);
      expect(add.getAttribute("aria-disabled")).toBe("true");
      const line = within(dialog).getByText(reason);
      expect(add.getAttribute("aria-describedby")).toBe(line.id);
      // No native validation: the field is not required, and the form does not validate on its own.
      const field = within(dialog).getByRole("textbox");
      expect(field.hasAttribute("required")).toBe(false);
      expect(dialog.querySelector("form")?.noValidate).toBe(true);
      await act(async () => fireEvent.click(add));
      expect(onAdd).not.toHaveBeenCalled();
      // Spaces are no name either.
      fireEvent.change(field, { target: { value: "   " } });
      expect(add.getAttribute("aria-disabled")).toBe("true");
    },
  );

  it("drops the reason and wakes Dodaj once there is a name", () => {
    const { dialog, add } = opened("pl");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Ola" } });
    expect(add.getAttribute("aria-disabled")).toBe("false");
    expect(add.hasAttribute("aria-describedby")).toBe(false);
    expect(within(dialog).queryByText("Najpierw wpisz imię")).toBeNull();
  });

  it("adds a child with no class, and closes once the add resolves", async () => {
    const { dialog, add, onAdd, onOpenChange } = opened("pl");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " Ola " } });
    await act(async () => fireEvent.click(add));
    expect(onAdd).toHaveBeenCalledWith({ firstName: "Ola", grade: null });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sends the class when one is picked", async () => {
    const { dialog, add, onAdd } = opened("pl");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Tymek" } });
    await act(async () => fireEvent.click(within(dialog).getByRole("radio", { name: "4" })));
    await act(async () => fireEvent.click(add));
    expect(onAdd).toHaveBeenCalledWith({ firstName: "Tymek", grade: 4 });
  });
});
