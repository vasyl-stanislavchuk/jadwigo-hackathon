// The site's languages: which ones a build serves, where each page sits in each, and the words its
// frame needs (dl-w0b4.82, dl-w0b4.81). The words are the site_* Paraglide messages in packages/copy;
// a page passes its language explicitly, since a static build has no request to read a locale from.
// Pure, so i18n.test.ts checks it without a build.
import { LANGUAGES, type Language } from "@jadwigo/config";
import { type Twin, twins } from "../content/twins.ts";

/** The language every page has, and the one served without a prefix. */
const baseLanguage: Language = "pl";

/**
 * The languages a build serves. A strict build (the one that is deployed) serves only the `live`
 * ones; a dev or preview build serves every listed language. English is `studio` until
 * dl-5ssh.34.70 switches it on, so no English page reaches a deploy before then.
 */
export function servedLanguages(strict: boolean): Language[] {
  return LANGUAGES.filter((l) => !strict || l.status === "live").map((l) => l.code);
}

/** The languages other than Polish that a build serves, each under its own `/<lang>/` prefix. */
export const prefixedLanguages = (strict: boolean): Language[] =>
  servedLanguages(strict).filter((l) => l !== baseLanguage);

/** A page's language: Polish when its frontmatter names none. */
export const languageOf = (page: { lang?: Language | undefined }): Language =>
  page.lang ?? baseLanguage;

/** The other language of the 2, the one the switch offers. */
export const otherLanguage = (lang: Language): Language => (lang === "pl" ? "en" : "pl");

/**
 * getStaticPaths for a page in src/pages: one path per served language, from the twin map. Each page
 * is the rest-param file named after its twin (`src/pages/[...lessons].astro`), so the param is too.
 */
export function twinStaticPaths<T extends Twin>(
  twin: T,
  strict: boolean,
): { params: Record<T, string | undefined>; props: { lang: Language } }[] {
  return servedLanguages(strict).map((lang) => {
    const path: string = twins[twin][lang];
    const params = { [twin]: path === "/" ? undefined : path.slice(1) } as Record<
      T,
      string | undefined
    >;
    return { params, props: { lang } };
  });
}

/** The path of a src/pages page in a language. */
export const twinPath = (twin: Twin, lang: Language): string => twins[twin][lang];

/** Every path the build serves for the pages in src/pages. */
export const servedTwinPaths = (strict: boolean): string[] =>
  Object.values(twins).flatMap((t) => servedLanguages(strict).map((lang) => t[lang]));

/**
 * A link into the app from a page in `lang`: `?lang=` names the page's language, so the app opens
 * in it (dl-uukj.33 reads ?lang first). Polish is the app's own fallback, so a Polish page's links
 * stay as they were.
 */
export function withLang(url: string, lang: Language): string {
  if (lang === baseLanguage) return url;
  const u = new URL(url);
  u.searchParams.set("lang", lang);
  return u.href;
}

/** The footer's links in a language: its privacy pages, by their stable paths (dl-w0b4.64). */
export function footerPaths(lang: Language): { privacy: string; deletion: string } {
  return lang === "pl"
    ? { privacy: "/prywatnosc", deletion: "/prywatnosc/usuwanie-danych" }
    : { privacy: "/en/privacy", deletion: "/en/privacy/data-deletion" };
}
