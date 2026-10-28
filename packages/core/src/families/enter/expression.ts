/**
 * A short arithmetic expression as a child types it on the keypad (dl-w3.51.1, Enter with
 * `input: expression`): whole numbers, + − × ÷ and brackets. A tiny recursive-descent parser, no
 * dependency, because the judge compares expressions by VALUE and by FORM, never by string: `5×2`
 * and `2×5` are the same product, `2+2+2+2+2` has the same value but is a sum.
 *
 * The rule follows Perseus's expression widget, read and cited, never copied: its scorer parses
 * both the answer and the key, compares values, and with `form: true` also asks that both strip
 * to the same shape, where a product's factors may stand in either order
 * (https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets/expression,
 * packages/perseus-score/src/widgets/expression/score-expression.ts and
 * packages/kas/src/compare.ts: `form` → `sameForm`, which compares the normalised, commutatively
 * sorted trees). We keep the part a grade 2 and 3 child meets: no variables, no decimals, no
 * powers. A key may be written with Khan's TeX signs (`\times`, `\cdot`, `\div`) or with the
 * keypad's own glyphs; both read the same.
 *
 * Ported from david-learns `frontend/src/families/enter/expression.ts`, the judge's half: the
 * equation keypad's signs stay with the page.
 */

type Op = "+" | "−" | "×" | "÷";

export type Expr =
  | { kind: "num"; value: number }
  | { kind: "neg"; arg: Expr }
  | { kind: "op"; op: Op; left: Expr; right: Expr };

/** The top-level operation of an expression: what it is, as a form. */
export type Form = "number" | "sum" | "difference" | "product" | "quotient";

/** The signs the expression keypad offers, in the order it draws them. */
const EXPRESSION_SIGNS: readonly string[] = ["×", "÷", "+", "−", "(", ")"];

/** What a hardware key or a pasted sign means on the keypad: `*`, `x` and `·` are ×, `/` and `:`
 * are ÷, every dash is −. */
const SYNONYMS: Record<string, string> = {
  "*": "×",
  x: "×",
  X: "×",
  "·": "×",
  "⋅": "×",
  "/": "÷",
  ":": "÷",
  "-": "−",
  "–": "−",
  "—": "−",
};

/** The sign a typed character stands for, or null when it is not one. */
export function signOf(key: string): string | null {
  const sign = SYNONYMS[key] ?? key;
  return EXPRESSION_SIGNS.includes(sign) ? sign : null;
}

const TEX: [RegExp, string][] = [
  [/\\(?:times|cdot)(?![a-zA-Z])/g, "×"],
  [/\\div(?![a-zA-Z])/g, "÷"],
  [/\\(?:left|right)(?![a-zA-Z])/g, ""],
];

/** The text with TeX signs and synonyms folded to the keypad's glyphs and its spaces tidied (a
 * space between two numbers stays, so `2 5` is not 25). The result is for parsing and for writing
 * a key; the learner's own entry is kept as typed. */
export function plainSigns(text: string): string {
  let out = text;
  for (const [re, to] of TEX) out = out.replace(re, to);
  out = out.replace(/[{}]/g, "");
  return [...out]
    .map((ch) => (/\s/.test(ch) ? " " : (SYNONYMS[ch] ?? ch)))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/ ?([×÷+−()]) ?/g, "$1")
    .trim();
}

type Token = { kind: "num"; value: number } | { kind: "sign"; sign: string };

function tokens(text: string): Token[] | null {
  const out: Token[] = [];
  const src = plainSigns(text);
  const digit = (at: number): boolean => /[0-9]/.test(src[at] ?? "");
  let i = 0;
  while (i < src.length) {
    const ch = src[i] ?? "";
    if (digit(i)) {
      let j = i;
      while (j < src.length && digit(j)) j++;
      out.push({ kind: "num", value: Number.parseInt(src.slice(i, j), 10) });
      i = j;
    } else if (EXPRESSION_SIGNS.includes(ch)) {
      out.push({ kind: "sign", sign: ch });
      i++;
    } else if (ch === " ") i++;
    else return null;
  }
  return out;
}

/**
 * expr   := term (('+' | '−') term)*
 * term   := factor (('×' | '÷') factor)*
 * factor := '−' factor | '(' expr ')' | number
 */
export function parseExpression(text: string): Expr | null {
  const scanned = tokens(text);
  if (scanned === null || scanned.length === 0) return null;
  const ts: Token[] = scanned;
  let pos = 0;
  const peek = (sign: string): boolean => {
    const t = ts[pos];
    return t !== undefined && t.kind === "sign" && t.sign === sign;
  };
  /** The operation at `pos` when it is one of `ops`, else null. */
  const opAt = (...ops: Op[]): Op | null => ops.find((op) => peek(op)) ?? null;
  const fail = Symbol("parse error");

  function factor(): Expr {
    if (peek("−")) {
      pos++;
      return { kind: "neg", arg: factor() };
    }
    if (peek("(")) {
      pos++;
      const inner = expr();
      if (!peek(")")) throw fail;
      pos++;
      return inner;
    }
    const t = ts[pos];
    if (t === undefined || t.kind !== "num") throw fail;
    pos++;
    return { kind: "num", value: t.value };
  }
  function term(): Expr {
    let left = factor();
    for (let op = opAt("×", "÷"); op !== null; op = opAt("×", "÷")) {
      pos++;
      left = { kind: "op", op, left, right: factor() };
    }
    return left;
  }
  function expr(): Expr {
    let left = term();
    for (let op = opAt("+", "−"); op !== null; op = opAt("+", "−")) {
      pos++;
      left = { kind: "op", op, left, right: term() };
    }
    return left;
  }
  try {
    const out = expr();
    return pos === ts.length ? out : null;
  } catch (e) {
    if (e === fail) return null;
    throw e;
  }
}

/** The value, or null when a division has no finite answer. */
export function evaluate(e: Expr): number | null {
  switch (e.kind) {
    case "num":
      return e.value;
    case "neg": {
      const v = evaluate(e.arg);
      return v === null ? null : -v;
    }
    case "op": {
      const l = evaluate(e.left);
      const r = evaluate(e.right);
      if (l === null || r === null) return null;
      switch (e.op) {
        case "+":
          return l + r;
        case "−":
          return l - r;
        case "×":
          return l * r;
        case "÷":
          return r === 0 ? null : l / r;
      }
    }
  }
}

/** What the expression is, by its top-level operation. Brackets around the whole do not count:
 * `(2×5)` is a product. A negated number is a number. */
export function formOf(e: Expr): Form {
  switch (e.kind) {
    case "num":
      return "number";
    case "neg":
      return formOf(e.arg) === "number" ? "number" : "difference";
    case "op":
      return e.op === "+"
        ? "sum"
        : e.op === "−"
          ? "difference"
          : e.op === "×"
            ? "product"
            : "quotient";
  }
}

const EPS = 1e-9;

/** Whether two expressions have the same value. */
export function sameValue(a: Expr, b: Expr): boolean {
  const va = evaluate(a);
  const vb = evaluate(b);
  return va !== null && vb !== null && Math.abs(va - vb) <= EPS;
}

/** Whether an entered expression is still being written: it ends on a sign that wants more, or a
 * bracket is still open. Such an entry is incomplete, not a miss (families/complete.ts). An
 * equation ending on its `=` is still being written too. */
export function unfinished(text: string): boolean {
  const src = plainSigns(text).trim();
  if (src === "") return false;
  let depth = 0;
  for (const ch of src) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
  }
  return depth > 0 || /[×÷+−(=]$/.test(src) || src.startsWith("=");
}

// ---- equations (dl-w3.70.17) --------------------------------------------------------------------

/** An equation: two expressions either side of one `=`. */
interface Equation {
  left: Expr;
  right: Expr;
}

/** Whether a text is written as an equation: it holds an `=`. */
export function isEquation(text: string): boolean {
  return plainSigns(text).includes("=");
}

/** Two expressions either side of exactly one `=`, or null. */
export function parseEquation(text: string): Equation | null {
  const sides = plainSigns(text).split("=");
  const [l, r] = sides;
  if (sides.length !== 2 || l === undefined || r === undefined) return null;
  const left = parseExpression(l);
  const right = parseExpression(r);
  return left !== null && right !== null ? { left, right } : null;
}

function chain(e: Expr, op: Op): Expr[] {
  return e.kind === "op" && e.op === op ? [...chain(e.left, op), ...chain(e.right, op)] : [e];
}

/** An expression's terms as one string, with the operands of a product or a sum sorted: `2×3` and
 * `3×2` read the same, `6×1` does not. Perseus's `sameForm` compares the sorted trees the same way
 * (packages/kas/src/compare.ts, read and cited, not copied). */
function termsOf(e: Expr): string {
  switch (e.kind) {
    case "num":
      return String(e.value);
    case "neg":
      return `−(${termsOf(e.arg)})`;
    case "op":
      if (e.op === "+" || e.op === "×")
        return `${e.op}(${chain(e, e.op).map(termsOf).sort().join(",")})`;
      return `${e.op}(${termsOf(e.left)},${termsOf(e.right)})`;
  }
}

/** Whether two expressions have the same terms, a product's or a sum's in any order. */
export function sameTerms(a: Expr, b: Expr): boolean {
  return termsOf(a) === termsOf(b);
}
