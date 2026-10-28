/**
 * The page follows the laptop's light or dark setting (owner, 2026-10-08, dl-i952.19), and is
 * light while it prints. The playground's review tab may hold a theme over the setting (dl-w3.47),
 * and a release gives the setting back.
 */

import { afterEach, describe, expect, it } from "vitest";
import { DARK_QUERY, followSystemTheme, heldTheme, holdTheme, type ThemeWindow } from "./theme.ts";

function fakeWindow(dark: boolean) {
  const listeners = new Map<string, Array<() => void>>();
  const on = (type: string, fn: () => void) => {
    listeners.set(type, [...(listeners.get(type) ?? []), fn]);
  };
  const media = {
    matches: dark,
    addEventListener: (_: string, fn: () => void) => on("change", fn),
  };
  const queries: string[] = [];
  const win: ThemeWindow = {
    matchMedia: (query: string) => {
      queries.push(query);
      return media as unknown as MediaQueryList;
    },
    addEventListener: (type, fn) => on(type, fn),
  };
  const fire = (type: string) => {
    for (const fn of listeners.get(type) ?? []) fn();
  };
  return { win, media, queries, fire };
}

function root() {
  const attrs = new Map<string, string>();
  const el = {
    setAttribute: (k: string, v: string) => attrs.set(k, v),
    removeAttribute: (k: string) => attrs.delete(k),
  } as unknown as HTMLElement;
  return { el, theme: () => attrs.get("theme") ?? null };
}

afterEach(() => {
  // A hold is module state: every test starts following the system again.
  holdTheme(root().el, null);
});

describe("followSystemTheme", () => {
  it("reads prefers-color-scheme", () => {
    const { win, queries } = fakeWindow(false);
    followSystemTheme(root().el, win);
    expect(queries).toEqual([DARK_QUERY]);
  });

  it.each([
    [true, "dark"],
    [false, null],
  ])("a laptop set to dark %s gives theme %s", (dark, theme) => {
    const r = root();
    followSystemTheme(r.el, fakeWindow(dark).win);
    expect(r.theme()).toBe(theme);
  });

  it("follows the setting when it changes", () => {
    const r = root();
    const { win, media, fire } = fakeWindow(false);
    followSystemTheme(r.el, win);
    media.matches = true;
    fire("change");
    expect(r.theme()).toBe("dark");
    media.matches = false;
    fire("change");
    expect(r.theme()).toBeNull();
  });

  it("is light while the page prints, and dark again after", () => {
    const r = root();
    const { win, fire } = fakeWindow(true);
    followSystemTheme(r.el, win);
    fire("beforeprint");
    expect(r.theme()).toBeNull();
    fire("afterprint");
    expect(r.theme()).toBe("dark");
  });
});

describe("holdTheme", () => {
  it("holds dark over a light system", () => {
    const r = root();
    followSystemTheme(r.el, fakeWindow(false).win);
    holdTheme(r.el, "dark");
    expect(r.theme()).toBe("dark");
    expect(heldTheme()).toBe("dark");
  });

  it("ignores a system change while held", () => {
    const r = root();
    const { win, media, fire } = fakeWindow(false);
    followSystemTheme(r.el, win);
    holdTheme(r.el, "light");
    media.matches = true;
    fire("change");
    expect(r.theme()).toBeNull();
  });

  it("a release restores the system setting", () => {
    const r = root();
    const { win, media, fire } = fakeWindow(false);
    followSystemTheme(r.el, win);
    holdTheme(r.el, "dark");
    media.matches = true;
    fire("change");
    holdTheme(r.el, null);
    expect(r.theme()).toBe("dark");
    expect(heldTheme()).toBeNull();
    media.matches = false;
    fire("change");
    expect(r.theme()).toBeNull();
  });

  it("sets the attribute on a root nobody follows", () => {
    const r = root();
    holdTheme(r.el, "dark");
    expect(r.theme()).toBe("dark");
    holdTheme(r.el, null);
    expect(r.theme()).toBeNull();
  });
});
