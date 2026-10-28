import { Denom } from "@jadwigo/contracts";

/**
 * Polish money for the coins judge: what each coin and note is worth, and the fewest that make an
 * amount. Only the judge's half is here; the coin pictures are the page's.
 */

/** Each denomination's value in grosze (100 grosze is 1 złoty). */
export const DENOM_GR: Readonly<Record<Denom, number>> = {
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

/** Whether a value names a denomination: a committed value is checked before it is counted. */
export function isDenom(v: unknown): v is Denom {
  return Denom.safeParse(v).success;
}

/** What coins and notes are worth in grosze, summed. */
export function totalGr(items: readonly Denom[]): number {
  return items.reduce((sum, d) => sum + DENOM_GR[d], 0);
}

/** The most a money question counts, in grosze (10 000 zł): far past any amount a child counts, and
 * small enough that `fewestOf` stays a quick table. Past it a judge answers `other_wrong`. */
export const MAX_GR = 1_000_000;

/** The fewest coins and notes from `bank` (each as many times as wanted) that make `gr`, largest
 * first, or null when the bank cannot make it. Polish money is a 1-2-5 system, so taking the
 * largest that fits works for the full set; a bank with gaps is counted exactly. */
export function fewestOf(gr: number, bank: readonly Denom[]): Denom[] | null {
  if (!Number.isInteger(gr) || gr < 0 || gr > MAX_GR) return null;
  const denoms = [...new Set(bank)];
  const count: number[] = Array.from({ length: gr + 1 }, () => Number.POSITIVE_INFINITY);
  const last: (Denom | null)[] = Array.from({ length: gr + 1 }, () => null);
  count[0] = 0;
  for (let v = 1; v <= gr; v++) {
    for (const d of denoms) {
      const prev = v - DENOM_GR[d];
      const through = prev >= 0 ? (count[prev] ?? Number.POSITIVE_INFINITY) + 1 : Number.NaN;
      if (through < (count[v] ?? Number.POSITIVE_INFINITY)) {
        count[v] = through;
        last[v] = d;
      }
    }
  }
  if (count[gr] === Number.POSITIVE_INFINITY) return null;
  const out: Denom[] = [];
  for (let v = gr; v > 0; ) {
    const d = last[v];
    if (d === null || d === undefined) return null;
    out.push(d);
    v -= DENOM_GR[d];
  }
  return out.sort((a, b) => DENOM_GR[b] - DENOM_GR[a]);
}
