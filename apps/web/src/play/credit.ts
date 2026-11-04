/**
 * What a borrowed question's credit shows on the lesson (dl-1eieq.3): the page's `PageCredit` read
 * into lesson-kit's `CreditShown`, which `QuestionCredit` puts around the step and the instruction
 * row draws as "z Khan Academy" and its card. Ported from david-learns frontend/src/content/credit.ts
 * (dl-uukj.29.135) and cut to what the page holds. The licence and the notice are the source's,
 * never the item's (source-credit README §4.2).
 *
 * A source or a licence this file does not know shows nothing rather than a credit with its words
 * guessed. The page sends a known source's licence as its id (`creditLicence` in
 * packages/contracts), so a licence stored as a sentence still shows the source's card. Our own and bank questions carry no credit (decision
 * `2026-10-27-a-lesson-question-s-credit-is-source-ref-url-licence-original-la`), and Khan's keep
 * their card (decision `2026-10-29-parents-never-see-khan-s-level-names-khan-questions-keep-their-c`).
 */

import type { PageCredit } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import type { CreditShown } from "@jadwigo/lesson-kit";

interface Licence {
  /** Never translated: "CC BY-NC-SA 4.0". */
  name: string;
  /** The licence deed in each language the app speaks. */
  deed: Record<Language, string>;
}

const deeds = (base: string): Record<Language, string> => ({
  pl: `${base}deed.pl`,
  en: `${base}deed.en`,
});

/** By the SPDX-style id a credit names (`cc-by-nc-sa-4.0`). */
const LICENCES: Readonly<Record<string, Licence>> = {
  "cc-by-nc-sa-4.0": {
    name: "CC BY-NC-SA 4.0",
    deed: deeds("https://creativecommons.org/licenses/by-nc-sa/4.0/"),
  },
  "cc-by-nc-sa-3.0": {
    name: "CC BY-NC-SA 3.0",
    deed: deeds("https://creativecommons.org/licenses/by-nc-sa/3.0/"),
  },
};

interface Source {
  name: string;
  home: string;
  /** The source's required sentence and the part of it that links to `home`. */
  notice?: (language: Language) => { text: string; link: string };
}

/** By the source key a credit names (`khan`). */
const SOURCES: Readonly<Record<string, Source>> = {
  khan: {
    name: "Khan Academy",
    home: "https://www.khanacademy.org",
    notice: (language) => ({
      text: copy(language, "credit_notice_khan"),
      link: "www.khanacademy.org",
    }),
  },
};

/** "Changed" is derived, never authored (README §4.3): adapted by the lesson, or translated. */
function lineOf(credit: PageCredit, language: Language): CreditShown["line"] {
  const translated = language !== credit.original_lang;
  if (credit.adapted && translated) return "both";
  if (translated) return "translated";
  return credit.adapted ? "adapted" : "shared";
}

/** The credit a question shows in `language` (the lesson's), or null when it shows none. */
export function creditShown(credit: PageCredit | null, language: Language): CreditShown | null {
  if (credit === null) return null;
  // Own keys only: a credit is page data, and `constructor`, `toString` or `__proto__` would read
  // Object.prototype's instead and draw "z Object" or throw in the page's render.
  const source = Object.hasOwn(SOURCES, credit.source) ? SOURCES[credit.source] : undefined;
  const licence = Object.hasOwn(LICENCES, credit.licence) ? LICENCES[credit.licence] : undefined;
  if (source === undefined || licence === undefined) return null;
  const notice = source.notice?.(language);
  return {
    source: source.name,
    licence: licence.name,
    deedUrl: licence.deed[language],
    line: lineOf(credit, language),
    ...(notice === undefined ? {} : { notice: notice.text, noticeLink: notice.link }),
    home: source.home,
    notAffiliated: true,
  };
}
