// The landing words of a language, for the pages and components that show them (dl-w0b4.81). Its
// index page's `reviewed` flag covers them (src/lib/landing.ts).

import { getEntry } from "astro:content";
import type { Language } from "@jadwigo/config";

export async function landingWords(lang: Language) {
  const words = (await getEntry("landing", lang))?.data;
  if (!words) throw new Error(`src/content/${lang}/landing.yaml is missing`);
  return words;
}

/** Whether a language's landing words are reviewed: its index page's flag. */
export async function landingReviewed(lang: Language): Promise<boolean> {
  return (await getEntry("pages", `${lang}/index`))?.data.reviewed ?? false;
}
