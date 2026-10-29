/**
 * The languages Jadwigo speaks, and what each one has (dl-5ssh.34.20, docs/runbooks/add-a-language.md).
 * Polish and English only (decisions 2026-10-24-the-marketing-site-is-built-with-astro-polish-and-english-only-p
 * and 2026-10-26-jadwigo-carries-no-ukrainian-the-tables-stay-in-david-learns-and). Voice is out of
 * scope (2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer), so a language
 * names no voice or speech-to-text code yet.
 *
 * `tools/src/check-languages.ts` fails CI when a language lacks a part its status needs.
 */

/**
 * - `live`: served to people. Every part is built and reviewed.
 * - `studio`: built and reviewed, never served. Every part but the site.
 * - `dormant`: listed, nothing checked.
 */
export const LANGUAGE_STATUSES = ["live", "studio", "dormant"] as const;
export type LanguageStatus = (typeof LANGUAGE_STATUSES)[number];

/** Intl.PluralRules categories. */
export type PluralCategory = "zero" | "one" | "two" | "few" | "many" | "other";

/**
 * Where one part of a language lives: a path from the repo root, or the issue that builds it. A
 * pending part fails nothing; it says which issue turns the check on. The part's issue swaps the
 * marker for the path when it lands.
 */
export type Part = string | { readonly pending: string };

export interface LanguageParts {
  /** The child copy table in packages/copy. */
  readonly copy: Part;
  /** The review checklist with its sources, which the reviewer workflows load. */
  readonly checklist: Part;
  /** The per-language workflow parts: style, glossary and reviewed examples. */
  readonly workflow: Part;
  /** Numbers written as words, for grading and the checks. */
  readonly number_words: Part;
  /** The marketing site's content. Not needed until the language is served. */
  readonly site: Part;
}

export interface LanguageEntry {
  /** BCP 47 primary tag. */
  readonly code: string;
  /** The language's name in itself. */
  readonly name: string;
  readonly status: LanguageStatus;
  /** CLDR's plural categories for the language, as Intl.PluralRules reports them. */
  readonly plural: readonly PluralCategory[];
  readonly parts: LanguageParts;
}

/** The parts each status needs. */
export const NEEDED_PARTS: Record<LanguageStatus, readonly (keyof LanguageParts)[]> = {
  live: ["copy", "checklist", "workflow", "number_words", "site"],
  studio: ["copy", "checklist", "workflow", "number_words"],
  dormant: [],
};

export const LANGUAGES = [
  {
    code: "pl",
    name: "polski",
    status: "live",
    plural: ["one", "few", "many", "other"],
    parts: {
      copy: "packages/copy/src/pl.ts",
      checklist: { pending: "dl-r772.34" },
      workflow: { pending: "dl-r772.34" },
      number_words: { pending: "dl-liwi.34" },
      site: "apps/site/src/content/pl",
    },
  },
  {
    code: "en",
    name: "English",
    status: "studio",
    plural: ["one", "other"],
    parts: {
      copy: "packages/copy/src/en.ts",
      checklist: { pending: "dl-r772.34" },
      workflow: { pending: "dl-r772.34" },
      number_words: { pending: "dl-liwi.34" },
      site: { pending: "dl-w0b4.7" },
    },
  },
] as const satisfies readonly LanguageEntry[];

export type Language = (typeof LANGUAGES)[number]["code"];

/** The language codes, in list order. */
export const LANGUAGE_CODES: readonly Language[] = LANGUAGES.map((l) => l.code);
