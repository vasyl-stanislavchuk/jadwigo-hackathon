import { LANGUAGE_CODES, type Language } from "@jadwigo/config";

/** The page's language, from <html lang>, for an analytics event's `locale` (dl-w0b4.14). */
export function pageLocale(doc: Document = document): Language {
  const lang = doc.documentElement.lang;
  return LANGUAGE_CODES.find((code) => code === lang) ?? "pl";
}
