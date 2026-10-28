/**
 * Part: a ruler's geometry (dl-w3.51.4), shared by the Ruler SVG and the Enter view that slides
 * it. Pure: no React, no clock. Everything is in the picture's own pixels, the SVG's user units,
 * so the ruler keeps its scale when the picture is drawn smaller on a phone.
 *
 * The options are Perseus's measurer widget's (`rulerLength`, `rulerPixels`, `rulerTicks`,
 * `rulerLabel`, https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets/measurer),
 * read and named here, never copied. Perseus's ruler is dragged and turned freely; ours slides
 * along one axis, because the pictures a grade 2 child measures lie flat, and a tap or an arrow
 * key must be enough to place it (voice is additive, every step plays by tapping).
 */

export interface RulerGeometry {
  /** How many units the ruler shows. */
  length: number;
  /** Picture pixels per unit. */
  pixelsPerUnit: number;
  /** Marks per unit: 10 for a centimetre ruler with millimetres, 1 for a millimetre one. */
  ticks: number;
  /** The picture's width in its own pixels: the ruler's zero stays inside it. */
  width: number;
}

/** The marks per unit a ruler draws when the figure names none. */
export const DEFAULT_TICKS: Record<"cm" | "mm", number> = { cm: 10, mm: 1 };

/** One tick, in picture pixels. */
export const tickPx = (g: RulerGeometry): number => g.pixelsPerUnit / g.ticks;

/** How many units apart the numbers stand: every unit on a ruler with marks between them, every
 * ten on a ruler whose unit is its finest mark (a millimetre ruler numbers every centimetre). */
export const labelEvery = (g: RulerGeometry): number => (g.ticks >= 5 ? 1 : 10);

/** The distance between two numbers, in picture pixels: what the ruler's height and type scale to. */
export const numberPx = (g: RulerGeometry): number => g.pixelsPerUnit * labelEvery(g);

/** The furthest the zero end may sit: one numbered step short of the right edge, so a number shows. */
export const lastZero = (g: RulerGeometry): number => Math.max(0, g.width - numberPx(g));

/** A zero position clamped to the picture and snapped to the nearest tick. */
export function snapZero(x: number, g: RulerGeometry): number {
  const unit = tickPx(g);
  const snapped = Math.round(x / unit) * unit;
  return Math.min(lastZero(g), Math.max(0, Number(snapped.toFixed(6))));
}

/** One arrow press: one tick along the picture; with `big`, one numbered step. */
export function nudgeZero(zero: number, by: -1 | 1, g: RulerGeometry, big = false): number {
  return snapZero(zero + by * (big ? numberPx(g) : tickPx(g)), g);
}

/** The grip before the zero (Enter addendum 3.8, 9b): 2 × 3 dots, r 2.2, 7 apart, in picture
 * pixels at 40 a numbered step and scaled with it. Each dot from the zero, and from the body's top. */
export function gripDots(g: RulerGeometry, height: number): { dx: number; y: number; r: number }[] {
  const k = numberPx(g) / 40;
  return [0, 1].flatMap((c) =>
    [-1, 0, 1].map((row) => ({ dx: (-20 + c * 7) * k, y: height / 2 + row * 7 * k, r: 2.2 * k })),
  );
}

/** The ruler's body in picture pixels: room for the grip before the zero, and for the unit's name
 * after the last mark. */
export function rulerBox(
  zero: number,
  g: RulerGeometry,
): { x: number; width: number; height: number } {
  const pad = numberPx(g) * 0.7;
  return {
    x: zero - pad,
    width: g.length * g.pixelsPerUnit + pad + numberPx(g) * 0.9,
    height: numberPx(g) * 1.1,
  };
}

export interface RulerMark {
  x: number;
  /** A numbered mark, the half-way mark between two numbers, or a plain tick. */
  kind: "number" | "half" | "tick";
  /** The value in units at this mark. */
  n: number;
}

/** Every mark from zero to the end of the ruler. */
export function rulerMarks(zero: number, g: RulerGeometry): RulerMark[] {
  const out: RulerMark[] = [];
  const total = g.length * g.ticks;
  const period = g.ticks * labelEvery(g);
  for (let i = 0; i <= total; i++) {
    const number = i % period === 0;
    const half = !number && period % 2 === 0 && i % (period / 2) === 0;
    out.push({
      x: zero + i * tickPx(g),
      kind: number ? "number" : half ? "half" : "tick",
      n: i / g.ticks,
    });
  }
  return out;
}

/** Where a pointer sits in picture pixels, from the SVG's box on screen. */
export function pictureX(
  clientX: number,
  rect: { left: number; width: number },
  width: number,
): number {
  return rect.width > 0 ? ((clientX - rect.left) / rect.width) * width : 0;
}
