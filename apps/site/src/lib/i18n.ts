// The site's languages and the words its frame needs in each (dl-w0b4.82). The words are the
// site_* Paraglide messages in packages/copy; a page passes its language explicitly, since a static
// build has no request to read a locale from. Pure, so i18n.test.ts checks it without a build.
import { LANGUAGES, type Language } from "@jadwigo/config";

/**
 * The languages a build serves: every listed language in dev, and only the `live` ones in a prod
 * build. English is `studio` until dl-5ssh.34.70 switches it on, so a prod build carries no
 * English page before then.
 */
export function servedLanguages(prod: boolean): Language[] {
  return LANGUAGES.filter((l) => !prod || l.status === "live").map((l) => l.code);
}

/** The languages other than Polish that a build serves, each under its own `/<lang>/` prefix. */
export const prefixedLanguages = (prod: boolean): Language[] =>
  servedLanguages(prod).filter((l) => l !== "pl");

/** The footer's links in a language: its privacy pages, by their stable paths (dl-w0b4.64). */
export function footerPaths(lang: Language): { privacy: string; deletion: string } {
  return lang === "pl"
    ? { privacy: "/prywatnosc", deletion: "/prywatnosc/usuwanie-danych" }
    : { privacy: "/en/privacy", deletion: "/en/privacy/data-deletion" };
}
