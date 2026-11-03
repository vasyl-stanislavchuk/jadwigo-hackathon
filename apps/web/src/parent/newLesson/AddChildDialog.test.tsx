/**
 * Dodaj dziecko's dialog (dl-uukj.47.20, dl-uukj.47.67 §6.10, S9): Dodaj with no name says what is
 * missing under the field, in the page's language, puts the caret back and adds nothing, and the
 * browser's own validation never speaks; the class is Radio Cards with each one's age line; a child
 * with no class is added; the dialog closes once the add resolves.
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
    ["pl", "Wpisz imię, żeby dziecko je rozpoznało."],
    ["en", "Type a name so your child knows it is theirs."],
  ] as const)(
    "says the name is missing when Dodaj is pressed without one (%s)",
    async (language, problem) => {
      const { dialog, add, onAdd } = opened(language);
      const field = within(dialog).getByRole("textbox");
      // No native validation: the field is not required, and the form does not validate on its own.
      expect(field.hasAttribute("required")).toBe(false);
      expect(dialog.querySelector("form")?.noValidate).toBe(true);
      expect(within(dialog).queryByRole("alert")).toBeNull();

      await act(async () => fireEvent.click(add));
      expect(onAdd).not.toHaveBeenCalled();
      const alert = within(dialog).getByRole("alert");
      expect(alert.textContent).toBe(problem);
      expect(field.getAttribute("aria-invalid")).toBe("true");
      expect(field.getAttribute("aria-describedby")).toContain(alert.id);
      expect(document.activeElement).toBe(field);

      // Spaces are no name either; a name takes the problem away.
      fireEvent.change(field, { target: { value: "   " } });
      await act(async () => fireEvent.click(add));
      expect(onAdd).not.toHaveBeenCalled();
      fireEvent.change(field, { target: { value: "Ola" } });
      expect(within(dialog).queryByRole("alert")).toBeNull();
    },
  );

  it("adds a child with no class, and closes once the add resolves", async () => {
    const { dialog, add, onAdd, onOpenChange } = opened("pl");
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " Ola " } });
    await act(async () => fireEvent.click(add));
    expect(onAdd).toHaveBeenCalledWith({ firstName: "Ola", grade: null });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("offers the classes 1 to 6 as cards with their ages, and sends the one picked", async () => {
    const { dialog, add, onAdd } = opened("pl");
    const klasa = within(dialog).getByRole("radiogroup", { name: "Klasa" });
    expect(
      within(klasa)
        .getAllByRole("radio")
        .map((r) => r.textContent),
    ).toEqual(["17–8 lat", "28–9 lat", "39–10 lat", "410–11 lat", "511–12 lat", "612–13 lat"]);
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Tymek" } });
    await act(async () => fireEvent.click(within(klasa).getByRole("radio", { name: /^4/ })));
    await act(async () => fireEvent.click(add));
    expect(onAdd).toHaveBeenCalledWith({ firstName: "Tymek", grade: 4 });
  });
});
