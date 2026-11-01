import { describe, expect, it } from "vitest";
import { inLanguage } from "./language.ts";

describe("inLanguage (dl-z5ja.64)", () => {
  it("refuses an English answer on a Polish lesson, and a Polish one on an English lesson", () => {
    expect(inLanguage("Your lesson is ready on the right, with 5 questions.", "pl")).toBe(false);
    expect(inLanguage("Lekcja jest gotowa: 5 pytań na dodawanie do 20.", "en")).toBe(false);
  });

  it("passes an answer in the lesson's language", () => {
    expect(inLanguage("Lekcja jest gotowa: 5 pytań na dodawanie do 20.", "pl")).toBe(true);
    expect(inLanguage("Your lesson is ready on the right, with 5 questions.", "en")).toBe(true);
  });

  it("passes what is too short or too plain to tell", () => {
    expect(inLanguage("Done.", "pl")).toBe(true);
    expect(inLanguage("OK!", "en")).toBe(true);
    expect(inLanguage("5 + 3 = 8", "pl")).toBe(true);
    expect(inLanguage("", "pl")).toBe(true);
  });

  it("passes an English answer that quotes a Polish name or title", () => {
    expect(inLanguage('I added "Dodawanie w zakresie 20" for Łucja to your lesson.', "en")).toBe(
      true,
    );
  });

  it("passes a Polish answer that quotes an English title", () => {
    expect(inLanguage('Dodałam "The tens and the ones" do lekcji dla dziecka.', "pl")).toBe(true);
  });
});
