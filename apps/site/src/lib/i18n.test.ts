import { m } from "@jadwigo/copy/messages";
import { describe, expect, it } from "vitest";
import {
  footerPaths,
  otherLanguage,
  prefixedLanguages,
  servedLanguages,
  servedTwinPaths,
  twinStaticPaths,
  withLang,
} from "./i18n.ts";

describe("servedLanguages", () => {
  it("serves every language in dev and in a preview build", () => {
    expect(servedLanguages(false)).toEqual(["pl", "en"]);
    expect(prefixedLanguages(false)).toEqual(["en"]);
  });

  it("serves only the live ones in a strict build, so English waits for dl-5ssh.34.70", () => {
    expect(servedLanguages(true)).toEqual(["pl"]);
    expect(prefixedLanguages(true)).toEqual([]);
  });
});

describe("twinStaticPaths", () => {
  it("builds the landing page at / and /en", () => {
    expect(twinStaticPaths("index", false)).toEqual([
      { params: { index: undefined }, props: { lang: "pl" } },
      { params: { index: "en" }, props: { lang: "en" } },
    ]);
  });

  it("gives each Polish page an English twin under /en/", () => {
    expect(twinStaticPaths("lessons", false).map((p) => p.params.lessons)).toEqual([
      "lekcje",
      "en/lessons",
    ]);
  });

  it("builds only the Polish page in a strict build", () => {
    expect(twinStaticPaths("signIn", true)).toEqual([
      { params: { signIn: "zaloguj" }, props: { lang: "pl" } },
    ]);
    expect(servedTwinPaths(true)).not.toContain("/en/sign-in");
    expect(servedTwinPaths(false)).toContain("/en/sign-in");
  });
});

describe("withLang", () => {
  it("names an English page's language on its app links", () => {
    expect(withLang("https://app.jadwigo.pl/play/asg_1", "en")).toBe(
      "https://app.jadwigo.pl/play/asg_1?lang=en",
    );
    expect(withLang("https://app.jadwigo.pl/parent?provider=google", "en")).toBe(
      "https://app.jadwigo.pl/parent?provider=google&lang=en",
    );
  });

  it("leaves a Polish page's links as they were", () => {
    expect(withLang("https://app.jadwigo.pl/parent?provider=google", "pl")).toBe(
      "https://app.jadwigo.pl/parent?provider=google",
    );
  });
});

describe("footerPaths and otherLanguage", () => {
  it("links each language's own privacy pages", () => {
    expect(footerPaths("pl").privacy).toBe("/prywatnosc");
    expect(footerPaths("en").deletion).toBe("/en/privacy/data-deletion");
    expect(otherLanguage("pl")).toBe("en");
  });
});

describe("the frame's words", () => {
  it("come from the site_* messages in the page's language", () => {
    expect(m.site_nav_sign_in({}, { locale: "pl" })).toBe("Zaloguj się");
    expect(m.site_nav_sign_in({}, { locale: "en" })).toBe("Sign in");
    expect(m.site_404_heading({}, { locale: "en" })).toBe("This page isn't here.");
  });
});
