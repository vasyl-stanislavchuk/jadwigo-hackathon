import type { EnterData, EnterKey, Figure, SlotsData, SlotsKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgeSlots } from "../slots/judge.ts";
import { enterSolution, judgeEnter } from "./judge.ts";

/**
 * The Enter judge's cases from the playground's view tests, without the render code: an
 * expression compared by value and form (dl-w3.51.1), a length read off a ruler (dl-w3.51.4), an
 * exact decimal (dl-w3.70.7) and a fraction in stacked boxes (dl-w3.70.16), alone and in a gap.
 * Ported from david-learns `frontend/src/families/enter/{enter,decimal,fraction}.test.tsx`; their
 * validator, voice, help, nudge and view cases stay with the page.
 */

type Step = { data: EnterData; key: EnterKey };
const judge = (step: Step, value: unknown) => judgeEnter(step.data, step.key, value);

const product: Step = {
  data: { input: "expression", entry: "keypad" },
  key: { accept: ["2×5"], form: "product" },
};

describe("the expression judge", () => {
  it("accepts the key, its factors the other way round, and the same value in TeX or with synonyms", () => {
    for (const entered of ["2×5", "5×2", " 2 × 5 ", "2*5", "2x5", "(2×5)", "2\\times5"])
      expect(judge(product, { entered }).correct, entered).toBe(true);
  });

  it("never compares strings: a key written in TeX still takes the keypad glyphs", () => {
    const tex: Step = { ...product, key: { accept: ["2\\times5"], form: "product" } };
    expect(judge(tex, { entered: "5×2" }).correct).toBe(true);
    expect(enterSolution(tex.key)).toEqual({ entered: "2\\times5" });
  });

  it("names the shape of a miss before its value", () => {
    expect(judge(product, { entered: "2+5" }).mistake_class).toBe("sum_for_product");
    expect(judge(product, { entered: "2+2+2+2+2" }).mistake_class).toBe("sum_for_product");
    expect(judge(product, { entered: "10" }).mistake_class).toBe("number_for_expression");
    expect(judge(product, { entered: "10÷1" }).mistake_class).toBe("wrong_form");
    expect(judge(product, { entered: "2×6" }).mistake_class).toBe("value_off");
    expect(judge(product, { entered: "abc" }).mistake_class).toBe("not_an_expression");
    expect(judge(product, { entered: "" }).correct).toBe(false);
  });

  it("a sum key names a product the same way, and a key with no form compares by value alone", () => {
    const sum: Step = { ...product, key: { accept: ["3+3"], form: "sum" } };
    expect(judge(sum, { entered: "2×3" }).mistake_class).toBe("product_for_sum");
    const any: Step = { ...product, key: { accept: ["2×5"] } };
    expect(judge(any, { entered: "10" }).correct).toBe(true);
    expect(judge(any, { entered: "2+2+2+2+2" }).correct).toBe(true);
    expect(
      judge({ ...product, key: { accept: ["2×5"], form: "any" } }, { entered: "11" }).mistake_class,
    ).toBe("value_off");
  });

  it("the author’s near class still wins", () => {
    const near: Step = { ...product, key: { ...product.key, near: { "2×4": "one_cone_short" } } };
    expect(judge(near, { entered: "2×4" }).mistake_class).toBe("one_cone_short");
    expect(judge(near, { entered: "2×6" }).mistake_class).toBe("value_off");
  });
});

const PICTURE = {
  src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
  alt: "A pencil lying flat",
  width: 400,
  height: 170,
};
const ruler = (unit: "cm" | "mm", length: number, pixels_per_unit: number): Figure => ({
  kind: "ruler",
  picture: PICTURE,
  unit,
  length,
  pixels_per_unit,
});
const pencil: Step = {
  data: { input: "number", entry: "keypad", figure: ruler("cm", 8, 40) },
  key: { accept: ["6"] },
};
const ribbon: Step = {
  data: { ...pencil.data, figure: ruler("mm", 90, 4) },
  key: { accept: ["70"] },
};

describe("a length read off a ruler (dl-w3.51.4)", () => {
  it("takes the unit’s tolerance when the key names none: half a centimetre, one millimetre", () => {
    expect(judge(pencil, { entered: "6" }).correct).toBe(true);
    expect(judge(pencil, { entered: "7" }).correct).toBe(false);
    expect(judge(ribbon, { entered: "71" }).correct).toBe(true);
    expect(judge(ribbon, { entered: "69" }).correct).toBe(true);
    expect(judge(ribbon, { entered: "72" }).correct).toBe(false);
    expect(
      judge({ ...ribbon, key: { accept: ["70"], tolerance: 0 } }, { entered: "71" }).correct,
    ).toBe(false);
  });

  it("names a miss one unit off, or in the other unit, and the author’s near class first", () => {
    expect(judge(pencil, { entered: "7" }).mistake_class).toBe("off_by_one_unit");
    expect(judge(pencil, { entered: "5" }).mistake_class).toBe("off_by_one_unit");
    expect(judge(pencil, { entered: "60" }).mistake_class).toBe("unit_mixed");
    expect(judge(pencil, { entered: "3" }).mistake_class).toBe("other_wrong");
    expect(judge(ribbon, { entered: "7" }).mistake_class).toBe("unit_mixed");
    expect(judge(ribbon, { entered: "72" }).mistake_class).toBe("off_by_one_unit");
    expect(
      judge(
        { ...pencil, key: { accept: ["6"], near: { "7": "counted_the_marks" } } },
        { entered: "7" },
      ).mistake_class,
    ).toBe("counted_the_marks");
  });
});

const tenths: Step = {
  data: { input: "number", entry: "keypad", decimal: true },
  key: { accept: ["0.6"] },
};

describe("the decimal judge", () => {
  it("takes the key in every way a child writes it", () => {
    for (const entered of ["0,6", "0.6", ",6", ".6", "0,60", "0,600"])
      expect(judge(tenths, { entered }).correct, entered).toBe(true);
  });

  it("misses another number, an unfinished one, and an empty entry", () => {
    for (const entered of ["0,06", "6", "6,0", "5,", ""])
      expect(judge(tenths, { entered }).correct, entered).toBe(false);
    expect(judge(tenths, { entered: "0,06" }).mistake_class).toBe("other_wrong");
    expect(
      judge(
        { ...tenths, key: { accept: ["0.6"], near: { "0,06": "place_value_slip" } } },
        { entered: "0,06" },
      ).mistake_class,
    ).toBe("place_value_slip");
  });

  it("a whole-number key still reads as before, and takes a decimal of the same value", () => {
    const whole: Step = { data: { input: "number", entry: "keypad" }, key: { accept: ["6"] } };
    expect(judge(whole, { entered: "06" }).correct).toBe(true);
    expect(
      judge({ ...whole, data: { ...whole.data, decimal: true } }, { entered: "6,0" }).correct,
    ).toBe(true);
  });

  it("judges its own solution right", () => {
    expect(judge(tenths, enterSolution(tenths.key)).correct).toBe(true);
  });
});

const shaded: Step = {
  data: { input: "fraction", entry: "keypad", simplify: "required" },
  key: { accept: ["2/5"] },
};
const mixed: Step = {
  data: { input: "fraction", entry: "keypad", whole: true, simplify: "required" },
  key: { accept: ["3 1/3"], forms: ["mixed"] },
};
const sixths: Step = {
  data: { input: "fraction", entry: "keypad", simplify: "required" },
  key: { accept: ["1/3"], near: { "4/6": "counted_unshaded" } },
};

describe("the fraction judge", () => {
  it("takes the same number, and judges its own solution right", () => {
    expect(judge(shaded, { entered: "2/5" }).correct).toBe(true);
    expect(judge(shaded, enterSolution(shaded.key)).correct).toBe(true);
    expect(judge(mixed, { entered: "3 1/3" }).correct).toBe(true);
  });

  it("names the right number in a form the key does not take, and a fraction turned upside down", () => {
    expect(judge(mixed, { entered: "10/3" })).toEqual({
      correct: false,
      mistake_class: "wrong_form",
      parts: [],
    });
    expect(judge(shaded, { entered: "5/2" }).mistake_class).toBe("fraction_flipped");
    expect(judge(shaded, { entered: "3/5" }).mistake_class).toBe("other_wrong");
  });

  it("counts 4/10 right when lowest terms are only required (the nudge follows the judge), and a miss where enforced", () => {
    expect(judge(shaded, { entered: "4/10" }).correct).toBe(true);
    expect(
      judge({ ...shaded, data: { ...shaded.data, simplify: "enforced" } }, { entered: "4/10" })
        .mistake_class,
    ).toBe("unsimplified");
    expect(
      judge({ ...shaded, data: { input: "fraction", entry: "keypad" } }, { entered: "4/10" })
        .correct,
    ).toBe(true);
  });

  it("asks for the key’s own terms when Khan’s expression does (rewrite 3/2 with a denominator of 10)", () => {
    const terms: Step = {
      data: { input: "fraction", entry: "keypad" },
      key: { accept: ["15/10"], exact_terms: true },
    };
    expect(judge(terms, { entered: "15/10" }).correct).toBe(true);
    expect(judge(terms, { entered: "3/2" }).mistake_class).toBe("wrong_form");
  });

  it("judges 4/6 the named miss (the playground's nudge on a right 2/6 is not on the v0 wire)", () => {
    expect(judge(sixths, { entered: "4/6" }).mistake_class).toBe("counted_unshaded");
    expect(judge(sixths, { entered: "2/6" }).correct).toBe(true);
  });
});

describe("a decimal or fraction gap", () => {
  it("judges the decimal exactly beside a whole number", () => {
    const data: SlotsData = {
      template: "{g1} tenths is {g2}",
      gaps: [
        { id: "g1", kind: "enter", input: "number" },
        { id: "g2", kind: "enter", input: "number", decimal: true },
      ],
    };
    const key: SlotsKey = {
      gaps: { g1: { kind: "enter", accept: ["3"] }, g2: { kind: "enter", accept: ["0.3"] } },
    };
    expect(judgeSlots(data, key, { gaps: { g1: "3", g2: ",3" } }).correct).toBe(true);
    expect(
      judgeSlots(data, key, { gaps: { g1: "3", g2: "0,03" } }).parts.map((p) => p.correct),
    ).toEqual([true, false]);
  });

  it("judges the fraction beside a decimal", () => {
    const data: SlotsData = {
      template: "Fraction: {g1} Decimal: {g2}",
      gaps: [
        { id: "g1", kind: "enter", input: "fraction" },
        { id: "g2", kind: "enter", input: "number", decimal: true },
      ],
    };
    const key: SlotsKey = {
      gaps: {
        g1: { kind: "enter", accept: ["3/10"], forms: ["proper"] },
        g2: { kind: "enter", accept: ["0.3"] },
      },
    };
    expect(judgeSlots(data, key, { gaps: { g1: "3/10", g2: "0,3" } }).correct).toBe(true);
    expect(judgeSlots(data, key, { gaps: { g1: "10/3", g2: "0,3" } }).parts[0]?.mistake_class).toBe(
      "fraction_flipped",
    );
  });
});

describe("the near table", () => {
  const sum: Step = {
    data: { input: "number", entry: "keypad" },
    key: { accept: ["5"], near: { "7": "add_for_multiply" } },
  };
  it.each(["constructor", "toString", "hasOwnProperty", "__proto__"])(
    "%s finds no class on Object.prototype",
    (entered) => {
      expect(judge(sum, { entered }).mistake_class).toBe("other_wrong");
    },
  );
});
