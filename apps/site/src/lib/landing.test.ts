import { describe, expect, it } from "vitest";
import {
  facebookSignInLive,
  firstSentence,
  goalLine,
  landingSchema,
  plural,
  signInDistChecks,
  signInProviders,
} from "./landing.ts";

const forms = ["pytanie", "pytania", "pytań"] as const;

describe("plural", () => {
  it("picks the Polish form by the count", () => {
    expect([1, 2, 4, 5, 11, 12, 14, 22, 25].map((n) => plural(n, forms))).toEqual([
      "1 pytanie",
      "2 pytania",
      "4 pytania",
      "5 pytań",
      "11 pytań",
      "12 pytań",
      "14 pytań",
      "22 pytania",
      "25 pytań",
    ]);
  });
});

describe("firstSentence", () => {
  it("keeps the question and drops the instruction after it", () => {
    expect(firstSentence("Ile to jest 2 razy 7? Napisz albo powiedz.")).toBe(
      "Ile to jest 2 razy 7?",
    );
    expect(firstSentence("Policz kropki")).toBe("Policz kropki");
  });
});

describe("the hero question", () => {
  const question = landingSchema.shape.hero.shape.question;
  const q = {
    label: "Dwa działania · klasa 3 · pytanie 1",
    say: "Ile to jest 2 razy 7?",
    pic: "ilustracja",
    source: "Źródło: Alfik Matematyczny",
    choices: ["12", "14"],
    answer: "14",
    right: "Brawo!",
    hint: "Prawie.",
    signUp: { text: "Konto.", button: "Załóż konto", again: "Jeszcze raz" },
  };

  it("takes an answer that is one of the choices", () => {
    expect(question.safeParse(q).success).toBe(true);
  });

  it("refuses an answer no tile shows", () => {
    expect(question.safeParse({ ...q, answer: "15" }).success).toBe(false);
  });
});

describe("goalLine", () => {
  const words = { practising: "Ćwiczy:", allDone: "Umie wszystko.", nextUp: "Dalej:" };

  it("names the skill being practised now", () => {
    const skills = [
      { name: "Ó wymienne na o", state: "done" },
      { name: "Rz po spółgłoskach", state: "now" },
      { name: "Wyrazy do zapamiętania", state: "next" },
    ] as const;
    expect(goalLine(skills, words)).toBe("Ćwiczy: Rz po spółgłoskach");
  });

  it("says every skill so far is done and names the next one", () => {
    const skills = [
      { name: "Odczytuje godziny", state: "done" },
      { name: "Daty w kalendarzu", state: "next" },
    ] as const;
    expect(goalLine(skills, words)).toBe("Umie wszystko. Dalej: Daty w kalendarzu");
  });

  it("says only that every skill is done when nothing comes next", () => {
    expect(goalLine([{ name: "Odczytuje godziny", state: "done" }], words)).toBe("Umie wszystko.");
  });
});

describe("the Facebook sign-in switch (dl-ovva)", () => {
  const facebook = 'href="https://app.jadwigo.pl/parent?provider=facebook';
  const google = 'href="https://app.jadwigo.pl/parent?provider=google';

  it("is off until the Meta app is Live, so /zaloguj shows Google only", () => {
    expect(facebookSignInLive).toBe(false);
    expect(signInProviders()).toEqual(["google"]);
  });

  it("asks the built /zaloguj and /en/sign-in for no Facebook link while it is off", () => {
    const { must, mustNot } = signInDistChecks(["pl", "en"]);
    expect(must).toEqual([
      ["zaloguj/index.html", google],
      ["en/sign-in/index.html", google],
    ]);
    expect(mustNot).toEqual([
      ["zaloguj/index.html", facebook],
      ["en/sign-in/index.html", facebook],
    ]);
  });

  it("brings the Facebook button back, after Google, once it is on", () => {
    expect(signInProviders(true)).toEqual(["google", "facebook"]);
    const { must, mustNot } = signInDistChecks(["pl"], true);
    expect(must).toEqual([
      ["zaloguj/index.html", google],
      ["zaloguj/index.html", facebook],
    ]);
    expect(mustNot).toEqual([]);
  });
});
