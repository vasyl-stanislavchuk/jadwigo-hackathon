// Each page src/pages builds, at its path in every language (dl-w0b4.81). The Polish path is the one
// the site has always had, so it never moves; English sits under /en/ with English slugs. A page with
// its own `path` in a content file (O nas, Praca domowa, the privacy pages) names its twin in its
// frontmatter's `translation` instead.
import type { Language } from "@jadwigo/config";

export const twins = {
  index: { pl: "/", en: "/en" },
  lessons: { pl: "/lekcje", en: "/en/lessons" },
  howItWorks: { pl: "/jak-to-dziala", en: "/en/how-it-works" },
  compare: { pl: "/porownanie", en: "/en/compare" },
  signIn: { pl: "/zaloguj", en: "/en/sign-in" },
} as const satisfies Record<string, Record<Language, string>>;

export type Twin = keyof typeof twins;
