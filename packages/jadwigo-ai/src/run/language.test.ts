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

  // #554's review: each finding's input.
  it("passes an English answer naming Polish children (names are capitalised)", () => {
    expect(inLanguage("Assigned to Łucja, Żaneta and Józef.", "en")).toBe(true);
    expect(inLanguage("Sent to Łucja, Żaneta, Józef.", "en")).toBe(true);
  });

  it("passes a Polish answer quoting a lesson's English questions, or listing its words", () => {
    expect(
      inLanguage('Dodałam pytania: "What is the colour of the sky?" i "Where is the cat?"', "pl"),
    ).toBe(true);
    expect(
      inLanguage("Dodałam pytania: „What is the colour of the sky?” i „Where is it?”", "pl"),
    ).toBe(true);
    expect(inLanguage("Lekcja angielskiego: is, are, was, the, and.", "pl")).toBe(true);
  });

  it("passes an English answer quoting a long Polish title, with English words in Polish lists", () => {
    expect(
      inLanguage(
        'I added "Dodawanie w zakresie do 20 z przejściem przez dziesiątkę" for Łucja.',
        "en",
      ),
    ).toBe(true);
    expect(inLanguage("Do the ten questions, and come back to me after.", "en")).toBe(true);
  });

  it("still refuses plain prose in the other language once quotes and names are left out", () => {
    expect(inLanguage('Łucja, your lesson "Dodawanie" is ready on the right now.', "pl")).toBe(
      false,
    );
    expect(inLanguage("Łucja ma gotowe pytania, a lekcja jest już na prawo.", "en")).toBe(false);
  });

  it("leaves out single-quoted spans, but not an apostrophe inside a word", () => {
    expect(
      inLanguage("Dodałam pytania: 'What is the colour of the sky?' i 'Where is it?'", "pl"),
    ).toBe(true);
    expect(inLanguage("Dodałam pytanie ‘What is the name of the cat?’ do lekcji.", "pl")).toBe(
      true,
    );
    // Apostrophes open no span: this English stays English, so a Polish lesson refuses it.
    expect(
      inLanguage("Don't worry, the child's lesson is ready and it's on the right.", "pl"),
    ).toBe(false);
    expect(
      inLanguage("Don't worry, the child's lesson is ready and it's on the right.", "en"),
    ).toBe(true);
  });

  it("keeps a quoted span whole across an apostrophe inside it (#554's round 3)", () => {
    for (const text of [
      "Dodałam pytania 'What's the colour of the sky?' i 'Where is the cat?'",
      "Dodałam pytania ‘What’s the colour of the sky?’ i ‘Where is the cat?’",
      "Dodałam pytanie 'What's the name of the cat and the dog?'",
    ]) {
      expect(inLanguage(text, "pl"), text).toBe(true);
    }
  });
});
