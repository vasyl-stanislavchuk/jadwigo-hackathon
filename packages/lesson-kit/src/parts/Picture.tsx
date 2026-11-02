/**
 * Part: a picture with its size known up front and, when it is a drawing, text labels placed over
 * it at drawing coordinates (Khan's Graphie drawings: an SVG and a labels file, docs/research/
 * khan-academy-question-types.md §4). The box is reserved from width and height, so a page never
 * jumps when the image arrives; the labels sit at percent positions computed from the drawing's
 * range, so they stay in place at any scale.
 *
 * Its width also keeps it within --picture-max-h when a picture sheet's frame sets one (PictureSheet.tsx,
 * rule 16), so the labels stay on the drawing at any height.
 *
 * Labels that share a row, like a graph's category names, wrap centred within the gap to their
 * nearest neighbour, so a long name never runs into the next column (dl-uukj.48, labelWidths.ts).
 * They are a size smaller (text-xs), so a word like "Pasture" fits its column whole (dl-uukj.50).
 *
 * A graph's y-axis title (isAxisTitle) reads bottom to top, as in Khan's graphs, and stays inside
 * the box: its centre is at least half a line from the left edge (dl-uukj.50).
 *
 * Plain props only: this part knows nothing of a family or of Khan. A label is TeX unless `math`
 * is false, and RichText draws it inline, so a coloured number over a drawing reads as it does in
 * the text.
 */

import { isAxisTitle, labelWidths, textOnly } from "./labelWidths.ts";
import { RichText } from "./RichText.tsx";

interface PictureLabelProps {
  content: string;
  coordinates: [number, number];
  alignment: string;
  math?: false | undefined;
}

export interface PictureProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  labels?: { range: [[number, number], [number, number]]; items: PictureLabelProps[] } | undefined;
}

/** The CSS translate that puts the text where the alignment says, relative to its point. */
function shift(alignment: string): string {
  const words = alignment.split(/\s+/);
  const x = words.includes("left") ? "-100%" : words.includes("right") ? "0%" : "-50%";
  const y = words.includes("above") ? "-100%" : words.includes("below") ? "0%" : "-50%";
  return `translate(${x}, ${y})`;
}

export function Picture({ src, alt, width, height, labels }: PictureProps): JSX.Element {
  const [[x0, x1], [y0, y1]] = labels?.range ?? [
    [0, 1],
    [0, 1],
  ];
  const widths = labels ? labelWidths(labels.items, labels.range) : [];
  return (
    <span
      className="relative inline-block align-top"
      style={{
        width,
        maxWidth: `min(100%, calc(var(--picture-max-h, ${height}px) * ${width / height}))`,
      }}
    >
      <img src={src} alt={alt} width={width} height={height} className="block h-auto max-w-full" />
      {labels?.items.map((l, i) => {
        const left = (100 * (l.coordinates[0] - x0)) / (x1 - x0);
        const top = 100 - (100 * (l.coordinates[1] - y0)) / (y1 - y0);
        const wrap = widths[i] ?? null;
        // A wrapping label that is only \text{…} is drawn as plain words: KaTeX keeps it on one line.
        const vertical = labels ? isAxisTitle(l, labels.range) : false;
        const plain = l.math === false ? l.content : wrap === null ? null : textOnly(l.content);
        return (
          <span
            key={i}
            aria-hidden
            className={
              wrap === null
                ? "absolute whitespace-nowrap text-sm leading-none text-foreground"
                : "absolute hyphens-auto break-words whitespace-normal text-center text-xs leading-tight text-foreground"
            }
            style={{
              // Turned, the title is 1 line (1em, leading-none) wide: half of it must fit left of its centre.
              left: vertical ? `max(${left}%, 0.6em)` : `${left}%`,
              top: `${top}%`,
              transform: vertical ? `${shift(l.alignment)} rotate(-90deg)` : shift(l.alignment),
              // max-content, so the width is the label's own and not what is left to the right edge.
              ...(wrap === null ? {} : { width: "max-content", maxWidth: `${wrap}%` }),
            }}
          >
            {plain ?? <RichText inline text={`$${l.content}$`} />}
          </span>
        );
      })}
    </span>
  );
}
