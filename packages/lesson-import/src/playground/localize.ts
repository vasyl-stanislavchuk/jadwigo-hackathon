/**
 * A line written in both languages, and picking one, as `apps/web/src/playground/localize.ts`
 * does for the page. The written examples are authored with both languages side by side; the seed
 * resolves each to one language, the shape a lesson question holds.
 */

/** The languages the playground's examples are written in. */
export type ExampleLanguage = "pl" | "en";
export const LANGUAGES: readonly ExampleLanguage[] = ["pl", "en"];

/** A line in each language. */
type Tr = { readonly pl: string; readonly en: string };

/** A line written once, or in each language. */
export type Text = string | Tr;

function isTr(value: unknown): value is { pl: unknown; en: unknown } {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => k === "pl" || k === "en");
}

/** `value` in one language: every Tr in it, at any depth, becomes its `language` side. */
export function resolve<T>(value: unknown, language: ExampleLanguage): T {
  if (isTr(value)) return value[language] as T;
  if (Array.isArray(value)) return value.map((v) => resolve(v, language)) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolve(v, language)]),
    ) as T;
  }
  return value as T;
}
