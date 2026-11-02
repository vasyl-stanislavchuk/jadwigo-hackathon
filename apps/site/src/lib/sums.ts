// True maths from grades 1-4 for the page's background (dl-5ssh.4.39, dl-5ssh.4.40): adding and
// taking away within 20 and within 100, the 2-10 times tables and 2-digit by 1-digit, exact division,
// comparing numbers, and halves and quarters. Each is written as the child writes it at school: a
// Polish page uses · and : and "½ z 8", an English page × and ÷ and "½ of 8". Pure, so sums.test.ts
// checks every one is right.
import type { Language } from "@jadwigo/config";

/** A number in [0, 1), as Math.random gives. */
export type Rand = () => number;

const between = (rand: Rand, lo: number, hi: number): number =>
  lo + Math.floor(rand() * (hi - lo + 1));

const words: Record<Language, { times: string; divide: string; of: string }> = {
  pl: { times: "·", divide: ":", of: "z" },
  en: { times: "×", divide: "÷", of: "of" },
};

/** One true piece of maths, as text: "7 + 8 = 15", "63 − 27 = 36", "12 · 4 = 48", "47 > 38", "½ z 8 = 4". */
export function trueSum(rand: Rand, lang: Language): string {
  const { times, divide, of } = words[lang];
  switch (between(rand, 0, 7)) {
    case 0: {
      // Grade 1: adding within 20.
      const a = between(rand, 2, 15);
      const b = between(rand, 2, 20 - a);
      return `${a} + ${b} = ${a + b}`;
    }
    case 1: {
      // Grade 1: taking away within 20.
      const whole = between(rand, 6, 20);
      const b = between(rand, 2, whole - 2);
      return `${whole} − ${b} = ${whole - b}`;
    }
    case 2: {
      // Grades 2-3: adding and taking away within 100.
      const a = between(rand, 11, 79);
      const b = between(rand, 11, 99 - a);
      return rand() < 0.5 ? `${a} + ${b} = ${a + b}` : `${a + b} − ${b} = ${a}`;
    }
    case 3: {
      // Grades 2-3: the times tables.
      const a = between(rand, 2, 10);
      const b = between(rand, 2, 10);
      return `${a} ${times} ${b} = ${a * b}`;
    }
    case 4: {
      // Grade 4: 2-digit by 1-digit.
      const a = between(rand, 11, 25);
      const b = between(rand, 2, 4);
      return `${a} ${times} ${b} = ${a * b}`;
    }
    case 5: {
      // Grades 2-3: exact division.
      const b = between(rand, 2, 10);
      const q = between(rand, 2, 10);
      return `${b * q} ${divide} ${b} = ${q}`;
    }
    case 6: {
      // Grades 1-2: comparing numbers.
      const a = between(rand, 10, 99);
      let b = between(rand, 10, 99);
      if (b === a) b = a === 99 ? 98 : a + 1;
      return a > b ? `${a} > ${b}` : `${a} < ${b}`;
    }
    default: {
      // Grade 3-4: a half or a quarter of a number.
      const quarter = rand() < 0.4;
      const part = between(rand, 2, 10);
      return quarter ? `¼ ${of} ${part * 4} = ${part}` : `½ ${of} ${part * 2} = ${part}`;
    }
  }
}
