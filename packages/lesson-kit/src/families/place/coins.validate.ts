/**
 * money_pay's checks (dl-w3.61.6), one line in validate.ts: the bank holds Polish denominations,
 * the bank can make the amount, and the tray has places for the coins the answer needs (the
 * fewest the bank allows). The amount label is the task and may name the amount; `say` may too,
 * since the amount is what to pay, not the answer.
 */

import { fewestOf, isDenom } from "../money.ts";
import type { Surface } from "../names.ts";
import type { PlaceData, PlaceKey } from "./model.ts";

type Report = (path: string, rule: string, message: string) => void;

/** The most places a tray draws: two rows a child's screen holds. */
export const MAX_SLOTS = 12;

export function coinsProblems(
  data: Extract<PlaceData, { surface: typeof Surface.Coins }>,
  key: Extract<PlaceKey, { surface: typeof Surface.Coins }>,
  err: Report,
  warn: Report,
): void {
  if (data.bank.length === 0)
    err("data.bank", "empty_bank", "The bank needs at least one coin or note.");
  data.bank.forEach((d, i) => {
    if (!isDenom(d))
      err(
        `data.bank[${i}]`,
        "unknown_denomination",
        `“${d}” is not a Polish coin or note (gr1 to zl200).`,
      );
  });
  if (new Set(data.bank).size !== data.bank.length)
    warn(
      "data.bank",
      "duplicate_denomination",
      "A coin is listed twice in the bank: each one is already endless.",
    );
  if (data.amount_label.trim() === "")
    err("data.amount_label", "empty_label", "Say how much to pay.");
  if (!Number.isInteger(data.slots) || data.slots < 1)
    err("data.slots", "no_slots", "The tray needs at least one place.");
  else if (data.slots > MAX_SLOTS)
    warn("data.slots", "too_many_slots", `More than ${MAX_SLOTS} places crowd a child’s screen.`);
  if (!Number.isInteger(key.amount_gr) || key.amount_gr <= 0) {
    err("key.amount_gr", "bad_amount", "The amount is a whole number of grosze above zero.");
    return;
  }
  const known = data.bank.filter(isDenom);
  const fewest = fewestOf(key.amount_gr, known);
  if (fewest === null)
    err("key.amount_gr", "bank_cannot_pay", "The bank’s coins cannot make the amount.");
  else if (fewest.length > data.slots)
    err(
      "data.slots",
      "tray_too_small",
      `The fewest coins that make the amount are ${fewest.length}, but the tray has ${data.slots} places.`,
    );
}
