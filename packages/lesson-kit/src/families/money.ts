/**
 * Polish money (dl-w3.61, lane E fills its views): the coins and notes a money figure draws and a
 * money tray pays with, from 1 grosz to 200 złotych. Shared by figure.ts (`coins`) and
 * place/model.ts (Surface.Coins), so neither imports the other. A denomination is page data: the
 * learner sees the coins, never a total.
 */

import { Denom } from "@jadwigo/contracts";
import type { CoinToken } from "../parts/Coins.tsx";

export type { Denom };

export const DENOMS = Denom.options;

/** Each denomination's value in grosze (100 grosze is 1 złoty). */
export const DENOM_GR: Record<Denom, number> = {
  gr1: 1,
  gr2: 2,
  gr5: 5,
  gr10: 10,
  gr20: 20,
  gr50: 50,
  zl1: 100,
  zl2: 200,
  zl5: 500,
  zl10: 1000,
  zl20: 2000,
  zl50: 5000,
  zl100: 10000,
  zl200: 20000,
};

/** Whether a string names a denomination: page data from a spec is checked before it is drawn. */
export function isDenom(v: unknown): v is Denom {
  return typeof v === "string" && (DENOMS as readonly string[]).includes(v);
}

/** What a coin or a note is worth in grosze, summed. */
export function totalGr(items: readonly Denom[]): number {
  return items.reduce((sum, d) => sum + DENOM_GR[d], 0);
}

/** Each coin's real diameter in millimetres (NBP), so a figure's coins keep their real proportions
 * (Slots addendum 4.7: the 1 zł is the largest of 2 zł, 1 zł, 50 gr, 20 gr). */
const COIN_MM: Partial<Record<Denom, number>> = {
  gr1: 15.5,
  gr2: 17.5,
  gr5: 19.5,
  gr10: 16.5,
  gr20: 18.5,
  gr50: 20.5,
  zl1: 23,
  zl2: 21.5,
  zl5: 24,
};

/** How a part draws one denomination (components/parts/Coins.tsx): the value written on it as a
 * real coin writes it, its metal (grosze, złoty or a note), its size class and, for a coin, its
 * real diameter. */
export function tokenOf(d: Denom): CoinToken {
  const gr = DENOM_GR[d];
  const mm = COIN_MM[d];
  if (gr < 100) return { face: `${gr} gr`, metal: "gr", size: gr < 10 ? "sm" : "md", mm };
  if (gr < 1000) return { face: `${gr / 100} zł`, metal: "zl", size: "lg", mm };
  return { face: `${gr / 100} zł`, metal: "note", size: "note" };
}

/** An amount written as a Polish price: `3 zł 50 gr` (split, the default), or `3,50 zł`
 * (decimal). A whole złoty drops the grosze in split form; under one złoty drops the złote. */
export function formatAmount(gr: number, format: "split" | "decimal" = "split"): string {
  const zl = Math.floor(gr / 100);
  const rest = gr % 100;
  if (format === "decimal") return `${zl},${String(rest).padStart(2, "0")} zł`;
  if (rest === 0) return `${zl} zł`;
  if (zl === 0) return `${rest} gr`;
  return `${zl} zł ${rest} gr`;
}

/** The fewest coins and notes from `bank` (each as many times as wanted) that make `gr`, largest
 * first, or null when the bank cannot make it. Polish money is a 1-2-5 system, so taking the
 * largest that fits works for the full set; a bank with gaps is counted exactly. */
export function fewestOf(gr: number, bank: readonly Denom[]): Denom[] | null {
  if (!Number.isInteger(gr) || gr < 0) return null;
  const denoms = [...new Set(bank)];
  const count: number[] = Array.from({ length: gr + 1 }, () => Infinity);
  const last: (Denom | null)[] = Array.from({ length: gr + 1 }, () => null);
  count[0] = 0;
  for (let v = 1; v <= gr; v++) {
    for (const d of denoms) {
      const prev = v - DENOM_GR[d];
      const via = (count[prev] ?? Infinity) + 1;
      if (prev >= 0 && via < (count[v] ?? Infinity)) {
        count[v] = via;
        last[v] = d;
      }
    }
  }
  if (count[gr] === Infinity) return null;
  const out: Denom[] = [];
  for (let v = gr; v > 0; v -= DENOM_GR[last[v] as Denom]) out.push(last[v] as Denom);
  return out.sort((a, b) => DENOM_GR[b] - DENOM_GR[a]);
}
