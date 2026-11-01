import { describe, expect, it } from "vitest";
import { type NoteStorage, noteKey, offerOnce, primaryTag, shouldOffer } from "./note.ts";

const memory = (): NoteStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
};

describe("primaryTag", () => {
  it("keeps the language and drops the region", () => {
    expect(primaryTag("en-GB")).toBe("en");
    expect(primaryTag("PL")).toBe("pl");
  });
});

describe("shouldOffer", () => {
  it("offers the English twin to an English browser on a Polish page", () => {
    expect(shouldOffer("en-US", "pl", "en", false)).toBe(true);
  });

  it("never offers when the browser's language is the page's", () => {
    expect(shouldOffer("pl-PL", "pl", "en", false)).toBe(false);
    expect(shouldOffer("en", "en", "pl", false)).toBe(false);
  });

  it("offers nothing to a browser in a third language", () => {
    expect(shouldOffer("de-DE", "pl", "en", false)).toBe(false);
  });

  it("never offers once the browser has seen it", () => {
    expect(shouldOffer("en-US", "pl", "en", true)).toBe(false);
  });
});

describe("offerOnce", () => {
  it("shows the note to an English browser on a Polish page, and never twice", () => {
    const storage = memory();
    expect(offerOnce(storage, "en-US", "pl", "en")).toBe(true);
    expect(storage.values.get(noteKey)).toBe("1");
    expect(offerOnce(storage, "en-US", "pl", "en")).toBe(false);
  });

  it("leaves no mark when the languages match", () => {
    const storage = memory();
    expect(offerOnce(storage, "pl", "pl", "en")).toBe(false);
    expect(storage.values.size).toBe(0);
  });

  it("shows nothing when the storage refuses", () => {
    const refusing: NoteStorage = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
    };
    expect(offerOnce(refusing, "en-US", "pl", "en")).toBe(false);
  });
});
