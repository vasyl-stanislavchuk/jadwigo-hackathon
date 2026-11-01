/**
 * The screens' language (dl-uukj.33): ?lang, then the parent's pick, then the pod's language, then
 * Polish, never the browser's; <html lang> follows it, and a pick rewrites a ?lang that would
 * outrank it.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App.tsx";
import { LanguagePick } from "../parent/LanguagePick.tsx";
import { pickedLanguage, screenLanguage, setPodLanguage } from "./language.ts";

const q = (search: string) => new URLSearchParams(search);

describe("screenLanguage", () => {
  it("takes ?lang over the pick, the pick over the pod, the pod over Polish", () => {
    expect(screenLanguage({ query: q("lang=en"), picked: "pl", pod: "pl" })).toBe("en");
    expect(screenLanguage({ query: q(""), picked: "en", pod: "pl" })).toBe("en");
    expect(screenLanguage({ query: q(""), picked: null, pod: "en" })).toBe("en");
    expect(screenLanguage({ query: q(""), picked: null, pod: null })).toBe("pl");
  });

  it("skips a ?lang it does not speak", () => {
    expect(screenLanguage({ query: q("lang=uk"), picked: "en", pod: null })).toBe("en");
    expect(screenLanguage({ query: q("lang=uk"), picked: null, pod: null })).toBe("pl");
  });
});

describe("the pick in localStorage", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps a language it speaks and reads anything else as none", () => {
    expect(pickedLanguage.get()).toBeNull();
    pickedLanguage.set("en");
    expect(pickedLanguage.get()).toBe("en");
    window.localStorage.setItem("jw.language", "uk");
    expect(pickedLanguage.get()).toBeNull();
  });
});

describe("the app's <html lang>", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "pl";
  });
  afterEach(() => {
    cleanup();
    act(() => setPodLanguage(null));
    window.history.replaceState(null, "", "/");
  });

  // /parent with no sign-in configured renders one line and calls nothing, so App runs offline.
  const open = (url: string) => {
    window.history.replaceState(null, "", url);
    return render(<App />);
  };

  it("is en for ?lang=en", () => {
    open("/parent?lang=en");
    expect(document.documentElement.lang).toBe("en");
  });

  it("is the parent's saved en over the default", () => {
    pickedLanguage.set("en");
    open("/parent");
    expect(document.documentElement.lang).toBe("en");
  });

  it("is Polish with nothing named, whatever the browser speaks", () => {
    open("/parent");
    expect(navigator.language).not.toBe("pl");
    expect(document.documentElement.lang).toBe("pl");
  });

  it("follows the pod's language when there is no pick, and the pick over it", () => {
    open("/parent");
    act(() => setPodLanguage("en"));
    expect(document.documentElement.lang).toBe("en");
    act(() => pickedLanguage.set("pl"));
    expect(document.documentElement.lang).toBe("pl");
  });
});

describe("LanguagePick", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", "/");
  });

  it("names each language in itself, keeps the pick and rewrites ?lang to it", () => {
    window.history.replaceState(null, "", "/parent?lang=pl&claim=x");
    render(<LanguagePick language="pl" />);
    expect(screen.getByRole("radio", { name: "Polski" })).toBeTruthy();
    act(() => fireEvent.click(screen.getByRole("radio", { name: "English" })));
    expect(pickedLanguage.get()).toBe("en");
    expect(window.location.search).toBe("?lang=en&claim=x");
  });

  it("leaves an address with no ?lang as it is", () => {
    window.history.replaceState(null, "", "/parent");
    render(<LanguagePick language="pl" />);
    act(() => fireEvent.click(screen.getByRole("radio", { name: "English" })));
    expect(pickedLanguage.get()).toBe("en");
    expect(window.location.search).toBe("");
  });
});
