/**
 * The Slots step when nothing can be typed (split out of SlotsView.tsx, dl-uukj.29.120): the review
 * and print views (`SlotsStill`), and the step that ended without a right answer (`SlotsGivenUp`).
 *
 * Every gap here is drawn in the box it has in play: a typed gap the field (`fieldOf`), a chosen
 * gap the menu's (`ChosenStill`). In a cell that fixes its gap (a table cell, a square of a written
 * sum, a pyramid brick, a gap inside a word, gapFit.ts) the box reads the cell's size, so a gap
 * stands where it stood in play, at the size it had there.
 */

import { copy } from "@jadwigo/copy";
import { cn } from "@jadwigo/ui";
import { FractionBoxes } from "../../parts/FractionBoxes.tsx";
import { TONE_CLASS, type Tone } from "../../parts/tone.ts";
import type { Language } from "../../stage/types.ts";
import { Family } from "../names.ts";
import { Stem } from "../Stem.tsx";
import { ChosenStill, WholeWord } from "./GapMenu.tsx";
import {
  BOX,
  boxLabels,
  fieldOf,
  gapName,
  isFraction,
  keyLabel,
  labelOf,
  onKeypad,
  sameTyped,
  wholeOf,
} from "./gaps.ts";
import type { Gap, SlotsData, SlotsValue } from "./model.ts";
import { WORD_MARGIN } from "./SlotGap.tsx";
import { SlotsBody } from "./SlotsBody.tsx";

/** The look of a typed gap that takes no key: its mark, else paper, else empty and dashed. */
function stillLook(tone: Tone, empty: boolean): string {
  if (tone !== "idle") return TONE_CLASS[tone];
  return empty ? "border-dashed border-border bg-card" : "border-border bg-card";
}

/** One gap in its play box, holding `value` in `tone`. */
function StillGap({
  gap,
  value,
  tone,
  label,
  language,
}: {
  gap: Gap;
  value: string;
  tone: Tone;
  label: string;
  language: Language;
}): JSX.Element {
  if (gap.kind === Family.Choose)
    return (
      // In the same wrapper as the menu in play (SlotGap.tsx ChosenSlot), so it sits where the menu sat.
      <span className="inline-flex rounded-lg">
        <ChosenStill gap={gap} value={value} tone={tone} label={label} data-gap={gap.id} />
      </span>
    );
  const box = fieldOf(gap);
  const empty = value.trim() === "";
  return (
    <span
      role="group"
      data-gap={gap.id}
      data-tone={tone}
      aria-label={label}
      className={cn(box.className, gap.input === "text" && WORD_MARGIN, stillLook(tone, empty))}
      style={box.style}
    >
      {empty ? " " : tone === "green" ? keyLabel(gap, value, language) : labelOf(gap, value)}
    </span>
  );
}

/**
 * A step that ended without a right answer (lesson frame rule 12, README §3; Slots addendum 6, as
 * Enter 2.8): the child's gaps exactly as they left them, at the same size and in the same place,
 * a missed one still marked dashed red, an empty one dashed. Nothing repeats the body: the
 * solution card under it (SolutionCard.tsx, StepShell.tsx) holds the worked lines, which end on
 * every gap's answer. `data-solution-line` is the step's body, which "Jeszcze nie wiem" scrolls
 * to when the step has no card (paper-behaviour README §3.6).
 */
function SlotsGivenUp({
  data,
  language,
  shown,
  right,
}: {
  data: SlotsData;
  language: Language;
  shown: SlotsValue | null;
  right: SlotsValue;
}): JSX.Element {
  return (
    <div
      data-solution-line
      data-keypad-gaps={data.gaps.some(onKeypad) ? "" : undefined}
      className="kid-family-gaps flex flex-col gap-6"
    >
      <SlotsBody
        data={data}
        language={language}
        filled={(id) => (shown?.gaps[id] ?? "").trim() !== ""}
        draw={(gap, n) => {
          const mine = shown?.gaps[gap.id] ?? "";
          const good = right.gaps[gap.id] ?? null;
          const empty = mine.trim() === "";
          const notYet =
            !empty &&
            good !== null &&
            !(gap.kind === Family.Choose ? mine === good : sameTyped(gap, mine, good));
          const label = gapName(data, language, gap, n);
          if (isFraction(gap))
            return (
              <FractionBoxes
                text={mine}
                whole={wholeOf(gap, mine)}
                tone={notYet ? "amber" : "idle"}
                label={label}
                labels={boxLabels(language)}
              />
            );
          return (
            <StillGap
              gap={gap}
              value={mine}
              tone={notYet ? "amber" : "idle"}
              label={label}
              language={language}
            />
          );
        }}
      />
    </div>
  );
}

/**
 * The body filled in and printed (Slots addendum 6), for the solution card's last line: every gap's
 * answer in ink, bold, no field box, in its place in the body.
 */
export function SlotsPrinted({
  data,
  language,
  right,
}: {
  data: SlotsData;
  language: Language;
  right: SlotsValue;
}): JSX.Element {
  return (
    <div data-printed-body className="kid-family-gaps">
      <SlotsBody
        data={data}
        language={language}
        filled={() => true}
        draw={(gap) => (
          <span data-printed={gap.id} className="font-bold">
            {keyLabel(gap, right.gaps[gap.id] ?? "", language)}
          </span>
        )}
      />
    </div>
  );
}

/**
 * Whether the worked solution ends on the body filled in, as Khan's table does ("Tak wygląda
 * uzupełniona tabela:", then the table as markdown): then the card shows that line's words and the
 * body printed under them (`SlotsPrinted`), not the markdown. Returns the lines with the last one cut
 * to its words, or null when the last line is a plain line.
 */
export function endsOnBody<L extends { text: string }>(
  data: SlotsData,
  lines: readonly L[],
): L[] | null {
  const last = lines[lines.length - 1];
  if (data.table === undefined || last === undefined) return null;
  const rows = last.text.split("\n");
  const at = rows.findIndex((row) => row.includes("|"));
  if (at < 0) return null;
  const words = rows.slice(0, at).join("\n").trim();
  return [...lines.slice(0, -1), { ...last, text: words }];
}

export function SlotsStill({
  data,
  say,
  language,
  shown,
  right,
  paper,
  bare = false,
}: {
  data: SlotsData;
  say: string;
  language: Language;
  shown: SlotsValue | null;
  right: SlotsValue | null;
  paper: boolean;
  bare?: boolean | undefined;
}): JSX.Element {
  if (bare && right !== null)
    return <SlotsGivenUp data={data} language={language} shown={shown} right={right} />;
  return (
    <div className="kid-family-gaps flex flex-col gap-6">
      {!bare && (
        <Stem say={say} stem={data.stem} figure={data.figure} language={language} paper={paper} />
      )}
      <SlotsBody
        data={data}
        language={language}
        filled={(id) => (shown?.gaps[id] ?? right?.gaps[id] ?? "").trim() !== ""}
        draw={(gap, n) => {
          const mine = shown?.gaps[gap.id] ?? null;
          const good = right?.gaps[gap.id] ?? null;
          const same =
            mine !== null &&
            good !== null &&
            (gap.kind === Family.Choose ? mine === good : sameTyped(gap, mine, good));
          const label = gapName(data, language, gap, n);
          if (isFraction(gap)) {
            // A fraction gap (dl-w3.70.16): the child's boxes, then the right ones under them.
            return (
              <span className="inline-flex flex-col items-center gap-1 align-middle">
                {(good === null || (mine !== null && !same)) && (
                  <FractionBoxes
                    text={mine ?? ""}
                    whole={wholeOf(gap, mine ?? "")}
                    tone={good === null ? "idle" : "amber"}
                    label={good === null ? label : copy(language, "answer_yours")}
                    labels={boxLabels(language)}
                  />
                )}
                {good !== null && (
                  <FractionBoxes
                    text={good}
                    whole={wholeOf(gap, good)}
                    tone="green"
                    label={copy(language, "answer_right")}
                    labels={boxLabels(language)}
                  />
                )}
              </span>
            );
          }
          // No key to show: the child's answer, or the empty gap, in its play box.
          if (good === null)
            return (
              <StillGap
                gap={gap}
                value={mine ?? ""}
                tone="idle"
                label={label}
                language={language}
              />
            );
          // The right answer in the gap's play box, green; a different answer of the
          // child's still shows small above it, amber.
          return (
            <span className="inline-flex flex-col items-center gap-1 align-middle">
              {mine !== null && !same && (
                <span
                  role="group"
                  data-tone="amber"
                  className={cn(BOX, "text-base", TONE_CLASS.amber)}
                  aria-label={copy(language, "answer_yours")}
                >
                  {labelOf(gap, mine) || " "}
                </span>
              )}
              {gap.kind === Family.Choose ? (
                <WholeWord gap={gap} value={good} />
              ) : (
                <StillGap
                  gap={gap}
                  value={good}
                  tone="green"
                  label={copy(language, "answer_right")}
                  language={language}
                />
              )}
            </span>
          );
        }}
      />
    </div>
  );
}
