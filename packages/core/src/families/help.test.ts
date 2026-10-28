// The help ladder's release, ported from david-learns `frontend/src/families/help.test.ts`. The
// playground's examples (two-facts, purse, half-past-seven, add-with-carry, even-numbers) are
// written here as invented fixtures of the same shape, and verdicts are written by hand rather
// than judged. The hint stack, the twin, pageSpec, validate and the solution card are not ported.
import type { Help, HintCard, Verdict } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  answerWords,
  canAsk,
  followed,
  gateOpen,
  givenOf,
  givesAway,
  HelpRung,
  helpLeft,
  hintsOnLadder,
  lastMissOf,
  NO_MISS,
  namedMiss,
  nextRung,
  release,
  rungFor,
  rungsWritten,
} from "./help.ts";
import type { Question } from "./question.ts";

const full: Help = {
  look: { text: "Look at the last digit." },
  boost: { text: "Split it into two rows." },
  boost_by_mistake: { odd_as_even: { text: "One you picked ends in an odd digit." } },
  worked: ["first line", "second line", "last line"],
};

/** A gaps question whose answers are 7 and 8, as the playground's two-facts. */
const twoFacts: Question = {
  family: "slots",
  question_type: "fill_gaps",
  data: {
    template: "3 + 4 = {g1}, 4 + 4 = {g2}",
    gaps: [
      { id: "g1", kind: "enter", input: "number" },
      { id: "g2", kind: "enter", input: "number" },
    ],
    fill_order: ["g1", "g2"],
  },
  key: {
    gaps: { g1: { kind: "enter", accept: ["7"] }, g2: { kind: "enter", accept: ["8"] } },
  },
  help: { look: { text: "Count on from the bigger one.", focus: ["g1"] }, worked: ["3 + 4 = 7"] },
};

/** A choice whose right answer is o2, as the playground's even-numbers. */
const evenNumbers: Question = {
  family: "choose",
  question_type: "multi_select",
  data: {
    options: [
      { id: "o1", content: { kind: "number", number: 3 } },
      { id: "o2", content: { kind: "number", number: 4 } },
    ],
    select: "many",
    layout: "list",
  },
  key: { correct: ["o2"] },
  help: { look: { text: "Look at the last digit." }, give: ["o1"] },
};

const spec = (help: Help): Question => ({ ...twoFacts, help });

const hints = (...texts: string[]): HintCard[] => texts.map((text) => ({ text }));
const texts = (cards: { text: string }[] | null | undefined) => (cards ?? []).map((c) => c.text);

/** A verdict that missed `missed` and got every other part of `parts` right. */
const verdict = (parts: string[], missed: string[], mistake: string | null = null): Verdict => ({
  correct: missed.length === 0,
  mistake_class: missed.length === 0 ? null : mistake,
  parts: parts.map((id) => ({
    id,
    correct: !missed.includes(id),
    mistake_class: missed.includes(id) ? mistake : null,
  })),
});

describe("the help ladder (help.ts)", () => {
  it("climbs one rung at a time and skips a rung nobody wrote", () => {
    expect(nextRung({ help: full }, HelpRung.None)).toBe(HelpRung.Look);
    expect(nextRung({ help: full }, HelpRung.Look)).toBe(HelpRung.Boost);
    expect(nextRung({ help: { boost: { text: "Split it." } } }, HelpRung.None)).toBe(
      HelpRung.Boost,
    );
    expect(nextRung({ help: { boost: { text: "Split it." } } }, HelpRung.Boost)).toBeNull();
    expect(nextRung(undefined, HelpRung.None)).toBeNull();
    expect(nextRung({}, HelpRung.None)).toBeNull();
  });

  it("waiting does not open rung 3, an attempt does", () => {
    expect(gateOpen(0)).toBe(false);
    expect(gateOpen(1)).toBe(true);
    expect(rungFor({ help: full }, HelpRung.Boost, false)).toBeNull();
    expect(rungFor({ help: full }, HelpRung.Boost, true)).toBe(HelpRung.Almost);
    expect(canAsk({ help: full }, HelpRung.Look, false)).toBe(true);
  });

  it("gives the card written for the last mistake on rung 1, and the general boost on rung 2 (dl-uukj.29.108)", () => {
    expect(release(spec(full), HelpRung.Look, namedMiss("odd_as_even")).card?.text).toContain(
      "odd digit",
    );
    expect(release(spec(full), HelpRung.Boost, namedMiss("odd_as_even")).card?.text).toBe(
      "Split it into two rows.",
    );
    expect(release(spec(full), HelpRung.Look, namedMiss("missed_option")).card?.text).toBe(
      "Look at the last digit.",
    );
    expect(release(spec(full), HelpRung.Boost, namedMiss("missed_option")).card?.text).toBe(
      "Split it into two rows.",
    );
    expect(release(spec(full), HelpRung.Boost).card?.text).toBe("Split it into two rows.");
  });

  it("gives the look on rung 2 after a named miss when no general boost is written", () => {
    const { boost: _, ...noBoost } = full;
    expect(release(spec(noBoost), HelpRung.Boost, namedMiss("odd_as_even")).card?.text).toBe(
      "Look at the last digit.",
    );
  });

  it("keeps the named card on rung 2 when no rung 1 is written", () => {
    const { look: _, ...noLook } = full;
    expect(release(spec(noLook), HelpRung.Look, namedMiss("odd_as_even")).card).toBeNull();
    expect(release(spec(noLook), HelpRung.Boost, namedMiss("odd_as_even")).card?.text).toContain(
      "odd digit",
    );
  });

  it("leaves the last worked line for the learner on rung 3, and shows them all on rung 4", () => {
    const almost = release(spec(full), HelpRung.Almost);
    expect(almost.worked).toEqual(["first line", "second line"]);
    expect(almost.blank).toBe(true);
    expect(almost.hints).toEqual([]);
    const twin = release(spec(full), HelpRung.Twin);
    expect(twin.worked).toEqual(["first line", "second line", "last line"]);
    expect(twin.blank).toBe(false);
  });

  it("shows rung 3 as the author wrote it when almost is written, with no drawn blank", () => {
    const written: Help = { ...full, almost: ["first line", "second line", "last = □"] };
    const almost = release(spec(written), HelpRung.Almost);
    expect(almost.worked).toEqual(["first line", "second line", "last = □"]);
    expect(almost.blank).toBe(false);
    // A written rung 3 is enough on its own: one worked line no longer skips the rung.
    expect(
      nextRung({ help: { almost: ["7 + 7 = □"], worked: ["7 + 7 = 14"] } }, HelpRung.None),
    ).toBe(HelpRung.Almost);
    expect(nextRung({ help: { worked: ["7 + 7 = 14"] } }, HelpRung.None)).toBe(HelpRung.Twin);
  });

  it("releases the wire's shape: an empty focus and hints, never null, and rung 4 is the worked lines", () => {
    const boost = release(spec(full), HelpRung.Boost);
    expect(boost.focus).toEqual([]);
    expect(boost.hints).toEqual([]);
    expect(rungsWritten({ help: { look: { text: "Look." } } })).toEqual([HelpRung.Look]);
  });

  it("offers help while a rung is written above, gate aside", () => {
    expect(helpLeft(spec(full), HelpRung.Boost)).toBe(true);
    expect(helpLeft(spec(full), HelpRung.Twin)).toBe(false);
    expect(helpLeft(undefined, HelpRung.None)).toBe(false);
  });
});

describe("Khan's hints on the ladder", () => {
  it("maps two hints onto rungs 1 and 4, three onto 1, 2 and 4, six onto every rung with three in rung 3", () => {
    const two = spec({ hints: hints("Count the rows.", "It is 7, then 8.") });
    expect(texts(hintsOnLadder(two)[1])).toEqual(["Count the rows."]);
    expect(texts(hintsOnLadder(two)[4])).toEqual(["It is 7, then 8."]);
    expect(rungsWritten(two)).toEqual([HelpRung.Look, HelpRung.Twin]);

    const three = spec({ hints: hints("Count the rows.", "Now the columns.", "It is 7, then 8.") });
    expect(rungsWritten(three)).toEqual([HelpRung.Look, HelpRung.Boost, HelpRung.Twin]);
    expect(texts(release(three, HelpRung.Boost).hints)).toEqual(["Now the columns."]);

    const six = spec({ hints: hints("a", "b", "c", "d", "e", "It is 7, then 8.") });
    expect(rungsWritten(six)).toEqual([
      HelpRung.Look,
      HelpRung.Boost,
      HelpRung.Almost,
      HelpRung.Twin,
    ]);
    const almost = release(six, HelpRung.Almost);
    expect(texts(almost.hints)).toEqual(["c", "d", "e"]);
    expect(almost.worked).toBeNull();
    expect(texts(release(six, HelpRung.Twin).hints)).toEqual(["It is 7, then 8."]);
  });

  it("holds a hint that prints an answer word, and every hint after it, behind the gate", () => {
    // The first hint fills the first gap, as 48 pulled Khan items do: rungs 1 and 2 stay
    // empty and the ladder starts at rung 3, which waits for one attempt.
    const leaky = spec({ hints: hints("The first one is 7.", "Now the second.", "So 7 and 8.") });
    const by = hintsOnLadder(leaky);
    expect(by[1]).toEqual([]);
    expect(by[2]).toEqual([]);
    expect(texts(by[3])).toEqual(["The first one is 7.", "Now the second."]);
    expect(texts(by[4])).toEqual(["So 7 and 8."]);
    expect(rungFor(leaky, HelpRung.None, false)).toBeNull();
    expect(rungFor(leaky, HelpRung.None, true)).toBe(HelpRung.Almost);
    // A later leak keeps the clean hints before it on the early rungs, in order.
    const later = spec({
      hints: hints("Count the rows.", "The first one is 7.", "Now the second.", "So 7 and 8."),
    });
    expect(texts(hintsOnLadder(later)[1])).toEqual(["Count the rows."]);
    expect(hintsOnLadder(later)[2]).toEqual([]);
    expect(texts(hintsOnLadder(later)[3])).toEqual(["The first one is 7.", "Now the second."]);
    // Without the question no answer is known, so nothing is held: a test with help alone.
    expect(texts(hintsOnLadder({ help: { hints: hints("7", "8") } })[1])).toEqual(["7"]);
  });

  it("lets an authored look or boost win over the hint mapped onto its rung, and recaps worked on rung 4", () => {
    const mixed = spec({
      look: { text: "Look at the gaps." },
      hints: hints("Count the rows.", "Now the columns.", "It is 7, then 8."),
      worked: ["Count the rows.", "Now the columns.", "It is 7, then 8."],
    });
    const look = release(mixed, HelpRung.Look);
    expect(look.card?.text).toBe("Look at the gaps.");
    expect(look.hints).toEqual([]);
    expect(texts(release(mixed, HelpRung.Boost).hints)).toEqual(["Now the columns."]);
    // With hints, worked is their recap on rung 4, never a rung 3 of its own.
    expect(rungsWritten(mixed)).toEqual([HelpRung.Look, HelpRung.Boost, HelpRung.Twin]);
    const top = release(mixed, HelpRung.Twin);
    expect(texts(top.hints)).toEqual(["It is 7, then 8."]);
    expect(top.worked).toHaveLength(3);
  });
});

describe("the answer's words", () => {
  it("reads a gap's accepted answers, and prints a decimal and a fraction every way they print", () => {
    expect(answerWords(twoFacts)).toEqual(["7", "8"]);
    const decimal = {
      ...twoFacts,
      key: { gaps: { g1: { kind: "enter" as const, accept: ["0.29", "3/4"] } } },
    };
    expect(answerWords(decimal)).toEqual([
      "0.29",
      "0,29",
      "3/4",
      "\\frac{3}{4}",
      "\\dfrac{3}{4}",
      "\\tfrac{3}{4}",
    ]);
  });

  it("finds an answer word only printed whole", () => {
    expect(givesAway("It is 7.", ["7"])).toBe("7");
    expect(givesAway("It is 17.", ["7"])).toBeNull();
    expect(givesAway("Count the rows.", ["7"])).toBeNull();
  });
});

describe("rung 2 on a graph (dl-w3.51.3)", () => {
  const graph: Question = {
    question_type: "draw_graph",
    family: "place",
    data: {
      surface: "bars",
      kind: "bar",
      categories: [
        { id: "a", label: "apples" },
        { id: "b", label: "pears" },
      ],
      max: 10,
      step: 1,
    },
    key: { surface: "bars", heights: { a: 6, b: 4 } },
    help: { give: ["a"], worked: ["Apples: 6", "Pears: 4"] },
  };

  it("gives a bar drawn to its height, read from the key, and nothing on another surface", () => {
    expect(givenOf(graph, ["a"])).toEqual({ heights: { a: 6 } });
    expect(givenOf(graph, ["zz"])).toEqual({ heights: {} });
    expect(release(graph, HelpRung.Boost, { mistake: null, missed: ["a", "b"] }).given).toEqual({
      heights: { a: 6 },
    });
    const line: Question = {
      ...graph,
      question_type: "number_line_place",
      family: "place",
      data: { surface: "number_line", min: 0, max: 10, step: 1, labelled: [0, 10] },
      key: { surface: "number_line", value: 3, tolerance: 0 },
    };
    expect(givenOf(line, ["a"])).toBeNull();
  });
});

describe("givenOf in each family", () => {
  it("a choice takes distractors away, a sequence fixes items, a group places them", () => {
    expect(givenOf(evenNumbers, ["o1", "o2"])).toEqual({ removed: ["o1"] });
    const order: Question = {
      family: "sequence",
      question_type: "order",
      data: {
        items: [
          { id: "i1", text: "one" },
          { id: "i2", text: "two" },
        ],
        first_label: "first",
        last_label: "last",
      },
      key: { orders: [["i2", "i1"]] },
    };
    expect(givenOf(order, ["i1"])).toEqual({ placed: { i1: 1 } });
    const group: Question = {
      family: "group",
      question_type: "bucket",
      data: {
        groups: [{ id: "even", label: "even" }],
        items: [{ id: "x", label: "4" }],
        each_item: "one",
      },
      key: { items: { x: ["even"] } },
    };
    expect(givenOf(group, ["x", "y"])).toEqual({ items: { x: ["even"] } });
    expect(givenOf(group, [])).toBeNull();
  });
});

// Help follows the missed part (Slots addendum 2.3, dl-4e0f 12b).
describe("help follows the missed part", () => {
  /** A gaps question in złote and grosze, as the playground's purse: 3 zł 40 gr. */
  const purse: Question = {
    family: "slots",
    question_type: "money_count",
    data: {
      template: "{zl} zł {gr} gr",
      gaps: [
        { id: "zl", kind: "enter", input: "number" },
        { id: "gr", kind: "enter", input: "number" },
      ],
    },
    key: { gaps: { zl: { kind: "enter", accept: ["3"] }, gr: { kind: "enter", accept: ["40"] } } },
    help: {
      look: { text: "Count the coins of each kind." },
      boost_by_mistake: { counted_coins_not_value: { text: "Add what each coin is worth." } },
    },
  };
  /** A clock read in two gaps, hour then minutes, as the playground's half-past-seven. */
  const clock: Question = {
    family: "slots",
    question_type: "clock_read",
    data: {
      template: "{h}:{m}",
      gaps: [
        { id: "h", kind: "enter", input: "number" },
        { id: "m", kind: "enter", input: "number" },
      ],
    },
    key: { gaps: { h: { kind: "enter", accept: ["7"] }, m: { kind: "enter", accept: ["30"] } } },
    help: { look: { text: "Look at the short hand." }, worked: ["The short hand is past 7."] },
  };
  /** A written sum filled from its units, as the playground's add-with-carry. */
  const column: Question = {
    family: "slots",
    question_type: "column",
    data: {
      template: "{r1}{r0} {c1}",
      gaps: [
        { id: "r1", kind: "enter", input: "number" },
        { id: "c1", kind: "enter", input: "number" },
        { id: "r0", kind: "enter", input: "number" },
      ],
      fill_order: ["r0", "c1", "r1"],
    },
    key: {
      gaps: {
        r0: { kind: "enter", accept: ["5"] },
        c1: { kind: "enter", accept: ["1"] },
        r1: { kind: "enter", accept: ["6"] },
      },
    },
    help: { look: { text: "Start with the units." } },
  };

  it("two-facts, the first right and the second wrong: rung 1 outlines the second, rung 2 gives nothing", () => {
    const m = lastMissOf(twoFacts, verdict(["g1", "g2"], ["g2"], "other_wrong"));
    expect(m.missed).toEqual(["g2"]);
    expect(release(twoFacts, HelpRung.Look, m).focus).toEqual(["g2"]);
    expect(release(twoFacts, HelpRung.Boost, m).given).toBeNull();
    expect(release(twoFacts, HelpRung.Almost, m).given).toBeNull();
  });

  it("purse, both gaps wrong: rung 1 follows the named mistake, rung 2 gives the złote, never the grosze", () => {
    const m = lastMissOf(purse, verdict(["zl", "gr"], ["zl", "gr"], "counted_coins_not_value"));
    expect(m.missed).toEqual(["zl", "gr"]);
    expect(release(purse, HelpRung.Look, m).card?.text).toBe("Add what each coin is worth.");
    expect(release(purse, HelpRung.Look, m).focus).toEqual(["zl"]);
    expect(release(purse, HelpRung.Boost, m).given).toEqual({ gaps: { zl: "3" } });
  });

  it("half-past-seven, the hour wrong: no rung fills the hour", () => {
    const m = lastMissOf(clock, verdict(["h", "m"], ["h"], "other_wrong"));
    expect(m.missed).toEqual(["h"]);
    for (const rung of [HelpRung.Look, HelpRung.Boost, HelpRung.Almost, HelpRung.Twin] as const)
      expect(release(clock, rung, m).given).toBeNull();
  });

  it("reads the misses in fill order: a written sum from its units", () => {
    const m = lastMissOf(column, verdict(["r1", "c1", "r0"], ["r1", "r0"], "other_wrong"));
    expect(m.missed).toEqual(["r0", "r1"]);
    expect(release(column, HelpRung.Boost, m).given).toEqual({ gaps: { r0: "5" } });
  });

  it("before any miss: the look outlines what its author named, and rung 2 gives nothing", () => {
    expect(followed(twoFacts, NO_MISS)).toEqual({ focus: ["g1"], give: [] });
    expect(release(twoFacts, HelpRung.Look).focus).toEqual(["g1"]);
    expect(release(twoFacts, HelpRung.Boost).given).toBeNull();
  });

  it("a choice keeps its author’s lists: taking a distractor away gives no part’s answer", () => {
    expect(lastMissOf(evenNumbers, verdict(["o2"], ["o2"], "missed_option")).missed).toBeNull();
    expect(followed(evenNumbers, namedMiss("missed_option")).give).toEqual(["o1"]);
    expect(release(evenNumbers, HelpRung.Boost).given).toEqual({ removed: ["o1"] });
  });
});

describe("properties of the ladder", () => {
  const card = fc.string({ minLength: 1 }).map((text) => ({ text }));
  const help: fc.Arbitrary<Help> = fc.record(
    {
      hints: fc.array(card, { maxLength: 8 }),
      look: card,
      boost: card,
      boost_by_mistake: fc.dictionary(fc.string({ minLength: 1 }), card, { maxKeys: 2 }),
      give: fc.array(fc.constantFrom("g1", "g2"), { maxLength: 2 }),
      worked: fc.array(fc.string(), { maxLength: 4 }),
      almost: fc.array(fc.string(), { maxLength: 3 }),
    },
    { requiredKeys: [] },
  );

  it("the rungs written climb strictly, and no request reaches rung 3 or 4 while the gate is shut", () => {
    fc.assert(
      fc.property(help, fc.integer({ min: 0, max: 4 }), (h, from) => {
        const q = spec(h);
        const written = rungsWritten(q);
        for (let i = 1; i < written.length; i++)
          expect(written[i] ?? 0).toBeGreaterThan(written[i - 1] ?? 0);
        const shut = rungFor(q, from, false);
        expect(shut === null || shut < HelpRung.Almost).toBe(true);
        const next = rungFor(q, from, true);
        if (next !== null) {
          expect(next).toBeGreaterThan(from);
          expect(release(q, next).rung).toBe(next);
        }
      }),
    );
  });

  it("places every hint exactly once, in order, the last on rung 4", () => {
    fc.assert(
      fc.property(fc.array(card, { minLength: 1, maxLength: 10 }), (cards) => {
        const by = hintsOnLadder(spec({ hints: cards }));
        expect([...by[1], ...by[2], ...by[3], ...by[4]]).toEqual(cards);
        expect(by[4]).toEqual([cards[cards.length - 1]]);
        expect(by[1].length).toBeLessThanOrEqual(1);
        expect(by[2].length).toBeLessThanOrEqual(1);
      }),
    );
  });

  it("never puts a hint that prints the answer on rung 1 or 2", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("Count the rows.", "It is 7.", "Then 8.", "Look again."), {
          minLength: 1,
          maxLength: 8,
        }),
        (words) => {
          const by = hintsOnLadder(spec({ hints: hints(...words) }));
          for (const h of [...by[1], ...by[2]])
            expect(givesAway(h.text, answerWords(twoFacts))).toBeNull();
        },
      ),
    );
  });
});

describe("a mistake card that prints the answer", () => {
  // twoFacts answers 7 and 8; this card says 7, so it stays off rungs 1 and 2.
  const leaky = spec({
    look: { text: "Count on from the bigger one." },
    boost: { text: "Start at 4." },
    boost_by_mistake: { off_by_small: { text: "It is 7." }, constructor: { text: "x" } },
  });
  it("never reaches rung 1 or 2", () => {
    expect(release(leaky, HelpRung.Look, namedMiss("off_by_small")).card?.text).toBe(
      "Count on from the bigger one.",
    );
    expect(release(leaky, HelpRung.Boost, namedMiss("off_by_small")).card?.text).toBe(
      "Start at 4.",
    );
    const noBoost = spec({ boost_by_mistake: { off_by_small: { text: "It is 7." } } });
    expect(release(noBoost, HelpRung.Boost, namedMiss("off_by_small")).card).toBeNull();
  });
});
