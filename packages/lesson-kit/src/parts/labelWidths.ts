/**
 * How wide each label over a drawing may be (dl-uukj.48). Labels that share a row (the same y and
 * the same alignment, like a graph's category names under its x-axis) each get a max-width
 * of the distance to their nearest neighbour on that row, in percent of the drawing's width, so a
 * long name wraps under its own column instead of running into the next one. A label alone on its
 * row gets null and keeps one line. The whole alignment counts: a y-axis tick ("left") and the
 * axis title ("center") at the same height are not a row, so the title is not squeezed (dl-uukj.54).
 */

export interface LabelSpot {
  coordinates: readonly [number, number];
  alignment: string;
}

const alignmentKey = (alignment: string): string =>
  alignment.trim().split(/\s+/).sort().join(" ") || "center";

export function labelWidths(
  items: readonly LabelSpot[],
  range: readonly [readonly [number, number], readonly [number, number]],
): (number | null)[] {
  const [x0, x1] = range[0];
  const xs = items.map((l) => (100 * (l.coordinates[0] - x0)) / (x1 - x0));
  const row = (l: LabelSpot): string =>
    `${l.coordinates[1].toFixed(6)} ${alignmentKey(l.alignment)}`;
  return items.map((l, i) => {
    const x = xs[i] ?? 0;
    const gaps = items.flatMap((m, j) => {
      const gap = Math.abs((xs[j] ?? 0) - x);
      return j !== i && row(m) === row(l) && gap > 0 ? [gap] : [];
    });
    return gaps.length > 0 ? Math.min(...gaps) : null;
  });
}

/**
 * The words of a TeX label that is only `\text{…}`, such as a graph's "\text{Fancy Farm}", or null.
 * Khan's graphs write a category as `\text{Fancy Farm}\hphantom{Fancy Farm}`, the phantom an empty
 * copy that only pushes the words left of their column; it is dropped, so the words sit centred.
 * KaTeX sets such text with non-breaking spaces on one line, so a label that must wrap is drawn as
 * these plain words instead (dl-uukj.48).
 */
export function textOnly(tex: string): string | null {
  return tex.trim().match(/^\\text\s*\{([^{}\\$]*)\}(?:\\hphantom\{[^{}]*\})?$/)?.[1] ?? null;
}

/**
 * Whether a label is a graph's y-axis title: centred on a point left of the drawing's x = 0, in the
 * margin beside the y-axis, such as "Ponies" or "Number of kids" on Khan's picture and bar graphs.
 * Khan sets that title vertically; drawn level at the left edge it runs off the picture ("cyki"),
 * so Picture.tsx turns it a quarter left and keeps it inside the box (dl-uukj.50).
 */
export function isAxisTitle(
  item: LabelSpot,
  range: readonly [readonly [number, number], readonly [number, number]],
): boolean {
  const [x0, x1] = range[0];
  return item.alignment.trim() === "center" && x0 < 0 && x1 > 0 && item.coordinates[0] < 0;
}

/**
 * A label's lines: Khan's graphs break a long category with an HTML `<br>` ("Break<br>dance",
 * "Twist and<br>shout"), which would otherwise print as text. Picture.tsx draws a line break between
 * the parts, in plain words and in TeX alike (dl-uukj.51).
 */
export const labelLines = (content: string): string[] =>
  content.split(/<br\s*\/?>/i).map((line) => line.trim());
