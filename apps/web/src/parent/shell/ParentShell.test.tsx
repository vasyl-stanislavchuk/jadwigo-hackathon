// @vitest-environment happy-dom
/**
 * The parent app's frame (dl-uukj.47.4, decision dl-xo0q; the adult kit, dl-uukj.47.67.6): the
 * sidebar folds to its rail and back and remembers it per device, Lekcje's "+" and the N key open a
 * new lesson, the top bar holds the breadcrumb, the phone's menu and the account menu with the
 * page's language, and the children are rows in their tones with a "+" beside their heading.
 * happy-dom does no layout, so the
 * widths and the 56 px line are apps/web/e2e/parent-shell.spec.ts's.
 */

import { type Learner, LearnerId } from "@jadwigo/contracts";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickLanguage } from "../../nav/language.ts";
import { folds, OPEN_AT_FIRST } from "./fold.ts";
import { ParentShell } from "./ParentShell.tsx";
import type { Place } from "./Sidebar.tsx";

vi.mock("../../nav/language.ts", async (original) => ({
  ...(await original<typeof import("../../nav/language.ts")>()),
  pickLanguage: vi.fn(),
}));

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
  it("holds the breadcrumb, with the current page marked, the phone's menu and the account", () => {
    shell();
    const bar = document.querySelector("[data-top-bar]") as HTMLElement;
    const crumbs = within(bar).getByRole("navigation", { name: "Gdzie jesteś" });
    expect(within(crumbs).getByText("Nowa lekcja").getAttribute("aria-current")).toBe("page");
    expect(within(crumbs).getByRole("link", { name: "Lekcje" })).toBeDefined();
    // No call to action: the phone's drawer, then the account in the right corner.
    expect(
      within(bar)
        .getAllByRole("button")
        .map((b) => b.textContent || b.getAttribute("aria-label")),
    ).toEqual(["Otwórz menu", "Konto i ustawienia"]);
  });

  it("opens the account menu by keyboard, and its Język strony radio switches the language", async () => {
    shell();
    const account = screen.getByRole("button", { name: "Konto i ustawienia" });
    fireEvent.keyDown(account, { key: "Enter" });
    const language = await screen.findByRole("menuitem", { name: "Język strony" });
    expect(screen.getByRole("menuitem", { name: "Wyloguj się" })).toBeDefined();
    // Polski and English only (D14).
    language.focus();
    fireEvent.keyDown(language, { key: "ArrowRight" });
    const radios = await screen.findAllByRole("menuitemradio");
    expect(radios.map((r) => r.textContent)).toEqual(["Polski", "English"]);
    expect(radios[0]?.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
    expect(pickLanguage).toHaveBeenCalledWith("en");
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
