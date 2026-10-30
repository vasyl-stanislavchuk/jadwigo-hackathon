/**
 * The figure above an answer (families/figure.ts), one view for every family: an expression as a
 * big line (TeX drawn in display mode), a number line with its read marker, dots in rows, or
 * groups of objects. Everything here is the question's, drawn in ink (--text): the read marker,
 * shaded parts and the ruler's zero never take the child's --focus blue (Enter addendum 10b). Lifted out of EnterView (dl-w3.47) so Gaps and Choose draw the same figure,
 * and the playground's review tab can switch a times-table item between its CRA levels.
 */

import { copy } from "@jadwigo/copy";
import { ClockFace } from "../parts/ClockFace.tsx";
import { CoinRow } from "../parts/Coins.tsx";
import { hourAtOf } from "../parts/clock.ts";
import { DotArray } from "../parts/DotArray.tsx";
import { FractionShape } from "../parts/FractionShape.tsx";
import { Groups } from "../parts/Groups.tsx";
import { NumberLineSvg } from "../parts/NumberLineSvg.tsx";
import { RichText } from "../parts/RichText.tsx";
import { MeasuredPicture, type RulerControl } from "../parts/Ruler.tsx";
import { isPlainText } from "../parts/richTextParse.ts";
import { DEFAULT_TICKS, type RulerGeometry } from "../parts/rulerGeometry.ts";
import { TASK_TARGET, TaskTarget } from "../parts/TaskTarget.tsx";
import type { Language } from "../stage/types.ts";
import type { Figure } from "./figure.ts";
import { isDenom, tokenOf } from "./money.ts";

/** A figure that is a single TeX formula and nothing else, drawn in display mode. */
const ONE_FORMULA = /^\s*\$[^$]+\$\s*$/;

/** A ruler figure's geometry for the Ruler part (components/parts/rulerGeometry.ts). */
function rulerGeometry(figure: Extract<Figure, { kind: "ruler" }>): RulerGeometry {
  return {
    length: figure.length,
    pixelsPerUnit: figure.pixels_per_unit,
    ticks: figure.ticks ?? DEFAULT_TICKS[figure.unit],
    width: figure.picture.width,
  };
}

/** `ruler`: the Enter play view passes the ruler's position and moves; a still view draws it at `start`. */
export function FigureView({
  figure,
  language,
  ruler,
}: {
  figure: Figure;
  language: Language;
  ruler?: RulerControl | undefined;
}): JSX.Element | null {
  switch (figure.kind) {
    case "expression":
      // An expression in words stays a line; one with TeX or bold is drawn. Its maths is in
      // display mode only when the figure is one formula: a run of maths and words, such as
      // Khan's "$116$, $117$, $118$, $119$,", stays one line, or each number would stand on a
      // line of its own with its comma under it.
      return (
        <div data-figure="expression">
          {isPlainText(figure.text) ? (
            <TaskTarget>{figure.text}</TaskTarget>
          ) : (
            <RichText
              display={ONE_FORMULA.test(figure.text)}
              text={figure.text}
              className={TASK_TARGET}
            />
          )}
        </div>
      );
    case "number_line":
      return (
        // The line at most 600 wide, centred in the card (Enter addendum 3.5).
        <div data-figure="number_line" className="mx-auto w-full max-w-[37.5rem]">
          <NumberLineSvg
            data={figure}
            marker={figure.marker}
            tone="idle"
            markerState="read"
            arcs={false}
            label={copy(language, "number_line_axis", { min: figure.min, max: figure.max })}
          />
        </div>
      );
    case "dots":
      return (
        <div data-figure="dots">
          <DotArray rows={figure.rows} cols={figure.cols} label={figure.alt} />
        </div>
      );
    case "groups":
      return (
        <div data-figure="groups">
          <Groups groups={figure.groups} each={figure.each} icon={figure.icon} label={figure.alt} />
        </div>
      );
    case "ruler":
      return (
        <div data-figure="ruler">
          <MeasuredPicture
            picture={figure.picture}
            geometry={rulerGeometry(figure)}
            unit={figure.unit}
            zero={ruler?.zero ?? figure.start ?? 0}
            control={ruler}
          />
        </div>
      );
    // lane D (dl-w3.61.5): the clock face, its alt saying it is a clock, never the time.
    case "clock":
      return (
        <div data-figure="clock" className="flex justify-center">
          <ClockFace
            hands={{ hourAt: hourAtOf(figure.h, figure.m), minute: figure.m }}
            numbers={figure.numbers}
            label={figure.alt}
          />
        </div>
      );
    // lane E (dl-w3.61.6): the coins of a purse, drawn as tokens.
    case "coins":
      return (
        <div data-figure="coins">
          <CoinRow tokens={figure.items.filter(isDenom).map(tokenOf)} label={figure.alt} />
        </div>
      );
    // lane F (dl-w3.61.7): fractions to compare, bars one under the other at one width (so
    // their lengths line up) or circles side by side, each with its fraction beside it unless
    // the fraction is the answer (`labels: 'none'`, dl-uukj.29.108).
    case "fraction_bars":
      return (
        <div
          data-figure="fraction_bars"
          role="img"
          aria-label={figure.alt}
          className={
            figure.shape === "bar" ? "flex w-full max-w-xl flex-col gap-3" : "flex flex-wrap gap-6"
          }
        >
          {figure.items.map((f, i) => (
            <div key={i} aria-hidden="true" className="flex items-center gap-3">
              {figure.labels !== "none" && (
                <RichText
                  inline
                  text={`$\\frac{${f.n}}{${f.d}}$`}
                  className="min-w-kid-tap text-2xl font-bold"
                />
              )}
              <FractionShape
                shape={figure.shape}
                parts={f.d}
                shaded={new Set(Array.from({ length: f.n }, (_, k) => k))}
                label=""
                ink="question"
                className={figure.shape === "circle" ? "max-w-40" : "min-w-0 flex-1"}
              />
            </div>
          ))}
        </div>
      );
  }
}
