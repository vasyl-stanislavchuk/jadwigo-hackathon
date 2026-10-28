/**
 * money_count (dl-w3.61.6): count the coins and notes in a purse and write the amount in two
 * gaps, the złote `{zl}` and the grosze `{gr}`: `□ zł □ gr`, as a child says it and a Polish klasa
 * 3 workbook writes it (Slots addendum 4.7, dl-4e0f, settling dl-w3.46.19). Decimals (3,50 zł) wait
 * for grade 4. The grosze gap is two digits, 0 to 99, and moves on by itself (addendum 2.4).
 *
 * moneyKey derives the key from the coins with its near misses, so an author writes the coins
 * once: `counted_coins_not_value` when the number of coins is written as the amount (eight 20 gr
 * coins as 8), and `grosze_not_carried` when 100 grosze or more stay grosze (160 gr, 0 zł). The
 * grosze gap cannot take 160 on the keypad, so there the class is named by the złote gap (0 zł);
 * a spoken 160 is still named. moneyCountProblems is validate's check (one line in validate.ts).
 */

import type { Figure } from "../figure.ts";
import { DENOM_GR, type Denom, formatAmount, isDenom, totalGr } from "../money.ts";
import { Family } from "../names.ts";
import type { Gap, GapKey, SlotsData, SlotsKey } from "./model.ts";

export const MONEY_TEMPLATE = "{zl} zł {gr} gr";

/** The złote gap and the grosze gap. */
export const MONEY_GAPS: Gap[] = [
  { id: "zl", kind: Family.Enter, input: "number" },
  { id: "gr", kind: Family.Enter, input: "number", max_length: 2, range: [0, 99] },
];

/** The key for a purse: the złote and the grosze, with the near misses the coins predict. */
export function moneyKey(items: readonly Denom[]): SlotsKey {
  const total = totalGr(items);
  const zl = Math.floor(total / 100);
  const gr = total % 100;
  const zlNear: Record<string, string> = {};
  const grNear: Record<string, string> = {};
  const add = (near: Record<string, string>, right: string, entry: string, cls: string) => {
    if (entry !== right && near[entry] === undefined) near[entry] = cls;
  };
  const grCoins = items.filter((d) => DENOM_GR[d] < 100);
  const grSum = totalGr(grCoins);
  if (grSum >= 100) {
    add(zlNear, String(zl), String(Math.floor((total - grSum) / 100)), "grosze_not_carried");
    add(grNear, String(gr), String(grSum), "grosze_not_carried");
  }
  add(zlNear, String(zl), String(items.length), "counted_coins_not_value");
  add(grNear, String(gr), String(items.length), "counted_coins_not_value");
  const gapKey = (accept: string, near: Record<string, string>): GapKey => ({
    kind: Family.Enter,
    accept: [accept],
    ...(Object.keys(near).length > 0 ? { near } : {}),
  });
  return { gaps: { zl: gapKey(String(zl), zlNear), gr: gapKey(String(gr), grNear) } };
}

type Report = (path: string, rule: string, message: string) => void;

/** Denominations from the list (any figure of coins). */
export function coinsFigureProblems(figure: Figure | undefined, err: Report): void {
  if (figure?.kind !== "coins") return;
  if (figure.items.length === 0)
    err("data.figure.items", "no_coins", "A purse needs at least one coin or note.");
  figure.items.forEach((d, i) => {
    if (!isDenom(d))
      err(
        `data.figure.items[${i}]`,
        "unknown_denomination",
        `“${d}” is not a Polish coin or note (gr1 to zl200).`,
      );
  });
}

/** money_count: a purse of coins, the template `□ zł □ gr`, and a key that is the purse's total.
 * The alt names the coins, never the total. */
export function moneyCountProblems(data: SlotsData, key: SlotsKey, err: Report): void {
  const figure = data.figure;
  if (figure?.kind !== "coins") {
    err("data.figure", "no_purse", "Counting money needs a figure of coins.");
    return;
  }
  if (data.template !== MONEY_TEMPLATE)
    err("data.template", "money_template", `An amount is written ${MONEY_TEMPLATE}.`);
  const items = figure.items.filter(isDenom);
  const total = totalGr(items);
  const zl = key.gaps["zl"];
  const gr = key.gaps["gr"];
  if (zl?.kind !== Family.Enter || gr?.kind !== Family.Enter) {
    err("key.gaps", "missing_key", "Counting money needs typed gaps zl and gr.");
    return;
  }
  const zlOk = zl.accept.some((a) => Number(a) === Math.floor(total / 100));
  const grOk = gr.accept.some((a) => Number(a) === total % 100);
  if (!zlOk || !grOk)
    err(
      "key.gaps",
      "money_key_mismatch",
      `The coins make ${formatAmount(total)}, but the key says otherwise.`,
    );
  const alt = figure.alt;
  const zlPart = Math.floor(total / 100);
  const grPart = total % 100;
  const tells = [
    formatAmount(total, "split"),
    formatAmount(total, "decimal").replace(" zł", ""),
    `${total} gr`,
    ...(zlPart > 0 && grPart > 0 ? [`${zlPart} zł ${grPart}`] : []),
  ];
  const leaked = tells.find((t) => alt.includes(t));
  if (leaked !== undefined)
    err("data.figure.alt", "key_in_alt", `The alt gives the amount away (“${leaked}”).`);
}
