// @vitest-environment happy-dom
/**
 * The parent app's frame (dl-uukj.47.4, decision dl-xo0q): the sidebar folds to its rail and back
 * and remembers it per device, the top bar holds the breadcrumb and nothing to press but the phone's
 * menu, and the children are rows with a "+" beside their heading. happy-dom does no layout, so the
 * widths and the 56 px line are apps/web/e2e/parent-shell.spec.ts's.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folds, OPEN_AT_FIRST } from "./fold.ts";
import { ParentShell } from "./ParentShell.tsx";
import type { Place } from "./Sidebar.tsx";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const ola = {
  id: OLA,
  first_name: "Ola",
  school_grade: 2,
} as unknown as Learner;

function shell(
  place: Place = { kind: "lessons" },
  learners: Learner[] = [ola],
  onAddChild = vi.fn(),
): void {
  render(
    <ParentShell
      language="pl"
      learners={learners}
      place={place}
      trail={[{ label: "Lekcje", href: "/parent/lessons" }, { label: "Nowa lekcja" }]}
      onAddChild={onAddChild}
      onSignOut={() => {}}
    >
      <p>strona</p>
    </ParentShell>,
  );
}

beforeEach(() => {
  // The store also holds a choice in memory, for a storage that refuses: start each test open.
  folds.set("sidebar", true);
  window.localStorage.clear();
});
afterEach(cleanup);

describe("the sidebar's fold", () => {
  it("starts open, folds to the rail and back, and remembers it in this browser", async () => {
    shell();
    const aside = document.getElementById("parent-sidebar");
    expect(aside?.getAttribute("data-sidebar")).toBe("open");
    const fold = screen.getByRole("button", { name: "Zwiń menu" });
    expect(fold.getAttribute("aria-expanded")).toBe("true");
    expect(fold.getAttribute("aria-controls")).toBe("parent-sidebar");

    await act(async () => fireEvent.click(fold));
    expect(aside?.getAttribute("data-sidebar")).toBe("folded");
    expect(window.localStorage.getItem("jw.parent.fold.sidebar")).toBe("folded");
    const unfold = screen.getByRole("button", { name: "Rozwiń menu" });
    expect(unfold.getAttribute("aria-expanded")).toBe("false");
    // The rail keeps the menu as named icons.
    expect(within(aside as HTMLElement).getByRole("link", { name: "Lekcje" })).toBeDefined();

    cleanup();
    shell();
    expect(document.getElementById("parent-sidebar")?.getAttribute("data-sidebar")).toBe("folded");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Rozwiń menu" })));
    expect(window.localStorage.getItem("jw.parent.fold.sidebar")).toBe("open");
  });

  it("opens the chat and folds the details before the parent chooses", () => {
    expect(OPEN_AT_FIRST).toEqual({ sidebar: true, chat: true, details: false });
    expect(folds.open("details")).toBe(false);
  });

  it("keeps a choice for the page when storage refuses it", () => {
    const refusing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    folds.set("chat", false, refusing);
    expect(folds.open("chat", refusing)).toBe(false);
  });
});

describe("the top bar", () => {
  it("holds the breadcrumb, with the current page marked, and only the phone's menu to press", () => {
    shell();
    const bar = document.querySelector("[data-top-bar]") as HTMLElement;
    const crumbs = within(bar).getByRole("navigation", { name: "Gdzie jesteś" });
    expect(within(crumbs).getByText("Nowa lekcja").getAttribute("aria-current")).toBe("page");
    expect(within(crumbs).getByRole("link", { name: "Lekcje" })).toBeDefined();
    // No call to action in the corner: the one button is the phone's drawer.
    expect(
      within(bar)
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label")),
    ).toEqual(["Otwórz menu"]);
  });
});

describe("the menu and the children", () => {
  it("marks Lekcje on the first screen and has no Nowa lekcja item", () => {
    shell();
    const menu = screen.getByRole("navigation", { name: "Menu" });
    expect(within(menu).getByRole("link", { name: "Lekcje" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(menu).queryByText("Nowa lekcja")).toBeNull();
    expect(document.querySelector("[data-menu-empty]")).not.toBeNull();
  });

  it("lists each child as a row with the class at its end, marked on the child's page", () => {
    shell({ kind: "child", learner: OLA });
    const row = document.querySelector(`[data-child-row="${OLA}"]`) as HTMLElement;
    expect(row.getAttribute("href")).toBe(`/parent/children/${OLA}`);
    expect(row.getAttribute("aria-current")).toBe("page");
    expect(row.textContent).toContain("Ola");
    expect(row.textContent).toContain("2 kl.");
  });

  it("puts the add action beside the heading, not in the list, and says what it is for", () => {
    const add = vi.fn();
    shell({ kind: "lessons" }, [], add);
    const section = screen.getByRole("region", { name: "Dzieci" });
    expect(within(section).queryByRole("list")).toBeNull();
    expect(document.querySelector("[data-children-hint]")?.textContent).toContain(
      "Nie jest potrzebne do lekcji",
    );
    fireEvent.click(within(section).getByRole("button", { name: "Dodaj dziecko" }));
    expect(add).toHaveBeenCalledOnce();
  });
});
