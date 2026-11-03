import { PAPER_FORMS, PrintSheet, QuestionType } from "@jadwigo/contracts";
import { MIXED_PRINT_LESSON, type MixedPrintQuestion, PRINT_SECRET } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { QUESTION_TYPES } from "../families/questionTypes.ts";
import {
  buildPrintSheet,
  LessonNotPrintable,
  PAPER_ACTIONS,
  type PrintSource,
  paperSay,
  SCREEN_VERB,
} from "./sheet.ts";
import { paperHtml } from "./text.ts";

const media = (src: string) => `https://media.jadwigo.test/${src}`;
const planned = (questions: readonly MixedPrintQuestion[]): PrintSource[] =>
  questions.map((question) => ({ role: "planned", question }));
const sheetOf = (questions: readonly MixedPrintQuestion[]) =>
  buildPrintSheet({
    title: MIXED_PRINT_LESSON.title,
    language: MIXED_PRINT_LESSON.language,
    questions: planned(questions),
    media,
  });
const mixed = () => sheetOf(MIXED_PRINT_LESSON.questions);

describe("paper declaration (dl-jo99l)", () => {
  it("declares a paper form for every question type, and the catalog reads it", () => {
    expect(Object.keys(PAPER_FORMS).sort()).toEqual([...QuestionType.options].sort());
    for (const info of QUESTION_TYPES) expect(info.print, info.name).toBe(PAPER_FORMS[info.name]);
    expect(QUESTION_TYPES.map((i) => i.name).sort()).toEqual([...QuestionType.options].sort());
  });

  it("gives every type a paper action, and leaves only explain without a paper form", () => {
    expect(Object.keys(PAPER_ACTIONS).sort()).toEqual([...QuestionType.options].sort());
    const none = QuestionType.options.filter((t) => PAPER_FORMS[t] === "no");
    expect(none).toEqual(["explain"]);
  });

  it("leaves explain off as the player does, and refuses a lesson with nothing else", () => {
    const explain = {
      ...MIXED_PRINT_LESSON.questions[0],
      question_type: "explain",
      family: "explain",
      data: { input: "text" },
      key: { criteria: [], criteria_version: 1 },
    } as unknown as MixedPrintQuestion;
    const [first] = MIXED_PRINT_LESSON.questions;
    if (!first) throw new Error("fixture");
    const sheet = sheetOf([explain, first]);
    expect(sheet.questions.map((q) => [q.n, q.question_type])).toEqual([[1, "true_false"]]);
    expect(() => sheetOf([explain])).toThrow(LessonNotPrintable);
    expect(() => sheetOf([explain])).toThrow(/explain/);
  });
});

describe("the mixed lesson's sheet", () => {
  it("numbers 20 questions in lesson order with a tick card and parses as a PrintSheet", () => {
    const sheet = mixed();
    expect(PrintSheet.parse(sheet)).toEqual(sheet);
    expect(sheet.questions.map((q) => q.n)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(sheet.questions.map((q) => q.question_type)).toEqual(
      MIXED_PRINT_LESSON.questions.map((q) => q.question_type),
    );
    expect(sheet.card).toBe("ticks");
  });

  it("is the fixture the print Lambda renders (apps/print, dl-1eieq.8.2)", async () => {
    await expect(`${JSON.stringify(mixed(), null, 2)}\n`).toMatchFileSnapshot(
      "../../../../apps/print/tests/fixtures/mixed-20.sheet.json",
    );
  });

  it("lists a borrowed question's credit once, with a short line for its card", () => {
    const sheet = mixed();
    expect(sheet.credits).toEqual([
      {
        n: 1,
        short: "Z Khan Academy · CC BY-NC-SA 4.0",
        line: "Z Khan Academy. Przetłumaczone na polski przez Jadwigo na licencji CC BY-NC-SA 4.0.",
        url: "https://www.khanacademy.org/math/cc-1st-grade-math",
      },
    ]);
    expect(sheet.questions.filter((q) => q.credit_n === 1).map((q) => q.n)).toEqual([3, 16]);
  });

  it("gives every picture an absolute address and nothing else", () => {
    expect(mixed().media).toEqual({
      "media/print/three-clocks.svg": "https://media.jadwigo.test/media/print/three-clocks.svg",
    });
  });

  it("leaves spares off the sheet", () => {
    const [first, second] = MIXED_PRINT_LESSON.questions;
    if (!first || !second) throw new Error("fixture");
    const sheet = buildPrintSheet({
      title: "t",
      language: "pl",
      questions: [
        { role: "planned", question: first },
        { role: "spare", question: second },
      ],
      media,
    });
    expect(sheet.questions).toHaveLength(1);
  });

  it("gives a lesson of lettered questions only the Alfik card", () => {
    const lettered = MIXED_PRINT_LESSON.questions.filter(
      (q) => q.question_type === "lettered_choice",
    );
    expect(sheetOf(lettered).card).toBe("alfik");
  });
});

describe("no keys on paper", () => {
  it("prints no key, hint, worked step, boost or near-miss", () => {
    expect(JSON.stringify(mixed())).not.toContain(PRINT_SECRET);
  });

  it("is the same sheet whatever the keys and help say", () => {
    const changed = MIXED_PRINT_LESSON.questions.map(
      (q) =>
        ({
          ...q,
          key: { changed: true },
          help: { hints: [{ text: "other" }], worked: ["other"] },
          ...(q.family === "choose" ? { data: { ...q.data, boost: "other" } } : {}),
        }) as unknown as MixedPrintQuestion,
    );
    expect(JSON.stringify(sheetOf(changed))).toBe(JSON.stringify(mixed()));
  });

  it("drops a field the sheet does not name", () => {
    const [first] = MIXED_PRINT_LESSON.questions;
    if (!first) throw new Error("fixture");
    const leaky = {
      ...first,
      data: { ...first.data, answer: `${PRINT_SECRET}-leak` },
    } as unknown as MixedPrintQuestion;
    expect(JSON.stringify(sheetOf([leaky]))).not.toContain(PRINT_SECRET);
  });
});

describe("paper words", () => {
  it("turns a sentence with a screen verb into the type's paper line", () => {
    const sheet = mixed();
    const say = (n: number) => sheet.questions[n - 1]?.say;
    expect(say(2)).toBe("Otocz kółkiem dobrą odpowiedź.");
    expect(say(10)).toBe("Narysuj albo pokoloruj odpowiedź.");
    expect(say(15)).toBe("Ponumeruj po kolei: 1, 2, 3…");
    expect(say(18)).toBe("Otocz kółkiem dobrą odpowiedź.");
    expect(say(1)).toBe("Czy to prawda?");
  });

  it("rewrites the stem of every family, a group's too", () => {
    const bucket = mixed().questions[16];
    expect(bucket?.data.stem?.text).toBe("Połącz liniami to, co do siebie pasuje.");
  });

  it("keeps a sentence that carries the problem, swapping only the verb", () => {
    expect(paperSay("Dotknij dobrego słowa: Ala {o1} {o2} kota.", "circle", "pl")).toBe(
      "Otocz dobrego słowa: Ala {o1} {o2} kota.",
    );
    expect(paperSay("Przeciągnij 5 jabłek do koszyka.", "join", "pl")).toBe(
      "Połącz 5 jabłek do koszyka.",
    );
    expect(paperSay("Tap the bigger number.", "circle", "en")).toBe("Circle the right answer.");
  });

  it("leaves words that are not screen actions as written", () => {
    const shift = "Przesuń przecinek o dwa miejsca w prawo. Jaka liczba wyjdzie z 3,45?";
    expect(paperSay(shift, "write", "pl")).toBe(shift);
    const drop = "A drop of water weighs 0.05 g. How much do 20 drops weigh?";
    expect(paperSay(drop, "write", "en")).toBe(drop);
  });

  it("draws a string's slots the same wherever it is used, the title included", () => {
    const [first] = MIXED_PRINT_LESSON.questions;
    if (!first) throw new Error("fixture");
    const inline = {
      ...first,
      question_type: "recognition",
      data: {
        stem: { text: "Ala {o1} {o2} kota." },
        options: [
          { id: "o1", content: { kind: "text", text: "ma" } },
          { id: "o2", content: { kind: "text", text: "mają" } },
        ],
        select: "one",
        layout: "inline",
      },
      key: { correct: ["o1"] },
    } as unknown as MixedPrintQuestion;
    const sheet = buildPrintSheet({
      title: "Ala {o1} {o2} kota.",
      language: "pl",
      questions: [{ role: "planned", question: inline }],
      media,
    });
    expect(sheet.html["Ala {o1} {o2} kota."]).toContain('data-slot="o1"');
  });

  it("prints no screen verb anywhere on the sheet", () => {
    const sheet = mixed();
    for (const q of sheet.questions) expect(SCREEN_VERB.test(q.say), q.say).toBe(false);
    for (const html of Object.values(sheet.html)) expect(SCREEN_VERB.test(html), html).toBe(false);
  });
});

describe("paper text", () => {
  const o = { language: "pl" as const, media };

  it("prints numbers and signs as text, in the school's notation", () => {
    expect(paperHtml("$7 + 5 = 12$", o)).toBe('<span class="formula">7 + 5 = 12</span>');
    expect(paperHtml("$3 \\times 4$", o)).toBe('<span class="formula">3 · 4</span>');
  });

  it("leaves a fraction to KaTeX", () => {
    expect(paperHtml("$\\frac{3}{4}$", o)).toMatch(/^<span class="tex"><span class="katex">/);
  });

  it("escapes the lesson's words and marks each slot for the Lambda to fill", () => {
    expect(paperHtml("<b>a</b> & {g1}", { ...o, slots: new Set(["g1"]) })).toBe(
      '&lt;b&gt;a&lt;/b&gt; &amp; <span class="slot" data-slot="g1"></span>',
    );
  });

  it("draws bold and keeps paragraphs as blocks", () => {
    expect(paperHtml("**Uwaga**", o)).toBe("<strong>Uwaga</strong>");
    expect(paperHtml("raz\n\ndwa", o)).toBe("<p>raz</p><p>dwa</p>");
  });
});
