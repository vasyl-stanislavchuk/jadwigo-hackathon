// @vitest-environment happy-dom
/**
 * The parent app's frame (dl-uukj.47.4, decision dl-xo0q; the adult kit, dl-uukj.47.67.6): the
 * sidebar folds to its rail and back and remembers it per device, Lekcje's "+" and the N key open a
 * new lesson, the top bar holds the breadcrumb and the phone's menu, the account stands bottom left
 * in every face with the settings pages in its menu, the children are rows in their tones with a
 * "+" beside their heading, and each settings page is a row under Ustawienia.
 * happy-dom does no layout, so the
 * widths and the 56 px line are apps/web/e2e/parent-shell.spec.ts's.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { folds, OPEN_AT_FIRST } from "./fold.ts";
import { ParentShell } from "./ParentShell.tsx";
import type { Place } from "./Sidebar.tsx";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const KUBA = LearnerId.parse("lrn_3h4m8gyw0fb1cvz2nkqw0px8fq");
const ola = {
  id: OLA,
  first_name: "Ola",
  school_grade: 2,
  created_at: "2026-10-01T08:00:00Z",
} as unknown as Learner;
const kuba = {
  id: KUBA,
  first_name: "Kuba",
  school_grade: null,
  created_at: "2026-10-02T08:00:00Z",
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
  window.history.replaceState(null, "", "/parent/lessons");
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
    // The rail keeps each child's disc in their tone.
    expect(aside?.querySelector('[data-slot="disc"]')?.className).toContain("bg-jw-tone-");

    cleanup();
    shell();
    expect(document.getElementById("parent-sidebar")?.getAttribute("data-sidebar")).toBe("folded");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Rozwiń menu" })));
    expect(window.localStorage.getItem("jw.parent.fold.sidebar")).toBe("open");
  });

  it("opens the chat and folds the details before the parent chooses", () => {
    expect(OPEN_AT_FIRST).toEqual({ sidebar: true, chat: true, details: false, lesson: false });
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
  it("holds the breadcrumb, with the current page marked, and the phone's menu, never the account", () => {
    shell();
    const bar = document.querySelector("[data-top-bar]") as HTMLElement;
    const crumbs = within(bar).getByRole("navigation", { name: "Gdzie jesteś" });
    expect(within(crumbs).getByText("Nowa lekcja").getAttribute("aria-current")).toBe("page");
    expect(within(crumbs).getByRole("link", { name: "Lekcje" })).toBeDefined();
    // No call to action and no account: the phone's drawer is its one button.
    expect(
      within(bar)
        .getAllByRole("button")
        .map((b) => b.textContent || b.getAttribute("aria-label")),
    ).toEqual(["Otwórz menu"]);
  });
});

describe("the account, bottom left", () => {
  it("stands at the open sidebar's foot, above Zwiń menu", () => {
    shell();
    const aside = document.getElementById("parent-sidebar") as HTMLElement;
    const account = within(aside).getByRole("button", { name: "Konto i ustawienia" });
    const fold = within(aside).getByRole("button", { name: "Zwiń menu" });
    expect(account.parentElement).toBe(fold.parentElement);
    expect(account.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("stands at the rail's foot, above Rozwiń menu, when the sidebar is folded", async () => {
    shell();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zwiń menu" })));
    const aside = document.getElementById("parent-sidebar") as HTMLElement;
    const account = within(aside).getByRole("button", { name: "Konto i ustawienia" });
    const unfold = within(aside).getByRole("button", { name: "Rozwiń menu" });
    expect(account.parentElement).toBe(unfold.parentElement);
  });

  it("stands at the phone drawer's foot", async () => {
    shell();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Otwórz menu" })));
    const drawer = document.querySelector("[data-drawer]") as HTMLElement;
    expect(within(drawer).getByRole("button", { name: "Konto i ustawienia" })).toBeDefined();
  });

  it("opens by keyboard and lists each settings page, then signing out", async () => {
    shell();
    fireEvent.keyDown(screen.getByRole("button", { name: "Konto i ustawienia" }), {
      key: "Enter",
    });
    await screen.findByRole("menu");
    expect(screen.getAllByRole("menuitem").map((i) => i.textContent)).toEqual([
      "Konto",
      "Język",
      "Zgoda na AI",
      "Wyloguj się",
    ]);
    fireEvent.click(screen.getByRole("menuitem", { name: "Język" }));
    expect(window.location.pathname).toBe("/parent/settings/language");
  });

  it("signs out from the account menu", async () => {
    const out = vi.fn();
    render(
      <ParentShell
        language="pl"
        learners={[]}
        place={{ kind: "lessons" }}
        trail={[]}
        onAddChild={() => {}}
        onSignOut={out}
      >
        <p>strona</p>
      </ParentShell>,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Konto i ustawienia" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Wyloguj się" }));
    expect(out).toHaveBeenCalledOnce();
  });
});

describe("the settings group", () => {
  it("lists Konto, Język and Zgoda na AI as rows under Ustawienia, each a whole page", () => {
    shell({ kind: "settings", section: "ai" });
    const group = screen.getByRole("region", { name: "Ustawienia" });
    const rows = within(group).getAllByRole("link");
    expect(rows.map((r) => [r.textContent, r.getAttribute("href")])).toEqual([
      ["Konto", "/parent/settings/account"],
      ["Język", "/parent/settings/language"],
      ["Zgoda na AI", "/parent/settings/ai"],
    ]);
    expect(rows.map((r) => r.getAttribute("aria-current"))).toEqual([null, null, "page"]);
  });

  it("keeps each settings page as a named icon on the rail", async () => {
    shell({ kind: "settings", section: "language" });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Zwiń menu" })));
    const rail = screen.getByRole("navigation", { name: "Menu" });
    expect(within(rail).getByRole("link", { name: "Język" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(within(rail).getByRole("link", { name: "Zgoda na AI" })).toBeDefined();
  });
});

describe("the menu and the children", () => {
  it("marks Lekcje on the first screen", () => {
    shell();
    const menu = screen.getByRole("navigation", { name: "Menu" });
    expect(within(menu).getByRole("link", { name: "Lekcje" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(document.querySelector("[data-menu-empty]")).not.toBeNull();
  });

  it("puts Nowa lekcja as a + on the Lekcje row, a link to the first screen with the key N", () => {
    shell();
    const menu = screen.getByRole("navigation", { name: "Menu" });
    const plus = within(menu).getByRole("link", { name: "Nowa lekcja" });
    expect(plus.getAttribute("href")).toBe("/parent");
    expect(plus.getAttribute("aria-keyshortcuts")).toBe("N");
  });

  it("opens the first screen on N pressed outside a field, and never while typing", () => {
    render(
      <ParentShell
        language="pl"
        learners={[]}
        place={{ kind: "lessons" }}
        trail={[]}
        onAddChild={() => {}}
        onSignOut={() => {}}
      >
        <textarea aria-label="pole" />
      </ParentShell>,
    );
    fireEvent.keyDown(screen.getByRole("textbox", { name: "pole" }), { key: "n" });
    expect(window.location.pathname).toBe("/parent/lessons");
    fireEvent.keyDown(document.body, { key: "n", metaKey: true });
    expect(window.location.pathname).toBe("/parent/lessons");
    fireEvent.keyDown(document.body, { key: "n" });
    expect(window.location.pathname).toBe("/parent");
  });

  it("lists each child as a row with their own tone's disc, marked on the child's page", () => {
    shell({ kind: "child", learner: OLA }, [kuba, ola]);
    const row = document.querySelector(`[data-child-row="${OLA}"]`) as HTMLElement;
    expect(row.getAttribute("href")).toBe(`/parent/children/${OLA}`);
    expect(row.getAttribute("aria-current")).toBe("page");
    expect(row.textContent).toBe("OOla");
    // Each child keeps a tone by when they were added (tone.ts): Ola first, Kuba second.
    const tone = (id: string) =>
      document.querySelector(`[data-child-row="${id}"] [data-slot="disc"]`)?.className ?? "";
    expect(tone(OLA)).toContain("bg-jw-tone-0-fill");
    expect(tone(KUBA)).toContain("bg-jw-tone-1-fill");
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

describe("the toasts", () => {
  it("has one named place for them on every page the shell frames", () => {
    shell();
    const regions = document.querySelectorAll("section[aria-label]");
    const toasts = [...regions].filter((r) =>
      r.getAttribute("aria-label")?.startsWith("Powiadomienia"),
    );
    expect(toasts).toHaveLength(1);
  });
});
