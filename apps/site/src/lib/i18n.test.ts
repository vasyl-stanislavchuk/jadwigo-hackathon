import { m } from "@jadwigo/copy/messages";
import { describe, expect, it } from "vitest";
import { footerPaths, prefixedLanguages, servedLanguages } from "./i18n.ts";

describe("servedLanguages", () => {
  it("serves every language in dev", () => {
    expect(servedLanguages(false)).toEqual(["pl", "en"]);
    expect(prefixedLanguages(false)).toEqual(["en"]);
  });

  it("serves only the live ones in a prod build, so English waits for dl-5ssh.34.70", () => {
    expect(servedLanguages(true)).toEqual(["pl"]);
    expect(prefixedLanguages(true)).toEqual([]);
  });
});

describe("footerPaths", () => {
  it("links each language's own privacy pages", () => {
    expect(footerPaths("pl").privacy).toBe("/prywatnosc");
    expect(footerPaths("en").deletion).toBe("/en/privacy/data-deletion");
  });
});

describe("the frame's words", () => {
  it("come from the site_* messages in the page's language", () => {
    expect(m.site_nav_sign_in({}, { locale: "pl" })).toBe("Zaloguj się");
    expect(m.site_nav_sign_in({}, { locale: "en" })).toBe("Sign in");
    expect(m.site_404_heading({}, { locale: "en" })).toBe("This page isn't here.");
  });
});
