import type { RuleRef } from "@jadwigo/contracts";

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
