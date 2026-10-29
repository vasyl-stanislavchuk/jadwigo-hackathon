/** Hosts per environment, the one source (dl-w0b4.2 adds the generated tfvars). Prod only for now. */
export const ENVIRONMENTS = ["prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const hosts: Record<Environment, { site: string; app: string }> = {
  prod: { site: "jadwigo.pl", app: "app.jadwigo.pl" },
};

export {
  LANGUAGE_CODES,
  LANGUAGE_STATUSES,
  LANGUAGES,
  type Language,
  type LanguageEntry,
  type LanguageParts,
  type LanguageStatus,
  NEEDED_PARTS,
  type Part,
  type PluralCategory,
} from "./languages.ts";
