/**
 * Part: a number line's geometry (dl-w3.37.10), shared by the family views that draw a line (Place
 * on a line, Enter reading one). Moved from blocks/number_line/logic.ts. Pure: no React, no clock.
 *
 * Since dl-w3.55 the line takes fractions: `min`, `max` and `step` may be non-whole, `snap` is the
 * finest position the marker takes (the step when absent), and a tick is written as a decimal, a
 * fraction or a mixed number by `tickLabel`. Positions are counted in whole multiples of the snap
 * from `min`, so 0.1 + 0.1 + 0.1 never drifts to 0.30000000000000004. The options are Perseus's
 * number-line widget's (`range`, `tickStep`, `snapDivisions`, `labelStyle`, `labelRange`,
 * https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets/number-line), read and
 * named here, never copied.
 */

/** `non-reduced` (dl-w3.70.2) writes every labelled tick, whole ones too, over the line's common
 * denominator: 0/4, 2/4, 4/4 on a line of quarters (Perseus's `non-reduced` labelStyle). */
export type TickLabelStyle = "decimal" | "fraction" | "mixed" | "non-reduced";

export interface LineData {
  min: number;
  max: number;
  step: number;
  /** The finest position the marker takes; the step when absent. Divides the step. */
  snap?: number | undefined;
  /** How a non-whole tick is written; `decimal` when absent. */
  tick_label?: TickLabelStyle | undefined;
}

/** The SVG's own units; the line runs from PAD to WIDTH - PAD. */
export const WIDTH = 1000;
export const PAD = 48;

/** A value with the binary noise of a sum of fractions rounded away. */
export const tidy = (v: number): number => Number(v.toFixed(10));

/** The finest unit the marker moves in: the snap, else the step. */
export const unitOf = (line: LineData): number => line.snap ?? line.step;

/** How many whole units of `size` fit in `span`, when it divides it; else null. */
export function wholeCount(span: number, size: number): number | null {
  if (!(size > 0)) return null;
  const n = span / size;
  const whole = Math.round(n);
  return Math.abs(n - whole) < 1e-6 ? whole : null;
}

/** Every tick from min, one step apart, never past max. */
export function ticks({ min, max, step }: LineData): number[] {
  const out: number[] = [];
  for (let i = 0; ; i++) {
    const v = tidy(min + i * step);
    if (v > max + 1e-9) break;
    out.push(v);
  }
  return out;
}

/**
 * The most tick intervals a finger can tell apart: at the 800px play column the line spans about
 * 720px, so 30 intervals keep drawn ticks at least 24px apart (WCAG 2.2 SC 2.5.8's minimum).
 * Our own bound for tablets, not a cited one; whether lint caps the line is dl-w3.6's decision.
 */
const FINGER_INTERVALS = 30;

/** A line whose ticks sit closer than a finger can choose between. */
function isDense(line: LineData): boolean {
  return Math.round((lastTick(line) - line.min) / line.step) > FINGER_INTERVALS;
}

/** The ticks to draw: every tick on a sparse line; every k-th tick plus each labelled value on a dense one. */
export function drawnTicks(line: LineData, labelled: readonly number[]): number[] {
  const all = ticks(line);
  if (!isDense(line)) return all;
  const every = Math.ceil((all.length - 1) / FINGER_INTERVALS);
  return all.filter((v, i) => i % every === 0 || labelled.includes(v));
}

/** The last tick: max itself when the step divides the line, else the tick just below it. */
export function lastTick(line: LineData): number {
  return tidy(line.min + Math.floor((line.max - line.min) / line.step + 1e-9) * line.step);
}

/** The last position the marker takes: the last whole snap unit on the line. */
export function lastSnap(line: LineData): number {
  const unit = unitOf(line);
  return tidy(line.min + Math.floor((line.max - line.min) / unit + 1e-9) * unit);
}

/** Where a value sits on the SVG's x axis. */
export function xOf(value: number, { min, max }: LineData): number {
  return PAD + ((value - min) / (max - min)) * (WIDTH - 2 * PAD);
}

/** The snap position nearest a point on the line, as a fraction 0..1 of the SVG's width. */
export function snapAt(fraction: number, line: LineData): number {
  const x = fraction * WIDTH;
  const raw = line.min + ((x - PAD) / (WIDTH - 2 * PAD)) * (line.max - line.min);
  const unit = unitOf(line);
  const snapped = tidy(line.min + Math.round((raw - line.min) / unit) * unit);
  return Math.min(lastSnap(line), Math.max(line.min, snapped));
}

/** One arrow press: one snap unit along the line (a step when the line has no finer snap), clamped to it. */
export function nudge(value: number | null, by: -1 | 1, line: LineData): number {
  if (value === null) return line.min;
  const unit = unitOf(line);
  const i = Math.round((value - line.min) / unit) + by;
  return Math.min(lastSnap(line), Math.max(line.min, tidy(line.min + i * unit)));
}

/** The simplest p/q within a hair of a value, with q up to 64; null for a whole number or no fit. */
export function asFraction(value: number): { p: number; q: number } | null {
  const sign = value < 0 ? -1 : 1;
  const v = Math.abs(value);
  if (Math.abs(v - Math.round(v)) < 1e-9) return null;
  for (let q = 2; q <= 64; q++) {
    const p = Math.round(v * q);
    if (Math.abs(v - p / q) < 1e-9) return { p: sign * p, q };
  }
  return null;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * The denominator a `non-reduced` line writes every label over: the least common multiple of the
 * denominators of its ticks and its labelled values, as Perseus's number-line TickMarks computes
 * its `base`. 1 on a line of whole numbers; null when a tick fits no small fraction.
 */
export function commonDenominator(line: LineData, labelled: readonly number[] = []): number | null {
  let base = 1;
  for (const v of [...ticks(line), ...labelled]) {
    const t = tidy(v);
    if (Math.abs(t - Math.round(t)) < 1e-9) continue;
    const f = asFraction(t);
    if (f === null) return null;
    base = (base / gcd(base, f.q)) * f.q;
  }
  return base;
}

/**
 * A tick's label as text: a whole number or a decimal as digits, else TeX for the style: `fraction`
 * writes `\frac{3}{2}`, `mixed` writes `1\frac{1}{2}` (Perseus's `improper` and `mixed`
 * labelStyle). `non-reduced` writes the value over `base`, the line's common denominator
 * (`commonDenominator`), so 1 on a line of quarters is `\frac{4}{4}`; a line of whole numbers
 * (base 1) stays digits. A value no small fraction fits is written as a decimal whatever the style.
 */
export function tickLabel(
  value: number,
  style: TickLabelStyle = "decimal",
  base: number | null = null,
): string {
  const v = tidy(value);
  if (style === "non-reduced") {
    if (base === null || base === 1) return String(v);
    const p = Math.round(v * base);
    return Math.abs(v * base - p) < 1e-6
      ? `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${base}}`
      : String(v);
  }
  const f = style === "decimal" ? null : asFraction(v);
  if (f === null) return String(v);
  const sign = f.p < 0 ? "-" : "";
  const p = Math.abs(f.p);
  if (style === "mixed" && p > f.q) {
    const whole = Math.floor(p / f.q);
    return `${sign}${whole}\\frac{${p - whole * f.q}}{${f.q}}`;
  }
  return `${sign}\\frac{${p}}{${f.q}}`;
}

/** Whether a label from `tickLabel` is TeX (to draw through RichText) rather than digits. */
export const isTexLabel = (label: string): boolean => label.includes("\\");

/** A tick's label as a rich-text source: TeX between dollars, digits as they are. */
export function tickLabelText(
  value: number,
  style: TickLabelStyle = "decimal",
  base: number | null = null,
): string {
  const label = tickLabel(value, style, base);
  return isTexLabel(label) ? `$${label}$` : label;
}
