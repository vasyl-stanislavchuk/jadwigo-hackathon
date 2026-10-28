/**
 * Part: the letters a slip marked, drawn over a typed field (Enter addendum 3.6, dl-y3th 8b). Only
 * the marked letters show: the miss's fill behind the letter and its 3 px edge colour as an
 * underline at offset 6 (foundation.css `data-mark='miss'`). Every other letter is laid out the
 * same but drawn clear, so each mark sits on the field's own letter. The field itself keeps its
 * look, paper inside its edge, so the child fixes the word in place.
 *
 * It lies over the field, the same box: the caller puts it in the field's positioned wrapper and
 * passes the field's padding, size and weight as `className`. It takes no pointer and is hidden from
 * a screen reader, which hears the band's "Popraw zaznaczone miejsce." instead.
 */

import { cn } from "@jadwigo/ui";
import { letterUnits } from "./letters.ts";

export function LetterMarks({
  text,
  missed,
  className,
}: {
  text: string;
  missed: ReadonlySet<number>;
  className?: string | undefined;
}): JSX.Element | null {
  if (missed.size === 0) return null;
  // Runs of letters stay one span, so the text is shaped as the field shapes it.
  const runs: { text: string; missed: boolean }[] = [];
  letterUnits(text).forEach((u, i) => {
    const last = runs[runs.length - 1];
    const m = missed.has(i);
    if (last !== undefined && last.missed === m) last.text += u;
    else runs.push({ text: u, missed: m });
  });
  return (
    <span
      aria-hidden="true"
      data-letter-marks=""
      className={cn(
        "pointer-events-none absolute inset-0 flex items-center overflow-hidden border-2 border-transparent whitespace-pre",
        className,
      )}
    >
      {/* One inline line inside the flex box, so each mark is as tall as its letter, not as the
                sentence's tall line around a gap. */}
      <span className="leading-normal">
        {runs.map((r, i) =>
          r.missed ? (
            <span key={i} data-mark="miss">
              {r.text}
            </span>
          ) : (
            <span key={i} className="text-transparent">
              {r.text}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
