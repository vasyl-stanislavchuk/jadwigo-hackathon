import type {
  EnterKey,
  FamilyQuestion,
  Figure,
  GapKey,
  RuleRef,
  Simplify,
} from "@jadwigo/contracts";
import { isEquation } from "./enter/expression.ts";
import { canSlip } from "./enter/text.ts";

/**
 * The mistake-class rules for numbers, shared by every family that takes one: a port of
 * src/dl/grading/mistakes.py classify(), classify_fill_blank() and classify_number_line(), rule for
 * rule and in the same order.
 *
 * A key may name a rule (`RuleRef`). A family judge asks for it only after the author's own `near`
 * table found nothing, and treats `other_wrong` from a rule as "no class yet", so a later check
 * (`gap_swap`) still gets its turn.
 */

export const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
/** A finite number, whole or not: what a number line's position may be since dl-w3.55. */
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
/** Binary noise in a sum of fractions (0.1 + 0.2) never decides a verdict. */
const EPS = 1e-9;
export const withinTolerance = (value: number, target: number, tolerance: number): boolean =>
  Math.abs(value - target) <= tolerance + EPS;

const reversed = (n: number): number => Number(String(n).split("").reverse().join(""));
const floorDiv = (a: number, b: number): number => Math.floor(a / b);
/** Python's % (the sign follows the divisor). */
const mod = (a: number, b: number): number => ((a % b) + b) % b;

/** mistakes.py classify(): an incorrect a×b value. */
export function classify(
  a: number,
  b: number,
  value: unknown,
  recentProducts: readonly number[],
): string {
  if (!isInt(value)) return "other_wrong";
  const key = a * b;
  if (value === key) throw new Error("classify() takes incorrect values only");
  if ([a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b].includes(value)) return "neighbour_row";
  if (recentProducts.includes(value)) return "neighbour_fact_swap";
  if (value === a + b) return "add_for_multiply";
  return keyOnlyClass(key, value) ?? "other_wrong";
}

function keyOnlyClass(key: number, value: number): string | null {
  if (Math.abs(value - key) <= 2) return "off_by_small";
  const twoDigitKey = key >= 10 && key <= 99 && floorDiv(key, 10) !== mod(key, 10);
  if (twoDigitKey && value >= 10 && value <= 99 && reversed(value) === key) return "digit_reversal";
  if (key >= 10 && floorDiv(value, 10) === floorDiv(key, 10) && mod(value, 10) !== mod(key, 10))
    return "same_decade";
  return null;
}

const BLANK = "□";

type FillBlank = Extract<RuleRef, { rule: "fill_blank" }>;
type NumberLine = Extract<RuleRef, { rule: "number_line" }>;

function productBlank(rule: FillBlank): [number, number] | null {
  const template = rule.template.replaceAll(" ", "");
  const [a, b] = rule.operands;
  if (
    rule.op !== "mul" ||
    rule.operands.length !== 2 ||
    a === undefined ||
    b === undefined ||
    !template.endsWith(`=${BLANK}`)
  )
    return null;
  return [a, b];
}

function inverseCandidates(rule: FillBlank): Set<number> {
  const [x, y] = rule.operands;
  if (rule.operands.length !== 2 || x === undefined || y === undefined) return new Set();
  if (rule.op === "add" || rule.op === "sub") return new Set([x + y, Math.abs(x - y)]);
  const out = new Set([x * y]);
  if (y && mod(x, y) === 0) out.add(floorDiv(x, y));
  if (x && mod(y, x) === 0) out.add(floorDiv(y, x));
  return out;
}

/** mistakes.py classify_fill_blank(): one missing number in an equation, read from its rule. */
function classifyFillBlank(rule: FillBlank, answer: number, value: unknown): string {
  if (!isInt(value)) return "other_wrong";
  if (value === answer) throw new Error("classify_fill_blank() takes incorrect values only");
  const product = productBlank(rule);
  let found: string | null;
  if (product !== null && product[0] * product[1] === answer) {
    found = classify(product[0], product[1], value, rule.recent);
    if (found === "other_wrong") found = null;
  } else {
    found = keyOnlyClass(answer, value);
  }
  if (found !== null) return found;
  const inverse = inverseCandidates(rule);
  inverse.delete(answer);
  if (inverse.has(value)) return "inverse_confusion";
  return "other_wrong";
}

/**
 * mistakes.py classify_number_line(), widened to fractions (dl-w3.55): a position, an answer and a
 * step may be non-whole, and every comparison allows binary noise. The three classes stay as they
 * are: `off_by_tick` (one step either way), `scale_misread` (ticks counted instead of values) and
 * `wrong_direction` (mirrored about the middle). On whole numbers it answers as the Python does.
 */
export function classifyNumberLine(
  rule: NumberLine,
  answer: number,
  tolerance: number,
  value: unknown,
): string {
  if (!isNum(value)) return "other_wrong";
  if (withinTolerance(value, answer, tolerance))
    throw new Error("classify_number_line() takes incorrect values only");
  const { min: low, max: high, step } = rule;
  const near = (target: number): boolean => withinTolerance(value, target, tolerance);
  if (near(answer - step) || near(answer + step)) return "off_by_tick";
  const stepsIn = (answer - low) / step;
  const onTick = Math.abs(stepsIn - Math.round(stepsIn)) < EPS;
  const misread =
    rule.mode === "read" ? (onTick ? Math.round(stepsIn) : null) : low + answer * step;
  if (misread !== null && near(misread)) return "scale_misread";
  if (near(low + high - answer)) return "wrong_direction";
  return "other_wrong";
}

/**
 * The class a rule gives an incorrect number. `answer` and `tolerance` are the key's first accepted
 * value and its tolerance. A value the rule cannot read is `other_wrong`, as in the Python.
 */
export function applyRule(
  rule: RuleRef,
  value: unknown,
  answer: number,
  tolerance: number,
): string {
  switch (rule.rule) {
    case "times_table":
      return classify(rule.a, rule.b, value, rule.recent);
    case "fill_blank":
      return classifyFillBlank(rule, answer, value);
    case "number_line":
      return classifyNumberLine(rule, answer, tolerance, value);
  }
}

/** The classes `keyOnlyClass` can give a miss on this key. */
function keyOnlyClasses(key: number): string[] {
  const twoDigit = key >= 10 && key <= 99 && floorDiv(key, 10) !== mod(key, 10);
  return [
    "off_by_small",
    ...(twoDigit ? ["digit_reversal"] : []),
    ...(key >= 10 ? ["same_decade"] : []),
  ];
}

/** The classes `classify()` can give a miss on a×b. */
function classifyClasses(a: number, b: number, recent: readonly number[]): string[] {
  return [
    "neighbour_row",
    ...(recent.length > 0 ? ["neighbour_fact_swap"] : []),
    ...(a + b !== a * b ? ["add_for_multiply"] : []),
    ...keyOnlyClasses(a * b),
  ];
}

/** The classes `applyRule` can give a miss on this rule, `answer` the key's first value. */
function ruleClasses(rule: RuleRef, answer: number): string[] {
  switch (rule.rule) {
    case "times_table":
      return classifyClasses(rule.a, rule.b, rule.recent);
    case "fill_blank": {
      const product = productBlank(rule);
      const inverse = inverseCandidates(rule);
      inverse.delete(answer);
      return [
        ...(product !== null && product[0] * product[1] === answer
          ? classifyClasses(product[0], product[1], rule.recent)
          : keyOnlyClasses(answer)),
        ...(inverse.size > 0 ? ["inverse_confusion"] : []),
      ];
    }
    case "number_line":
      return ["off_by_tick", "scale_misread", "wrong_direction"];
  }
}

const WHOLE = /^-?[0-9]+$/;

/** What `enterClass` can give a typed entry on this key: an Enter field, or a typed gap. */
function entryClasses(
  input: "number" | "text" | "expression" | "fraction",
  key: EnterKey,
  figure?: Figure,
  simplify?: Simplify,
): string[] {
  const near = Object.values(key.near ?? {});
  const first = key.accept[0] ?? "";
  switch (input) {
    case "text":
      return [
        ...near,
        ...(key.accents !== "ignore" ? ["missing_diacritics"] : []),
        ...(key.case !== "ignore" ? ["wrong_case"] : []),
        ...(key.accept.some((a) => canSlip(key, a)) ? ["typo"] : []),
      ];
    case "number":
      return [
        ...near,
        ...(key.rule !== undefined && WHOLE.test(first)
          ? ruleClasses(key.rule, Number.parseInt(first, 10))
          : []),
        ...(figure?.kind === "ruler" ? ["off_by_one_unit", "unit_mixed"] : []),
      ];
    case "expression": {
      if (isEquation(first))
        return [
          ...near,
          "not_an_expression",
          "not_an_equation",
          ...(key.sides === "kept" ? ["equation_sides_swapped"] : []),
          "sum_for_product",
          "product_for_sum",
          "number_for_expression",
          "wrong_form",
          "value_off",
        ];
      const shaped = key.form !== undefined && key.form !== "any";
      return [
        ...near,
        "not_an_expression",
        ...(shaped ? ["number_for_expression", "wrong_form"] : []),
        ...(key.form === "product" ? ["sum_for_product"] : []),
        ...(key.form === "sum" ? ["product_for_sum"] : []),
        "value_off",
      ];
    }
    case "fraction":
      return [
        ...near,
        ...(key.exact_terms || (key.forms ?? []).length > 0 ? ["wrong_form"] : []),
        ...(simplify === "enforced" && !key.exact_terms ? ["unsimplified"] : []),
        "fraction_flipped",
      ];
  }
}

/** What a gap's own judging can give: Enter's classes for a typed gap, the near table for a chosen one. */
function gapClasses(
  input: "number" | "text" | "fraction" | null,
  key: GapKey | undefined,
  simplify?: Simplify,
): string[] {
  if (key === undefined) return [];
  if (key.kind === "enter")
    return input === null
      ? Object.values(key.near ?? {})
      : entryClasses(input, key, undefined, simplify);
  return Object.values(key.near ?? {});
}

/** The classes a family judge can give a miss on this question, before `other_wrong`. */
function judgedClasses(q: FamilyQuestion): string[] {
  switch (q.family) {
    case "choose": {
      const right = new Set(q.key.correct);
      const near = q.key.near ?? {};
      const wrong = q.data.options.filter((o) => !right.has(o.id));
      const own = wrong.flatMap((o) => (Object.hasOwn(near, o.id) ? [near[o.id] ?? ""] : []));
      if (q.data.select === "one") return own;
      const unnamed = wrong.some((o) => !Object.hasOwn(near, o.id));
      return q.data.layout === "inline"
        ? [...own, ...(unnamed ? ["took_unneeded_number"] : []), "missed_needed_number"]
        : [...own, ...(unnamed ? ["wrong_pick"] : []), "missed_option"];
    }
    case "enter":
      return entryClasses(q.data.input, q.key, q.data.figure, q.data.simplify);
    case "slots": {
      const gaps = q.data.gaps.flatMap((gap) =>
        gapClasses(
          gap.kind === "enter" ? gap.input : null,
          q.key.gaps[gap.id],
          gap.kind === "enter" ? gap.simplify : undefined,
        ),
      );
      const others = q.data.column ? ["fact_error"] : q.data.gaps.length > 1 ? ["gap_swap"] : [];
      return [...gaps, ...others];
    }
    case "sequence": {
      const length = q.key.orders[0]?.length ?? 0;
      return [
        "other_order",
        "swapped_neighbours",
        ...(length > 2 ? ["one_misplaced", "reversed"] : []),
        ...(q.data.tiles !== undefined ? ["extra_tile", "missing_tile"] : []),
      ];
    }
    case "group":
      return [
        "not_placed",
        "wrong_group",
        ...Object.values(q.key.near ?? {}).flatMap((byGroup) => Object.values(byGroup)),
      ];
    case "place": {
      const key = q.key;
      switch (key.surface) {
        case "number_line":
          return key.rule ? ruleClasses(key.rule, key.value) : [];
        case "image":
          return [
            "missed_region",
            ...(key.near ?? []).map((r) => r.mistake_class),
            ...(key.require_all && key.targets.length > 1 ? ["target_missed"] : []),
          ];
        case "grid":
          return key.split !== undefined
            ? ["wrong_size", "no_split", "split_not_helpful"]
            : key.off_by_one
              ? ["grid_off_by_one"]
              : [];
        case "bars":
          return ["bar_wrong", "bar_off_by_step"];
        case "clock": {
          const free = q.data.surface === "clock" && q.data.hands === "free";
          return [
            "hands_swapped",
            "wrong_hour",
            ...(key.m === 30 ? ["half_past_wrong_hour"] : []),
            ...(free && key.m >= 30 ? ["hour_hand_not_moved"] : []),
            "minute_off_by_step",
            "wrong_minute",
          ];
        }
        case "coins":
          return [
            ...(key.fewest ? ["not_fewest"] : []),
            "zloty_grosze_mixed",
            "one_coin_off",
            "too_much",
            "too_little",
          ];
        case "fraction": {
          const drawn = q.data.surface === "fraction" ? q.data : null;
          return [
            ...(drawn?.contiguous ? ["parts_apart"] : []),
            ...(drawn !== null ? ["shaded_the_rest", "shaded_whole"] : []),
            "off_by_one_part",
            "wrong_count",
          ];
        }
      }
      return [];
    }
    case "explain":
      return [];
  }
}

/**
 * The mistake classes the family judge can give a miss on this question, read from its own data
 * and key (dl-e8ov.5.38.15): what a `boost_by_mistake` key may name, since a card for any other
 * class never shows. The classes that apply to its input and kind (a whole-number key never gives
 * `wrong_case`), its `near` tables, the named rule's classes only when its key names one, and
 * `other_wrong`, which every judge gives a value it cannot read. Explain has no judge, so none.
 * Sorted, each once. The golden corpus holds every class a judge gave to this list (rules.test.ts).
 */
export function mistakeClassesOf(question: FamilyQuestion): string[] {
  if (question.family === "explain") return [];
  return [...new Set(["other_wrong", ...judgedClasses(question)])].sort();
}
