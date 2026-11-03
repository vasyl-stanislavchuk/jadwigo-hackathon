// @vitest-environment happy-dom
// The adult overlays (dl-uukj.47.67.2): Tooltip, Dropdown Menu, Context Menu, Alert Dialog, Toast and
// DisabledReason, by role and by keyboard, and the audience every portal carries (an app page's is the
// adult's, a lesson's stays the child's). happy-dom does no layout, so a look is its utilities.
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArchiveIcon } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DensityScope } from "../lib/register.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
} from "./alert-dialog.tsx";
import { Button } from "./button.tsx";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu.tsx";
import { DisabledReason } from "./disabled-reason.tsx";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.tsx";
import { showToast, Toaster } from "./toast.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip.tsx";

afterEach(cleanup);

function adult(ui: JSX.Element) {
  return render(<DensityScope value="parent">{ui}</DensityScope>);
}

describe("Tooltip", () => {
  it("opens on focus in the popover's look with its shortcut, and closes on Esc", async () => {
    adult(
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="control">+</Button>
        </TooltipTrigger>
        <TooltipContent shortcut="N">Nowa lekcja</TooltipContent>
      </Tooltip>,
    );
    act(() => screen.getByRole("button", { name: "+" }).focus());
    const tip = await screen.findByRole("tooltip");
    expect(tip.textContent).toContain("Nowa lekcja");
    const content = document.querySelector("[data-slot=tooltip-content]");
    expect(content?.getAttribute("data-audience")).toBe("adult");
    expect(content?.className).toContain("shadow-float");
    expect(content?.querySelector("kbd")?.textContent).toBe("N");
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).toBeNull());
  });
});

function AccountMenu({ onSignOut }: { onSignOut: () => void }): JSX.Element {
  const [lang, setLang] = useState("pl");
  const [dense, setDense] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="control">
          Konto
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Ustawienia</DropdownMenuItem>
        <DropdownMenuCheckboxItem checked={dense} onCheckedChange={setDense}>
          Gęsto
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Język strony</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={lang} onValueChange={setLang}>
              <DropdownMenuRadioItem value="pl">Polski</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSignOut}>Wyloguj się</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("DropdownMenu", () => {
  it("opens by keyboard, runs an item, and gives the focus back to its trigger", async () => {
    const onSignOut = vi.fn();
    adult(<AccountMenu onSignOut={onSignOut} />);
    const trigger = screen.getByRole("button", { name: "Konto" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    const menu = await screen.findByRole("menu");
    expect(menu.getAttribute("data-audience")).toBe("adult");
    expect(menu.className).toContain("rounded-md");
    expect(screen.getByRole("menuitemcheckbox", { name: "Gęsto" })).toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "Wyloguj się" }));
    expect(onSignOut).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("opens the language submenu with → and picks a radio item", async () => {
    adult(<AccountMenu onSignOut={() => undefined} />);
    const trigger = screen.getByRole("button", { name: "Konto" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    const sub = await screen.findByRole("menuitem", { name: "Język strony" });
    sub.focus();
    fireEvent.keyDown(sub, { key: "ArrowRight" });
    const polski = await screen.findByRole("menuitemradio", { name: "Polski" });
    expect(polski.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.keyDown(await screen.findByRole("menuitem", { name: "Język strony" }), {
      key: "ArrowRight",
    });
    expect(
      (await screen.findByRole("menuitemradio", { name: "English" })).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("closes on Esc and gives the focus back", async () => {
    adult(<AccountMenu onSignOut={() => undefined} />);
    const trigger = screen.getByRole("button", { name: "Konto" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });
    const menu = await screen.findByRole("menu");
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});

describe("ContextMenu", () => {
  it("opens on a right-click with the row's actions", async () => {
    const onOpen = vi.fn();
    adult(
      <ContextMenu>
        <ContextMenuTrigger>Dodawanie do 20</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={onOpen}>Otwórz</ContextMenuItem>
          <ContextMenuItem>Archiwizuj</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Dodawanie do 20"));
    const menu = await screen.findByRole("menu");
    expect(menu.getAttribute("data-audience")).toBe("adult");
    fireEvent.click(screen.getByRole("menuitem", { name: "Otwórz" }));
    expect(onOpen).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  });
});

describe("AlertDialog", () => {
  function renderDelete(onDelete: () => void): void {
    adult(
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="quiet" size="control">
            Usuń
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent
          title="Usunąć Kubę na zawsze?"
          description="Znikną jego lekcje i wyniki. Możesz go zamiast tego zarchiwizować."
        >
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Usuń na zawsze</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );
  }

  it("is named and described, starts on Anuluj, and closes on Esc back to its opener", async () => {
    renderDelete(() => undefined);
    const opener = screen.getByRole("button", { name: "Usuń" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("alertdialog", { name: "Usunąć Kubę na zawsze?" });
    expect(dialog.getAttribute("aria-describedby")).not.toBeNull();
    expect(dialog.className).toContain("shadow-dialog");
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Anuluj" })),
    );
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(document.activeElement).toBe(opener);
  });

  it("draws the action as the primary, never red, and runs it", () => {
    const onDelete = vi.fn();
    renderDelete(onDelete);
    fireEvent.click(screen.getByRole("button", { name: "Usuń" }));
    const action = screen.getByRole("button", { name: "Usuń na zawsze" });
    expect(action.getAttribute("data-variant")).toBe("default");
    expect(screen.getByRole("button", { name: "Anuluj" }).getAttribute("data-variant")).toBe(
      "outline",
    );
    fireEvent.click(action);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("Toast", () => {
  it("says its kind and runs its action: Zrobione, Do cofnięcia with Cofnij, Nie wyszło", async () => {
    const onUndo = vi.fn();
    const onRetry = vi.fn();
    render(<Toaster label="Powiadomienia" />);
    act(() => {
      showToast({ kind: "done", text: "Lekcja gotowa." });
      showToast({
        kind: "undo",
        text: "Lekcja przeniesiona do archiwum.",
        icon: <ArchiveIcon aria-hidden="true" />,
        action: { label: "Cofnij", onClick: onUndo },
      });
      showToast({
        kind: "failed",
        text: "Nie udało się zapisać lekcji.",
        action: { label: "Spróbuj ponownie", onClick: onRetry },
        closeLabel: "Zamknij",
      });
    });
    expect(await screen.findByText("Lekcja gotowa.")).toBeDefined();
    const kinds = [...document.querySelectorAll("[data-slot=toast]")].map((t) =>
      t.getAttribute("data-kind"),
    );
    expect(kinds.sort()).toEqual(["done", "failed", "undo"]);
    expect(screen.getByLabelText(/Powiadomienia/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Cofnij" }));
    expect(onUndo).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Zamknij" })).toBeDefined();
  });
});

describe("DisabledReason", () => {
  it("keeps the control focusable, stops its press, and gives the reason on focus", async () => {
    const onClick = vi.fn();
    adult(
      <DisabledReason reason="Napisz, czego ma się uczyć.">
        <Button size="control" onClick={onClick}>
          Zrób lekcję
        </Button>
      </DisabledReason>,
    );
    const button = screen.getByRole("button", { name: "Zrób lekcję" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    // The reason is its description, so a screen reader hears it with the name.
    const described = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(described?.textContent).toBe("Napisz, czego ma się uczyć.");
    expect(described?.className).toContain("pointer-coarse:block");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    act(() => button.focus());
    expect((await screen.findByRole("tooltip")).textContent).toBe("Napisz, czego ma się uczyć.");
  });
});

describe("the audience a portal carries", () => {
  it("keeps a lesson's popover the child's, in Zeszyt's look", () => {
    render(
      <Popover open>
        <PopoverTrigger>?</PopoverTrigger>
        <PopoverContent>Mapa</PopoverContent>
      </Popover>,
    );
    const content = screen.getByText("Mapa");
    expect(content.getAttribute("data-audience")).toBe("kid");
    expect(content.className).toContain("rounded-2xl");
    expect(content.className).not.toContain("shadow-float");
  });

  it("floats an app page's popover in the adult's look", () => {
    adult(
      <Popover open>
        <PopoverTrigger>Dla</PopoverTrigger>
        <PopoverContent>Bez dziecka</PopoverContent>
      </Popover>,
    );
    const content = screen.getByText("Bez dziecka");
    expect(content.getAttribute("data-audience")).toBe("adult");
    expect(content.className).toContain("rounded-md");
    expect(content.className).toContain("shadow-float");
  });
});
