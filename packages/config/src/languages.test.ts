import { describe, expect, it } from "vitest";
import { LANGUAGE_CODES, LANGUAGES } from "./languages.ts";

describe("languages", () => {
  it("are Polish and English only, Polish live", () => {
    expect(LANGUAGE_CODES).toEqual(["pl", "en"]);
    expect(LANGUAGES.find((l) => l.code === "pl")?.status).toBe("live");
  });

  it("name the plural categories CLDR gives each language", () => {
    for (const language of LANGUAGES) {
      const categories = new Intl.PluralRules(language.code).resolvedOptions().pluralCategories;
      expect([...language.plural].sort(), language.code).toEqual([...categories].sort());
    }
  });
});
