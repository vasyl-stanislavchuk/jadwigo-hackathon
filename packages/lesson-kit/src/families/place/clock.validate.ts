/**
 * The clock surface's checks (clock_set, dl-w3.61.5), called from validate.ts's Place case. The
 * hour is 1 to 12, as the face shows it. The minute is one the minute hand can take: a whole
 * multiple of `minute_step`, which is 5, 15 or 30. A starting position must be one the hands can
 * take, and a clock that starts on the answer asks nothing.
 */

import { hourAtOf, markDistance } from "../../parts/clock.ts";
import { HOUR_TOLERANCE } from "../answer.ts";
import type { Surface } from "../names.ts";
import type { PlaceData, PlaceKey } from "./model.ts";

type Report = (path: string, rule: string, message: string) => void;
type ClockData = Extract<PlaceData, { surface: typeof Surface.Clock }>;
type ClockKey = Extract<PlaceKey, { surface: typeof Surface.Clock }>;

const MINUTE_STEPS = [5, 15, 30] as const;

export function clockProblems(data: ClockData, key: ClockKey, err: Report, warn: Report): void {
  if (data.target_label.trim() === "")
    err("data.target_label", "empty_label", "Say which time to set.");
  if (!(MINUTE_STEPS as readonly number[]).includes(data.minute_step))
    err("data.minute_step", "bad_step", "The minute hand moves in steps of 5, 15 or 30 minutes.");
  if (!Number.isInteger(key.h) || key.h < 1 || key.h > 12)
    err("key.h", "clock_hour", "The hour is a whole number from 1 to 12, as the face shows it.");
  if (!Number.isInteger(key.m) || key.m < 0 || key.m > 59)
    err("key.m", "clock_minute", "The minute is a whole number from 0 to 59.");
  else if (key.m % data.minute_step !== 0)
    err(
      "key.m",
      "key_off_snap",
      `The minute hand moves in steps of ${data.minute_step}, so it cannot show ${key.m}.`,
    );
  const s = data.starting;
  if (s !== undefined) {
    if (!Number.isInteger(s.m) || s.m < 0 || s.m > 59 || s.m % data.minute_step !== 0)
      err(
        "data.starting.m",
        "starting_off_snap",
        "The starting minute is not one the minute hand can take.",
      );
    if (!(s.hour_at >= 0 && s.hour_at < 60))
      err(
        "data.starting.hour_at",
        "starting_off_snap",
        "The starting hour hand is a mark from 0 to 59.",
      );
    else if (
      data.hands === "geared" &&
      Math.abs(s.hour_at - hourAtOf(Math.floor(s.hour_at / 5), s.m)) > 1e-6
    )
      err(
        "data.starting.hour_at",
        "starting_off_snap",
        "Geared hands: the starting hour hand must sit where its minutes put it.",
      );
    if (s.m === key.m && markDistance(s.hour_at, hourAtOf(key.h, key.m)) < HOUR_TOLERANCE)
      warn(
        "data.starting",
        "starts_solved",
        "The clock starts on the answer, so nothing is asked.",
      );
  }
}
