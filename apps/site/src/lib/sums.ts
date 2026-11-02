// True sums from grades 1-3 for the page's background (dl-5ssh.4.39): addition and subtraction within
// 20, the 2-10 times tables and exact division. Each is written as the child writes it at school: a
// Polish page uses · and :, an English page × and ÷. Pure, so sums.test.ts checks every one is right.
import type { Language } from "@jadwigo/config";

/** A number in [0, 1), as Math.random gives. */
export type Rand = () => number;

const between = (rand: Rand, lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

const signs: Record<Language, { times: string; divide: string }> = {
  pl: { times: "·", divide: ":" },
  en: { times: "×", divide: "÷" },
};

/** One true sum, as text: "7 + 8 = 15", "3 · 4 = 12", "12 : 3 = 4". */
export function trueSum(rand: Rand, lang: Language): string {
  const { times, divide } = signs[lang];
  switch (between(rand, 0, 3)) {
    case 0: {
      const a = between(rand, 2, 15);
      const b = between(rand, 2, 20 - a);
      return `${a} + ${b} = ${a + b}`;
    }
    case 1: {
      const whole = between(rand, 6, 20);
      const b = between(rand, 2, whole - 2);
      return `${whole} − ${b} = ${whole - b}`;
    }
    case 2: {
      const a = between(rand, 2, 10);
      const b = between(rand, 2, 10);
      return `${a} ${times} ${b} = ${a * b}`;
    }
    default: {
      const b = between(rand, 2, 10);
      const q = between(rand, 2, 10);
      return `${b * q} ${divide} ${b} = ${q}`;
    }
  }
}
