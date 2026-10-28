/**
 * Reading a clock (clock_read, dl-w3.61.5): a Gaps step with a clock figure and a hour gap `h` and a
 * minute gap `m`, typed as digits ("{h} : {m}"), or one chosen gap of phrases ("kwadrans po
 * trzeciej"). `clockReadKey` writes the typed key with the misreadings a child makes, each with
 * its class, so every clock item names the same mistakes the same way:
 * - `half_past_wrong_hour` (h): at half past, the next hour, as the Polish "wpół do ósmej" (7:30)
 *   names 8.
 * - `hands_swapped` (h and m): the minute hand read as the hour and the hour hand as the minutes.
 * - `minute_hand_as_number` (m): the number the minute hand points at, read as the minutes (6 for
 *   30), the commonest misreading of the minute hand (Burny, Valcke and Desoete 2009).
 * `clockReadProblems` checks the figure and that the key reads the clock it draws.
 *
 * A clock face says nothing of morning or evening, so 7 : 30 and 19 : 30 are both right unless
 * the instruction says which part of the day it is (`day`, Slots addendum 4.6, dl-4e0f). The two
 * typed gaps are `CLOCK_GAPS`: two digits each, the hour 0 to 23 and the minutes 0 to 59, so the
 * hour gap never takes 73 and the focus moves on by itself (addendum 2.4).
 */

import { faceNumbers, hourAtOf } from "../../parts/clock.ts";
import type { Figure } from "../figure.ts";
import { Family } from "../names.ts";
import type { Gap, GapKey, SlotsData, SlotsKey } from "./model.ts";

type Report = (path: string, rule: string, message: string) => void;
type EnterGapKey = Extract<GapKey, { kind: typeof Family.Enter }>;

const twelve = (h: number): number => (((h % 12) + 12) % 12 === 0 ? 12 : ((h % 12) + 12) % 12);

/** The hour gap and the minute gap of a clock read in digits, `{h} : {m}`. */
export const CLOCK_GAPS: Gap[] = [
  { id: "h", kind: Family.Enter, input: "number", max_length: 2, range: [0, 23] },
  { id: "m", kind: Family.Enter, input: "number", max_length: 2, range: [0, 59] },
];

/** The part of the day the instruction names, when it names one. */
export type DayPart = "morning" | "evening";

/** An hour of the clock (1 to 12) as it is written in the morning (0 to 11, with 12 for noon) and
 * in the evening (12 to 23, with 0 for midnight's 12). */
function hoursOf(h12: number, day?: DayPart): string[] {
  const evening = h12 === 12 ? "0" : String(h12 + 12);
  if (day === "morning") return [String(h12)];
  if (day === "evening") return [evening];
  return h12 === 12 ? ["12", "0"] : [String(h12), evening];
}

/** The typed key for h:m, with every misreading that differs from the right answer. Both readings
 * of the hour are right (7 and 19) unless `day` names the part of the day. */
export function clockReadKey(
  h: number,
  m: number,
  day?: DayPart,
): { h: EnterGapKey; m: EnterGapKey } {
  const hNear: Record<string, string> = {};
  const mNear: Record<string, string> = {};
  // The minute hand read as the hour, the hour hand read as minutes (to the nearest 5 either side).
  const minuteNumber = faceNumbers(m);
  const right = hoursOf(twelve(h), day);
  const near = (h12: number, cls: string) => {
    for (const read of hoursOf(h12))
      if (!right.includes(read) && hNear[read] === undefined) hNear[read] = cls;
  };
  if ("at" in minuteNumber && minuteNumber.at !== twelve(h)) near(minuteNumber.at, "hands_swapped");
  const hourMarks = hourAtOf(h, m);
  for (const read of [Math.floor(hourMarks / 5) * 5, Math.ceil(hourMarks / 5) * 5]) {
    const r = read % 60;
    if (r !== m) mNear[String(r)] = "hands_swapped";
  }
  if (m === 30) near(twelve(h + 1), "half_past_wrong_hour");
  if (m % 5 === 0 && m !== 0 && m / 5 !== m) mNear[String(m / 5)] = "minute_hand_as_number";
  if (m === 0) mNear["12"] = "minute_hand_as_number";
  return {
    h: { kind: Family.Enter, accept: right, near: hNear },
    m: { kind: Family.Enter, accept: [String(m).padStart(2, "0")], near: mNear },
  };
}

export function clockReadProblems(data: SlotsData, key: SlotsKey, err: Report): void {
  const figure: Figure | undefined = data.figure ?? data.stem?.figure;
  if (figure?.kind !== "clock") return;
  if (!Number.isInteger(figure.h) || figure.h < 1 || figure.h > 12)
    err("data.figure.h", "clock_hour", "The clock shows an hour from 1 to 12.");
  if (!Number.isInteger(figure.m) || figure.m < 0 || figure.m > 59)
    err("data.figure.m", "clock_minute", "The clock shows a minute from 0 to 59.");
  const mm = String(figure.m).padStart(2, "0");
  if (new RegExp(`(^|\\D)${figure.h}\\s*[:.]\\s*${mm}(\\D|$)`).test(figure.alt))
    err("data.figure.alt", "key_in_alt", "The clock’s alt text gives the time away.");
  // A typed reading: the hour gap and the minute gap read the clock the figure draws.
  const h = key.gaps["h"];
  const m = key.gaps["m"];
  if (
    h?.kind === Family.Enter &&
    !h.accept.some((a) => twelve(Number.parseInt(a, 10)) === figure.h)
  )
    err(
      "key.gaps.h",
      "clock_mismatch",
      `The clock shows ${figure.h} o’clock, but the hour gap does not accept ${figure.h}.`,
    );
  if (m?.kind === Family.Enter && !m.accept.some((a) => Number.parseInt(a, 10) === figure.m))
    err(
      "key.gaps.m",
      "clock_mismatch",
      `The clock shows ${figure.m} minutes, but the minute gap does not accept ${figure.m}.`,
    );
}
