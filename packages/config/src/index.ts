/** Hosts per environment, the one source (dl-w0b4.2 adds the generated tfvars). Prod only for now. */
export const ENVIRONMENTS = ["prod"] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export const hosts: Record<Environment, { site: string; app: string; docs: string }> = {
  prod: { site: "jadwigo.pl", app: "app.jadwigo.pl", docs: "docs.jadwigo.pl" },
};

/** PostHog's EU cloud (Frankfurt): where events and replays go, and where the project is read
 * (decision dl-376c8). `/ingest` on our own hosts replaces `ingest` later (dl-5ssh.135). */
export const posthogHosts = {
  ingest: "https://eu.i.posthog.com",
  ui: "https://eu.posthog.com",
} as const;

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
