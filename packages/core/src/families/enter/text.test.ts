import type { EnterData, EnterKey, SlotsData, SlotsKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgeSlots } from "../slots/judge.ts";
import { judgeEnter } from "./judge.ts";
import { foldAccents, oneEditApart, otherForm } from "./text.ts";

/**
 * A typed word (short_text, dl-w3.61.2): the judge folds accents and case only inside the
 * comparison, names a miss by the author's near form, then accents, case and a one-letter slip,
 * and the key's `accents` and `typo` turn the last two into right answers. The validator's case
 * stays with the validator.
 */

const data: EnterData = { input: "text", entry: "keyboard" };
const word = (key: Partial<EnterKey> = {}): EnterKey => ({
  accept: ["czterdzieści siedem"],
  near: { czterdzieści: "tens_only" },
  ...key,
});
const cls = (key: EnterKey, entered: string) => {
  const v = judgeEnter(data, key, { entered });
  return v.correct ? "right" : v.mistake_class;
};

describe("folding", () => {
  it("takes accents off, the Polish ł too, and leaves the letters", () => {
    expect(foldAccents("czterdzieści siedem")).toBe("czterdziesci siedem");
    expect(foldAccents("Łódź")).toBe("Lodz");
  });

  it("counts one letter added, dropped, changed or two swapped as one edit", () => {
    expect(oneEditApart("iloczyn", "ilocyn")).toBe(true);
    expect(oneEditApart("iloczyn", "iloczyny")).toBe(true);
    expect(oneEditApart("iloczyn", "iloczym")).toBe(true);
    expect(oneEditApart("iloczyn", "ilcozyn")).toBe(true);
    expect(oneEditApart("iloczyn", "iloraz")).toBe(false);
  });
});

describe("the short text judge", () => {
  it("names each kind of miss, the author first", () => {
    expect(cls(word(), "czterdzieści siedem")).toBe("right");
    expect(cls(word(), " czterdzieści siedem ")).toBe("right");
    expect(cls(word(), "czterdziesci siedem")).toBe("missing_diacritics");
    expect(cls(word(), "Czterdzieści siedem")).toBe("wrong_case");
    expect(cls(word(), "czterdzieści")).toBe("tens_only");
    expect(cls(word(), "czterdzieści siedm")).toBe("typo");
    expect(cls(word(), "trzydzieści siedem")).toBe("other_wrong");
  });

  it("takes accents and a slip as right only when the key says so", () => {
    expect(cls(word({ accents: "ignore" }), "czterdziesci siedem")).toBe("right");
    expect(cls(word({ typo: "accept" }), "czterdzieści siedm")).toBe("right");
    expect(cls(word({ case: "ignore" }), "CZTERDZIEŚCI SIEDEM")).toBe("right");
  });

  it("never counts a slip in a word under four letters", () => {
    const sum = word({ accept: ["sum"], near: {} });
    expect(cls(sum, "sun")).toBe("other_wrong");
    expect(cls({ ...sum, typo: "accept" }, "sun")).toBe("other_wrong");
  });
});

describe("NFC (dl-r772.12)", () => {
  // 'stół' with ó as o plus a combining acute (U+0301): looks the same, compares unequal as typed.
  const decomposed = "stół";
  const stol = word({ accept: ["stół"], near: {} });

  it("the decomposed and composed forms differ only in their bytes", () => {
    expect(decomposed).not.toBe("stół");
    expect(decomposed.normalize("NFC")).toBe("stół");
  });

  it("a decomposed stół is right against the key stół, and the stored value is unchanged", () => {
    const value = { entered: decomposed };
    expect(judgeEnter(data, stol, value)).toEqual({
      correct: true,
      mistake_class: null,
      parts: [],
    });
    expect(value.entered).toBe(decomposed);
  });

  it("a typed gap is judged the same way, and its value is unchanged", () => {
    const slots: SlotsData = {
      template: "Na {g1} stoi lampa.",
      gaps: [{ id: "g1", kind: "enter", input: "text" }],
    };
    const key: SlotsKey = { gaps: { g1: { kind: "enter", accept: ["stół"] } } };
    const value = { gaps: { g1: decomposed } };
    expect(judgeSlots(slots, key, value).correct).toBe(true);
    expect(value.gaps.g1).toBe(decomposed);
  });

  it("a near form and a miss are found in NFC too, and NFC never makes a wrong letter right", () => {
    expect(cls(word({ near: { czterdzieści: "tens_only" } }), "czterdzieści")).toBe("tens_only");
    expect(cls(stol, "stol")).toBe("missing_diacritics");
    expect(cls(stol, "stúł")).not.toBe("right");
  });
});

describe("a phrase or a sentence (dl-w3.68.1)", () => {
  const sentence = word({ accept: ["Ala ma kota."], near: {} });

  it("folds runs of spaces to one and leaves out a final . ! or ?, on both sides", () => {
    expect(cls(sentence, "Ala ma kota")).toBe("right");
    expect(cls(sentence, "Ala  ma \t kota.")).toBe("right");
    expect(cls(sentence, " Ala ma kota! ")).toBe("right");
    expect(cls(sentence, "Ala ma kota?")).toBe("right");
    expect(cls({ accept: ["Ala ma kota"] }, "Ala ma kota.")).toBe("right");
  });

  it("folds nothing a sentence hangs on: inner marks, a missing space, letters", () => {
    expect(cls(sentence, "Ala, ma kota")).not.toBe("right");
    expect(cls(sentence, "Alama kota")).not.toBe("right");
    expect(cls(sentence, "Ala ma kota..")).not.toBe("right");
    expect(cls(sentence, "Ala ma kote")).not.toBe("right");
    expect(cls(sentence, ".")).toBe("other_wrong");
  });

  it("keeps the classes in their order inside a folded sentence", () => {
    expect(cls({ accept: ["Ala ma żółwia."] }, "Ala  ma zolwia")).toBe("missing_diacritics");
    expect(cls(sentence, "ala ma kota.")).toBe("wrong_case");
    expect(cls(sentence, "Ala ma kotta.")).toBe("typo");
  });

  it("stores the entry as typed", () => {
    const value = { entered: "Ala  ma kota!" };
    expect(judgeEnter(data, sentence, value).correct).toBe(true);
    expect(value.entered).toBe("Ala  ma kota!");
  });
});

describe("the other form (dl-w3.68.1)", () => {
  const key = { accept: ["trzy razy cztery", "trzy pomnożone przez cztery"] };

  it("after a right entry, names the first accepted form it did not match, as written", () => {
    expect(otherForm(key, "trzy razy cztery")).toBe("trzy pomnożone przez cztery");
    expect(otherForm(key, "trzy pomnożone przez cztery.")).toBe("trzy razy cztery");
    expect(otherForm(key, " trzy  razy cztery! ")).toBe("trzy pomnożone przez cztery");
  });

  it("names none after a miss, for a key with one form, or when every form matched", () => {
    expect(otherForm(key, "trzy plus cztery")).toBeNull();
    expect(otherForm(key, "")).toBeNull();
    expect(otherForm({ accept: ["iloczyn"] }, "iloczyn")).toBeNull();
    expect(otherForm({ accept: ["suma", "Suma"], case: "ignore" }, "SUMA")).toBeNull();
  });

  it("compares the way the judge does: a missing accent is a miss, not a right answer with another form", () => {
    expect(otherForm(key, "trzy pomnozone przez cztery")).toBeNull();
    expect(otherForm({ ...key, accents: "ignore" }, "trzy pomnozone przez cztery")).toBe(
      "trzy razy cztery",
    );
  });
});
