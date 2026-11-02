// One piece of the background's clouds (dl-5ssh.4.40): a subject, and what to write for it. About
// 45 in 100 are maths (most made fresh by src/lib/sums.ts, some facts by heart), 30 Polish spelling and
// 25 first English. The words are in src/content/clouds.ts; the background colours each subject.
import type { Language } from "@jadwigo/config";
import { english, mathsFacts, polish, romanNumerals } from "../content/clouds.ts";
import { type Rand, trueSum } from "./sums.ts";

export type Subject = "maths" | "polish" | "english";

const pickFrom = (rand: Rand, list: readonly string[]): string =>
  list[Math.floor(rand() * list.length)] ?? "";

export function cloudPiece(rand: Rand, lang: Language): { subject: Subject; text: string } {
  const roll = rand();
  if (roll < 0.35) return { subject: "maths", text: trueSum(rand, lang) };
  if (roll < 0.45) {
    const facts = rand() < 0.6 ? mathsFacts[lang] : romanNumerals;
    return { subject: "maths", text: pickFrom(rand, facts) };
  }
  if (roll < 0.75) return { subject: "polish", text: pickFrom(rand, polish) };
  return { subject: "english", text: pickFrom(rand, english) };
}
