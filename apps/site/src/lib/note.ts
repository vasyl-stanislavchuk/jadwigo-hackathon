// The one-time language note (dl-w0b4.87, decision jadwigo-marketing/decisions/2026-11-01-the-owner-
// approves-each-featured-lesson-jadwigo-pl-s-language-sw): when the browser's language is the other
// one the page has, a note offers the twin page. It shows once per browser, remembered in
// localStorage, with no cookie. Pure, so note.test.ts checks it without a browser.

/** The localStorage key that says this browser has seen the note. */
export const noteKey = "jw-language-note";

/** The part of the storage the note uses: localStorage in the browser, a Map-backed fake in a test. */
export interface NoteStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A BCP 47 tag's primary language: "en-GB" is "en". */
export const primaryTag = (tag: string): string => tag.toLowerCase().split("-")[0] ?? "";

/**
 * Whether to offer the twin: the browser's language is the twin's, not the page's, and this browser
 * has not seen the note. A browser in a third language is offered nothing, since the twin is not in
 * its language either.
 */
export function shouldOffer(browser: string, page: string, twin: string, seen: boolean): boolean {
  const tag = primaryTag(browser);
  return !seen && tag !== page && tag === twin;
}

/**
 * Decides once and remembers: when the note is offered, the browser is marked as having seen it, so
 * it never shows again. Storage that refuses (a private window, a full quota) shows nothing, since
 * the note could not then keep its promise to show once.
 */
export function offerOnce(
  storage: NoteStorage,
  browser: string,
  page: string,
  twin: string,
): boolean {
  try {
    if (!shouldOffer(browser, page, twin, storage.getItem(noteKey) !== null)) return false;
    storage.setItem(noteKey, "1");
    return true;
  } catch {
    return false;
  }
}
