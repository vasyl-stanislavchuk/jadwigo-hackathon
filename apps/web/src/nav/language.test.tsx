/**
 * The screens' language (dl-uukj.33): ?lang, then the parent's pick, then the pod's language, then
 * Polish, never the browser's; <html lang> follows it, and a pick rewrites a ?lang that would
 * outrank it.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../App.tsx";
import { LanguagePick } from "../parent/LanguagePick.tsx";
import {
  pickedLanguage,
  screenLanguage,
  setPodLanguage,
  useDocumentLang,
  useScreenLanguage,
} from "./language.ts";

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

/** What App does with the language, on the address the test sets (App's /play would call the API). */
function Probe() {
  const language = useScreenLanguage(new URLSearchParams(window.location.search));
  useDocumentLang(language);
  return <p data-language>{language}</p>;
}

describe("the pod's language across a reload (dl-uukj.37)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = "pl";
  });
  afterEach(() => {
    cleanup();
    act(() => setPodLanguage(null));
    window.history.replaceState(null, "", "/");
  });

  it("speaks the last /me's pod language on a reload of /play, before /parent opens", () => {
    act(() => setPodLanguage("en"));
    expect(window.localStorage.getItem("jw.pod-language")).toBe("en");
    // A reload: the page starts on /play with nothing in memory but what the browser kept.
    window.history.replaceState(null, "", "/play/asg_0ectzj2evqb95a3v1v6wewjzy3");
    render(<Probe />);
    expect(document.documentElement.lang).toBe("en");
  });

  it("reads a pod language another load kept, and still puts ?lang and the pick first", () => {
    window.localStorage.setItem("jw.pod-language", "en");
    window.history.replaceState(null, "", "/play/asg_0ectzj2evqb95a3v1v6wewjzy3");
    render(<Probe />);
    expect(screen.getByText("en")).toBeTruthy();
    act(() => pickedLanguage.set("pl"));
    expect(document.documentElement.lang).toBe("pl");
    cleanup();
    window.localStorage.removeItem("jw.language");
    window.history.replaceState(null, "", "/play/asg_0ectzj2evqb95a3v1v6wewjzy3?lang=pl");
    render(<Probe />);
    expect(document.documentElement.lang).toBe("pl");
  });

  it("is rewritten by each /me and cleared on sign-out", () => {
    act(() => setPodLanguage("en"));
    act(() => setPodLanguage("pl"));
    expect(window.localStorage.getItem("jw.pod-language")).toBe("pl");
    act(() => setPodLanguage(null));
    expect(window.localStorage.getItem("jw.pod-language")).toBeNull();
    render(<Probe />);
    expect(document.documentElement.lang).toBe("pl");
  });
});

describe("a pod language the browser could not write (dl-uukj.40)", () => {
  const PLAY = "/play/asg_0ectzj2evqb95a3v1v6wewjzy3";
  const real = window.localStorage;
  /** A browser storage that holds what it is given and refuses writes once told to. */
  function fakeStorage(): Storage & { refuse: { set: boolean; remove: boolean } } {
    const held = new Map<string, string>();
    const full = () => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    };
    const refuse = { set: false, remove: false };
    return {
      refuse,
      get length() {
        return held.size;
      },
      key: (i: number) => [...held.keys()][i] ?? null,
      getItem: (k: string) => held.get(k) ?? null,
      setItem: (k: string, v: string) => (refuse.set ? full() : void held.set(k, v)),
      removeItem: (k: string) => (refuse.remove ? full() : void held.delete(k)),
      clear: () => held.clear(),
    };
  }
  const useStorage = (storage: Storage) =>
    Object.defineProperty(window, "localStorage", { configurable: true, value: storage });

  beforeEach(() => {
    real.clear();
    document.documentElement.lang = "pl";
    window.history.replaceState(null, "", PLAY);
  });
  afterEach(() => {
    cleanup();
    useStorage(real);
    act(() => setPodLanguage(null));
    window.history.replaceState(null, "", "/");
  });

  it("lets the /me that just answered win when storage is full, and drops the stale value", () => {
    const storage = fakeStorage();
    useStorage(storage);
    act(() => setPodLanguage("en"));
    storage.refuse.set = true;
    render(<Probe />);
    expect(document.documentElement.lang).toBe("en");
    act(() => setPodLanguage("pl"));
    expect(document.documentElement.lang).toBe("pl");
    // The stale en is gone, so a reload reads no pod language rather than the old one.
    expect(storage.getItem("jw.pod-language")).toBeNull();
  });

  it("keeps the page's value even when storage refuses to drop the stale one", () => {
    const storage = fakeStorage();
    useStorage(storage);
    act(() => setPodLanguage("en"));
    storage.refuse.set = true;
    storage.refuse.remove = true;
    render(<Probe />);
    act(() => setPodLanguage("pl"));
    expect(storage.getItem("jw.pod-language")).toBe("en");
    expect(document.documentElement.lang).toBe("pl");
  });

  it("reads storage alone once a write succeeds: another tab's sign-out reaches this one", () => {
    act(() => setPodLanguage("en"));
    render(<Probe />);
    expect(document.documentElement.lang).toBe("en");
    act(() => {
      window.localStorage.removeItem("jw.pod-language");
      window.dispatchEvent(new Event("storage"));
    });
    expect(document.documentElement.lang).toBe("pl");
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
