/** Learner-facing strings. Polish and English only (the site and the app both). */
export const LOCALES = ["pl", "en"] as const;
export type Locale = (typeof LOCALES)[number];

const messages = {
  pl: { start: "Zaczynamy!" },
  en: { start: "Let's start!" },
} as const satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["pl"];

export function t(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}

export function messageKeys(locale: Locale): string[] {
  return Object.keys(messages[locale]).sort();
}
