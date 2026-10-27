import type { ColumnSum, Verdict } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { must } from "../parts/must.ts";
import {
  canAsk,
  followed,
  gateOpen,
  givenOf,
  HelpRung,
  type HintCard,
  helpLeft,
  helpNext,
  helpTop,
  hintsOnLadder,
  lastMissOf,
  namedMiss,
  nextRung,
  pageHelpOf,
  refersToPicture,
  release,
  releaseStack,
  rungFor,
  rungsWritten,
  type StepHelp,
  solutionLines,
  stackFree,
  stackNext,
} from "./help.ts";
import { Family, QuestionType, Surface } from "./names.ts";
import { CLOCK_GAPS, clockReadKey } from "./slots/clock.ts";
import { columnKey } from "./slots/column.ts";
import { MONEY_GAPS, MONEY_TEMPLATE, moneyKey } from "./slots/money.ts";
import type { FamilySpec } from "./types.ts";
import { pageSpec } from "./types.ts";
import { validate } from "./validate.ts";

const full: StepHelp = {
  look: { text: "Look at the last digit." },
  boost: { text: "Split it into two rows." },
  boost_by_mistake: { odd_as_even: { text: "One you picked ends in an odd digit." } },
  worked: ["first line", "second line", "last line"],
};

// Invented questions, each with the help ladder a playground example writes for it.

/** A fill_gaps step whose answers are 7 and 8, with a twin. */
const TWO_FACTS: FamilySpec = {
  id: "x04",
  question_type: QuestionType.FillGaps,
  say: "Fill in the missing numbers.",
  family: Family.Slots,
  data: {
    template: "6 × {g1} = 42,  {g2} × 6 = 48",
    gaps: [
      { id: "g1", kind: Family.Enter, input: "number" },
      { id: "g2", kind: Family.Enter, input: "number" },
    ],
  },
  key: {
    gaps: {
      g1: { kind: Family.Enter, accept: ["7"], near: { "8": "neighbour_row" } },
      g2: { kind: Family.Enter, accept: ["8"], near: { "7": "neighbour_row" } },
    },
  },
  help: {
    look: {
      text: "Both lines are in the six times table. Count in sixes up to the number that stands with the gap.",
      focus: ["g1"],
    },
    boost: {
      text: "Count in sixes: 6, 12, 18, 24 and on. How many sixes does it take to reach the number after the equals sign?",
      picture: { kind: "dots", rows: 3, cols: 6, alt: "Three rows of six dots: 18" },
    },
    boost_by_mistake: {
      neighbour_row: {
        text: "Multiply your number by 6. Does it make exactly the number after the equals sign?",
      },
    },
    worked: ["6 × 7 = 42", "8 × 6 = 48"],
    twin: {
      id: "x04t",
      question_type: QuestionType.FillGaps,
      say: "Fill in the missing numbers.",
      family: Family.Slots,
      data: {
        template: "6 × {g1} = 36,  {g2} × 6 = 54",
        gaps: [
          { id: "g1", kind: Family.Enter, input: "number" },
          { id: "g2", kind: Family.Enter, input: "number" },
        ],
      },
      key: {
        gaps: {
          g1: { kind: Family.Enter, accept: ["6"], near: { "7": "neighbour_row" } },
          g2: { kind: Family.Enter, accept: ["9"], near: { "8": "neighbour_row" } },
        },
      },
    },
  },
};

/** Every even number, two of four. */
const EVEN_NUMBERS: Extract<FamilySpec, { family: "choose" }> = {
  id: "x01",
  question_type: QuestionType.MultiSelect,
  say: "Pick every even number.",
  family: Family.Choose,
  data: {
    options: [12, 7, 18, 25].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number", number: n },
    })),
    select: "many",
    layout: "grid",
  },
  key: { correct: ["o1", "o3"], near: { o2: "odd_as_even", o4: "odd_as_even" } },
  help: {
    look: { text: "Look at the last digit of each number.", focus: ["o1", "o2", "o3", "o4"] },
    boost: {
      text: "Even numbers end in 0, 2, 4, 6 or 8. They split into two equal rows.",
      picture: { kind: "dots", rows: 2, cols: 5, alt: "Ten dots in two equal rows" },
    },
    boost_by_mistake: {
      odd_as_even: {
        text: "One you picked ends in an odd digit. Try splitting it into two equal rows.",
      },
      missed_option: { text: "Check every card in turn, not only the first one." },
    },
    worked: ["7 ends in 7: odd", "25 ends in 5: odd", "12 ends in 2: even", "18 ends in 8: even"],
  },
};

/** A purse of 2 zł, 1 zł, 50 gr and 20 gr: 3 zł 70 gr. */
const PURSE_COINS = ["zl2", "zl1", "gr50", "gr20"] as const;
const PURSE: FamilySpec = {
  id: "xm1",
  question_type: QuestionType.MoneyCount,
  say: "How much money is in the purse?",
  family: Family.Slots,
  data: {
    figure: {
      kind: "coins",
      items: [...PURSE_COINS],
      alt: "A purse: a 2 zł coin, a 1 zł coin, a 50 gr coin and a 20 gr coin.",
    },
    template: MONEY_TEMPLATE,
    gaps: MONEY_GAPS,
  },
  key: moneyKey(PURSE_COINS),
  help: {
    look: {
      text: "Count the złoty and the grosze apart. Each coin says what it is worth.",
      focus: ["zl"],
    },
    boost: {
      text: "Add the złoty on their own: 2 zł and 1 zł. And the grosze on their own: 50 gr and 20 gr.",
    },
    boost_by_mistake: {
      counted_coins_not_value: {
        text: "That is how many coins there are. Money counts by value: add the numbers written on the coins.",
      },
    },
    worked: ["2 zł + 1 zł = 3 zł", "50 gr + 20 gr = 70 gr", "In all: 3 zł 70 gr"],
  },
};

/** The clock at half past seven, read in digits. */
const HALF_PAST_SEVEN: FamilySpec = {
  id: "xd1",
  question_type: QuestionType.ClockRead,
  say: "What time does the clock show? Write the hours and the minutes.",
  family: Family.Slots,
  data: {
    figure: { kind: "clock", h: 7, m: 30, alt: "A clock with hands." },
    template: "{h} : {m}",
    gaps: CLOCK_GAPS,
  },
  key: { gaps: clockReadKey(7, 30) },
  help: {
    look: {
      text: "Look at both hands. The short one shows the hour, and the long one the minutes.",
      focus: ["h"],
    },
    boost: {
      text: "The short hand stands between two numbers: the hour is the smaller one. For the long hand each number on the face is 5 minutes, so count in fives from 12.",
    },
    boost_by_mistake: {
      half_past_wrong_hour: {
        text: "The short hand has not reached the next number yet. The hour is the number it has already passed.",
      },
    },
    almost: [
      "The short hand is between 7 and 8, so the hour is 7.",
      "The long hand is on 6: 5, 10, 15, 20, 25, □ minutes.",
    ],
    worked: [
      "The short hand is between 7 and 8: the hour is 7",
      "The long hand is on 6: 6 × 5 = 30 minutes",
      "7 : 30, half past seven",
    ],
  },
};

/** Written addition with a carry: 47 + 38. */
const ADD_COLUMN: ColumnSum = { op: "add", operands: [47, 38], given_steps: 0, carry_row: true };
const ADD_WITH_CARRY: FamilySpec = {
  id: "x12",
  question_type: QuestionType.Column,
  say: "Add in columns: forty-seven plus thirty-eight.",
  family: Family.Slots,
  data: {
    template: "",
    column: ADD_COLUMN,
    gaps: columnKey(ADD_COLUMN).gaps,
  },
  key: columnKey(ADD_COLUMN).key,
  help: {
    look: { text: "Start on the right, with the ones: seven and eight.", focus: ["r0"] },
    boost: {
      text: "Seven and eight make more than ten, so one ten goes in the small box. In the tens, add all three numbers: the two from the sum and the one in the small box.",
    },
    worked: ["7 + 8 = 15: write 5, carry 1", "4 + 3 + 1 = 8", "47 + 38 = 85"],
    almost: ["7 + 8 = 15: write 5, carry 1", "4 + 3 + 1 = □"],
  },
};

const WITH_HELP = { TWO_FACTS, EVEN_NUMBERS, PURSE, HALF_PAST_SEVEN, ADD_WITH_CARRY };

/** A verdict as the judge (`packages/core`) gives it: a class, and each part right or not. */
const verdict = (mistake_class: string, parts: Record<string, boolean>): Verdict => ({
  correct: false,
  mistake_class,
  parts: Object.entries(parts).map(([id, correct]) => ({
    id,
    correct,
    mistake_class: correct ? null : mistake_class,
  })),
});

/** TWO_FACTS with another ladder. */
const spec = (help: StepHelp): FamilySpec => ({ ...TWO_FACTS, help });

const hint = (text: string): HintCard => ({ text });
const hints = (...texts: string[]): HintCard[] => texts.map(hint);
const texts = (cards: { text: string }[] | null | undefined) => (cards ?? []).map((c) => c.text);

describe("the help ladder (help.ts)", () => {
  it("climbs one rung at a time and skips a rung nobody wrote", () => {
    expect(nextRung({ help: full }, HelpRung.None)).toBe(HelpRung.Look);
    expect(nextRung({ help: full }, HelpRung.Look)).toBe(HelpRung.Boost);
    expect(nextRung({ help: { boost: full.boost } }, HelpRung.None)).toBe(HelpRung.Boost);
    expect(nextRung({ help: { boost: full.boost } }, HelpRung.Boost)).toBeNull();
    expect(nextRung(undefined, HelpRung.None)).toBeNull();
    expect(nextRung({ help: undefined }, HelpRung.None)).toBeNull();
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
    expect(almost.hints).toBeNull();
    const twin = release(spec(full), HelpRung.Twin);
    expect(twin.worked).toEqual(["first line", "second line", "last line"]);
    expect(twin.blank).toBe(false);
  });

  it("shows rung 3 as the author wrote it when almost is written, with no drawn blank", () => {
    const written: StepHelp = { ...full, almost: ["first line", "second line", "last = □"] };
    const almost = release(spec(written), HelpRung.Almost);
    expect(almost.worked).toEqual(["first line", "second line", "last = □"]);
    expect(almost.blank).toBe(false);
    // A written rung 3 is enough on its own: one worked line no longer skips the rung.
    expect(
      nextRung({ help: { almost: ["7 + 7 = □"], worked: ["7 + 7 = 14"] } }, HelpRung.None),
    ).toBe(HelpRung.Almost);
    expect(nextRung({ help: { worked: ["7 + 7 = 14"] } }, HelpRung.None)).toBe(HelpRung.Twin);
  });

  it("never reaches the page with the step: pageSpec strips the ladder as it strips the key", () => {
    const spec = TWO_FACTS;
    expect(spec.help).toBeDefined();
    expect(JSON.stringify(pageSpec(spec))).not.toMatch(/"help"|"worked"|"twin"/);
    const hinted = { ...spec, help: { hints: hints("Count the rows.", "It is 7, then 8.") } };
    expect(JSON.stringify(pageSpec(hinted))).not.toMatch(/"hints"|Count the rows/);
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
    // Without the spec no answer is known, so nothing is held: a test with help alone.
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
    expect(look.hints).toBeNull();
    expect(texts(release(mixed, HelpRung.Boost).hints)).toEqual(["Now the columns."]);
    // With hints, worked is their recap on rung 4, never a rung 3 of its own.
    expect(rungsWritten(mixed)).toEqual([HelpRung.Look, HelpRung.Boost, HelpRung.Twin]);
    const top = release(mixed, HelpRung.Twin);
    expect(texts(top.hints)).toEqual(["It is 7, then 8."]);
    expect(top.worked).toHaveLength(3);
  });
});

describe("the hint stack", () => {
  const four = spec({
    hints: hints("Count the rows.", "Now the columns.", "The first one is 7.", "So 7 and 8."),
  });

  it("releases the cards cumulatively, numbered out of all of them", () => {
    expect(texts(releaseStack(four, 1).hints)).toEqual(["Count the rows."]);
    const two = releaseStack(four, 2);
    expect(texts(two.hints)).toEqual(["Count the rows.", "Now the columns."]);
    expect(two.hintsTotal).toBe(4);
    expect(two.rung).toBe(2);
    expect(two.twin).toBeNull();
  });

  it("shows the free hints at once and holds the rest, the last among them, until one attempt", () => {
    expect(stackFree(four)).toBe(2);
    expect(stackNext(four, 0, false)).toBe(1);
    expect(stackNext(four, 1, false)).toBe(2);
    expect(stackNext(four, 2, false)).toBeNull();
    expect(stackNext(four, 2, true)).toBe(3);
    expect(stackNext(four, 3, true)).toBe(4);
    expect(stackNext(four, 4, true)).toBeNull();
    // A leaking first hint leaves nothing free: the whole stack waits for an attempt.
    const leaky = spec({ hints: hints("The first one is 7.", "So 7 and 8.") });
    expect(stackFree(leaky)).toBe(0);
    expect(stackNext(leaky, 0, false)).toBeNull();
    expect(stackNext(leaky, 0, true)).toBe(1);
    // Two hints: the last waits.
    const two = spec({ hints: hints("Count the rows.", "So 7 and 8.") });
    expect(stackNext(two, 1, false)).toBeNull();
  });

  it("is the ladder's cards in order when a step has no hints", () => {
    const s = spec(full);
    expect(helpTop(s)).toBe(HelpRung.Twin);
    expect(stackNext(s, HelpRung.None, false)).toBe(HelpRung.Look);
    expect(stackNext(s, HelpRung.Boost, false)).toBeNull();
    const stack = releaseStack(s, HelpRung.Almost, namedMiss("odd_as_even"));
    expect(stack.hintsTotal).toBe(4);
    expect(stack.hints).toEqual([
      { text: "One you picked ends in an odd digit." },
      { text: "Split it into two rows." },
      { text: "", lines: ["first line", "second line"], blank: true },
    ]);
    expect(stack.rung).toBe(HelpRung.Almost);
    const top = releaseStack(s, HelpRung.Twin);
    expect(top.hints?.[3]).toEqual({ text: "", lines: ["first line", "second line", "last line"] });
    expect(top.twin).toBeNull();
  });
});

describe("pageHelpOf", () => {
  const withTwin = TWO_FACTS;

  it("strips the twin of its key, counts the note's cards and says whether more is written", () => {
    expect(withTwin.help?.twin).toBeDefined();
    const top = pageHelpOf(withTwin, HelpRung.Twin);
    expect(top.twin).not.toBeNull();
    expect(JSON.stringify(top.twin)).not.toMatch(/"key"/);
    expect(top.more).toBe(false);
    expect(pageHelpOf(withTwin, HelpRung.Look).more).toBe(true);
    expect(pageHelpOf(withTwin, HelpRung.Look).hintsTotal).toBe(rungsWritten(withTwin).length);
  });

  it("counts cards in a step of hints", () => {
    const four = spec({
      hints: hints("Count the rows.", "Now the columns.", "The first one is 7.", "So 7 and 8."),
    });
    expect(helpTop(four)).toBe(4);
    expect(helpLeft(four, 3)).toBe(true);
    expect(helpLeft(four, 4)).toBe(false);
    expect(helpNext(four, 2, false)).toBeNull();
    const page = pageHelpOf(four, 3);
    expect(texts(page.hints)).toHaveLength(3);
    expect(page.more).toBe(true);
    expect(page.hintsTotal).toBe(4);
  });
});

describe("validate: the help ladder", () => {
  const base = TWO_FACTS;

  it("passes every question written with help, and its twin", () => {
    for (const [name, spec] of Object.entries(WITH_HELP)) {
      expect(
        validate(spec).filter((p) => p.level === "error"),
        name,
      ).toEqual([]);
      if (spec.help?.twin)
        expect(
          validate(spec.help.twin as FamilySpec).filter((p) => p.level === "error"),
          `${name} twin`,
        ).toEqual([]);
    }
  });

  it("refuses a look or boost card that gives the answer away", () => {
    const leaky = { ...base, help: { ...base.help, boost: { text: "It is 7, then 8." } } };
    expect(validate(leaky).map((p) => p.rule)).toContain("key_in_help");
  });

  it("refuses a twin of another exercise type, or one with help of its own", () => {
    const other = {
      ...base,
      help: {
        ...base.help,
        twin: { ...must(base.help?.twin), question_type: QuestionType.FillTable },
      },
    } as FamilySpec;
    expect(validate(other).map((p) => p.rule)).toContain("twin_not_alike");
    const nested = {
      ...base,
      help: { ...base.help, twin: { ...must(base.help?.twin), help: { look: { text: "x" } } } },
    } as unknown as FamilySpec;
    expect(validate(nested).map((p) => p.rule)).toContain("twin_has_help");
  });

  it("refuses an empty almost line, warns when none has a □, and does not read the key into it", () => {
    const empty = { ...base, help: { ...base.help, almost: ["7 + 7 = □", " "] } } as FamilySpec;
    expect(
      validate(empty)
        .filter((p) => p.path === "help.almost")
        .map((p) => p.rule),
    ).toContain("empty_label");
    const noBlank = { ...base, help: { ...base.help, almost: ["Count the dots."] } } as FamilySpec;
    const warned = validate(noBlank).find((p) => p.rule === "almost_without_blank");
    expect(warned?.level).toBe("warning");
    const key = (must(base.help).worked ?? [])[(must(base.help).worked ?? []).length - 1] ?? "";
    const withKey = { ...base, help: { ...base.help, almost: [key, "then □"] } } as FamilySpec;
    expect(
      validate(withKey)
        .filter((p) => p.path === "help.almost")
        .map((p) => p.rule),
    ).not.toContain("key_in_help");
  });

  it("needs words for a help picture", () => {
    const spec = {
      ...base,
      help: {
        look: { text: "Look.", picture: { kind: "dots" as const, rows: 2, cols: 3, alt: " " } },
      },
    };
    expect(validate(spec).map((p) => p.rule)).toContain("missing_alt");
    expect(spec.family).toBe(Family.Slots);
  });

  it("Khan hints: each has words and its pictures theirs; an early one that gives the answer is a warning, held by the gate", () => {
    const picture = { src: "/media/khan/a.svg", alt: "Two rows of dots.", width: 10, height: 5 };
    const problems = (hints: { text: string; pictures?: (typeof picture)[] }[]) =>
      validate({ ...base, help: { hints } });
    const rules = (hints: { text: string; pictures?: (typeof picture)[] }[]) =>
      problems(hints).map((p) => p.rule);
    expect(
      rules([{ text: "Count the rows.", pictures: [picture] }, { text: "It is 7, then 8." }]),
    ).toEqual([]);
    const leaky = problems([{ text: "It is 7, then 8." }, { text: "Count the rows." }]);
    expect(leaky.map((p) => `${p.level} ${p.rule} ${p.path}`)).toEqual([
      "warning hint_leaks_early help.hints[0]",
    ]);
    expect(
      rules([
        { text: "Count the rows." },
        { text: "The first is 7." },
        { text: "It is 7, then 8." },
      ]),
    ).toEqual(["hint_leaks_early"]);
    expect(rules([{ text: " " }])).toContain("empty_label");
    expect(rules([{ text: "Look.", pictures: [{ ...picture, alt: "" }] }])).toContain(
      "missing_alt",
    );
  });

  it("a hint picture marked decorative may have empty alt; one that is not still needs words (dl-w3.70.10)", () => {
    const picture = { src: "/media/khan/a.png", alt: "", width: 10, height: 5 };
    const rules = (decorative?: true) =>
      validate({
        ...base,
        help: {
          hints: [{ text: "Two rows of three dots.", pictures: [{ ...picture, decorative }] }],
        },
      }).map((p) => p.rule);
    expect(rules(true)).toEqual([]);
    expect(rules()).toContain("missing_alt");
  });
});

describe("rung 2 on a graph (dl-w3.51.3)", () => {
  const graph: FamilySpec = {
    id: "g1",
    say: "Draw it",
    question_type: QuestionType.DrawGraph,
    family: Family.Place,
    data: {
      surface: Surface.Bars,
      kind: "bar",
      categories: [
        { id: "a", label: "apples" },
        { id: "b", label: "pears" },
      ],
      max: 10,
      step: 1,
    },
    key: { surface: Surface.Bars, heights: { a: 6, b: 4 } },
    help: { give: ["a"], worked: ["Apples: 6", "Pears: 4"] },
  };

  it("gives a bar drawn to its height, read from the key, and nothing on another surface", () => {
    expect(givenOf(graph, ["a"])).toEqual({ heights: { a: 6 } });
    expect(givenOf(graph, ["zz"])).toEqual({ heights: {} });
    expect(release(graph, HelpRung.Boost, { mistake: null, missed: ["a", "b"] }).given).toEqual({
      heights: { a: 6 },
    });
    const line: FamilySpec = {
      ...graph,
      question_type: QuestionType.NumberLinePlace,
      data: { surface: Surface.NumberLine, min: 0, max: 10, step: 1, labelled: [0, 10] },
      key: { surface: Surface.NumberLine, value: 3, tolerance: 0 },
    };
    expect(givenOf(line, ["a"])).toBeNull();
  });
});

// The solution card's lines (Choose addendum 1.2, dl-uukj.29.86).
describe("solutionLines", () => {
  const choose = EVEN_NUMBERS;
  const pic = { src: "/media/khan/a.svg", alt: "three groups of two", width: 100, height: 50 };
  it("gives every worked line in ink, and a hint picture only under a line that refers to it", () => {
    const spec = {
      ...choose,
      help: {
        hints: [
          {
            text: "$\\blueD3 \\times \\maroonD2$ is $\\blueD3$ groups of $\\maroonD2$.",
            pictures: [pic],
          },
          { text: "The following image shows $\\blueD3\\times\\maroonD2$:", pictures: [pic] },
        ],
        worked: [
          "$\\blueD3 \\times \\maroonD2$ is $\\blueD3$ groups of $\\maroonD2$.",
          "The following image shows $\\blueD3\\times\\maroonD2$:",
        ],
      },
    } as FamilySpec;
    expect(solutionLines(spec)).toEqual([
      { text: "$3 \\times 2$ is $3$ groups of $2$." },
      { text: "The following image shows $3\\times2$:", pictures: [pic] },
    ]);
  });

  it("falls back to a Choose key's worked solution, and gives nothing with no worked lines", () => {
    expect(
      solutionLines({
        ...choose,
        help: undefined,
        key: { ...choose.key, worked_solution: ["7 × 6 = 42"] },
      } as FamilySpec),
    ).toEqual([{ text: "7 × 6 = 42" }]);
    expect(solutionLines({ ...choose, help: undefined } as FamilySpec)).toEqual([]);
  });

  it("knows a line that points at a picture, in each language", () => {
    expect(refersToPicture("This image shows 3 groups.")).toBe(true);
    expect(refersToPicture("Na rysunku są 2 rzędy.")).toBe(true);
    expect(refersToPicture("So:")).toBe(true);
    expect(refersToPicture("There are 7 rows with 6 flowers in each row.")).toBe(false);
  });
});

// Help follows the missed part (Slots addendum 2.3, dl-4e0f 12b). The verdicts are written out, as
// the judge (`packages/core`) gives them.
describe("help follows the missed part", () => {
  const twoFacts = TWO_FACTS;
  const purse = PURSE;
  const clock = HALF_PAST_SEVEN;
  const column = ADD_WITH_CARRY;

  it("two-facts, the first right and the second wrong: rung 1 outlines the second, rung 2 gives nothing", () => {
    const m = lastMissOf(twoFacts, verdict("other_wrong", { g1: true, g2: false }));
    expect(m.missed).toEqual(["g2"]);
    expect(release(twoFacts, HelpRung.Look, m).focus).toEqual(["g2"]);
    expect(release(twoFacts, HelpRung.Boost, m).given).toBeNull();
    expect(release(twoFacts, HelpRung.Almost, m).given).toBeNull();
  });

  it("purse, both gaps wrong: rung 1 follows the named mistake, rung 2 gives the złote, never the grosze", () => {
    const m = lastMissOf(purse, verdict("counted_coins_not_value", { zl: false, gr: false }));
    expect(m.missed).toEqual(["zl", "gr"]);
    expect(release(purse, HelpRung.Look, m).card?.text).toBe(
      purse.help?.boost_by_mistake?.["counted_coins_not_value"]?.text,
    );
    expect(release(purse, HelpRung.Look, m).focus).toEqual(["zl"]);
    expect(release(purse, HelpRung.Boost, m).given).toEqual({ gaps: { zl: "3" } });
  });

  it("half-past-seven, the hour wrong: no rung fills the hour", () => {
    const m = lastMissOf(clock, verdict("half_past_wrong_hour", { h: false, m: true }));
    expect(m.missed).toEqual(["h"]);
    for (const rung of [HelpRung.Look, HelpRung.Boost, HelpRung.Almost, HelpRung.Twin] as const)
      expect(release(clock, rung, m).given).toBeNull();
  });

  it("reads the misses in fill order: a written sum from its units", () => {
    const m = lastMissOf(column, verdict("fact_error", { r1: false, c1: true, r0: false }));
    expect(m.missed).toEqual(["r0", "r1"]);
    expect(release(column, HelpRung.Boost, m).given).toEqual({ gaps: { r0: "5" } });
  });

  it("before any miss: the look outlines what its author named, and rung 2 gives nothing", () => {
    expect(followed(twoFacts, { mistake: null, missed: null })).toEqual({
      focus: twoFacts.help?.look?.focus ?? null,
      give: [],
    });
    expect(release(twoFacts, HelpRung.Boost).given).toBeNull();
  });

  it("a choice keeps its author’s lists: taking a distractor away gives no part’s answer", () => {
    const choose = EVEN_NUMBERS;
    expect(lastMissOf(choose, verdict("missed_option", {})).missed).toBeNull();
    expect(followed(choose, namedMiss("missed_option")).give).toEqual(choose.help?.give ?? []);
  });
});
