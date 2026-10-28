import type { Denom, PlaceData, PlaceKey, Verdict } from "@jadwigo/contracts";
import { DENOM_GR, fewestOf, isDenom, MAX_GR, totalGr } from "../money.ts";

/**
 * The coins judge (money_pay, dl-w3.61.6): the tray is judged as a whole. Any set of coins and
 * notes whose total is the amount is right, in any order; with `fewest`, only a set as short as
 * the fewest the bank allows. A miss takes, in order:
 * - `zloty_grosze_mixed`: the total is the amount with złote and grosze swapped (4 gr for 4 zł,
 *   or the other way), the unit confusion Polish klasa 3 money units name;
 * - `one_coin_off`: one coin from the bank more, or one from the tray less, makes it right;
 * - `too_much` or `too_little`;
 * - `not_fewest`: the right total, with more coins than needed, when the key asks for the fewest.
 * The marks are whole: a coin is never marked, since a marked coin would say which one to change.
 *
 * Ported from david-learns `frontend/src/families/place/coins.judge.ts`.
 */

type CoinsKey = Extract<PlaceKey, { surface: "coins" }>;
type CoinsData = Extract<PlaceData, { surface: "coins" }>;

const miss = (mistake_class: string): Verdict => ({ correct: false, mistake_class, parts: [] });

/** The tray's coins, or null when the value is not a tray of known denominations. */
function trayOf(value: Record<string, unknown>): Denom[] | null {
  const items = value["items"];
  return Array.isArray(items) && items.every(isDenom) ? items : null;
}

export function judgeCoins(
  key: CoinsKey,
  value: Record<string, unknown>,
  data?: CoinsData,
): Verdict {
  const items = trayOf(value);
  if (items === null || items.length === 0 || key.amount_gr > MAX_GR) return miss("other_wrong");
  const total = totalGr(items);
  const amount = key.amount_gr;
  if (total === amount) {
    if (key.fewest) {
      const fewest = fewestOf(amount, data?.bank ?? items);
      if (fewest !== null && items.length > fewest.length) return miss("not_fewest");
    }
    return { correct: true, mistake_class: null, parts: [] };
  }
  if (total * 100 === amount || total === amount * 100) return miss("zloty_grosze_mixed");
  const bank = data?.bank ?? [];
  const diff = amount - total;
  if (
    (diff > 0 && bank.some((d) => DENOM_GR[d] === diff)) ||
    (diff < 0 && items.some((d) => DENOM_GR[d] === -diff))
  )
    return miss("one_coin_off");
  return miss(diff < 0 ? "too_much" : "too_little");
}

/** The right answer to show: the fewest coins from the bank that make the amount. */
export function coinsSolution(key: CoinsKey, data?: CoinsData): { items: Denom[] } | null {
  const items = fewestOf(key.amount_gr, data?.bank ?? []);
  return items === null ? null : { items };
}
