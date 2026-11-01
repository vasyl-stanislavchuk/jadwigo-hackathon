// The featured lessons the landing page's gallery shows (dl-5ssh.4.3): read from the app's public
// GET /api/v1/featured-lessons when the site is built, since the API answers only its own origin
// (no CORS). A build with no network falls back to the snapshot in src/content/featured.json. A lesson
// whose title ends in "(mock)" is left out (owner, 2026-10-31).
// Each page shows only the lessons in its own language (dl-w0b4.85).
import { Featured, type FeaturedLesson, ROUTES } from "@jadwigo/contracts";
import snapshot from "../content/featured.json" with { type: "json" };
import { appUrl } from "../index.ts";

export const featuredUrl = new URL(ROUTES.featuredLessons.path, appUrl).href;

/** Where a card goes: the app's player for that assignment (playPath in apps/web/src/play/route.ts). */
export const playUrl = (lesson: FeaturedLesson): string =>
  new URL(`play/${lesson.assignment_id}`, appUrl).href;

const shown = (lessons: FeaturedLesson[]): FeaturedLesson[] =>
  lessons.filter((l) => !/\(mock\)\s*$/i.test(l.title));

/** The lessons to show, and where they came from, for the build log. */
export async function featuredLessons(
  get: (url: string) => Promise<Response> = fetch,
): Promise<{ lessons: FeaturedLesson[]; from: "api" | "snapshot" }> {
  try {
    const res = await get(featuredUrl);
    if (!res.ok) throw new Error(`${featuredUrl} answered ${res.status}`);
    return { lessons: shown(Featured.parse(await res.json()).lessons), from: "api" };
  } catch {
    return { lessons: shown(Featured.parse(snapshot).lessons), from: "snapshot" };
  }
}

/** The featured lessons in one language: /lekcje and the Polish home show pl, /en/ shows en (dl-w0b4.85). */
export const lessonsIn = (
  lessons: FeaturedLesson[],
  lang: FeaturedLesson["language"],
): FeaturedLesson[] => lessons.filter((l) => l.language === lang);

/** Stops the build when a page would show a lesson in another language than its own. */
export function assertLanguage(lessons: FeaturedLesson[], lang: FeaturedLesson["language"]): void {
  const other = lessons.filter((l) => l.language !== lang);
  if (other.length > 0)
    throw new Error(
      `A ${lang} page lists lessons in another language: ${other.map((l) => `${l.title} (${l.language})`).join(", ")}`,
    );
}

/**
 * The lessons a page in `lang` shows: the featured list filtered to its language, with the source
 * logged. The filter is the guarantee: a lesson in another language is left out of the page.
 * Gallery.astro's assertLanguage guards the cards, on the list a page hands it.
 */
export async function pageLessons(
  lang: FeaturedLesson["language"],
  get: (url: string) => Promise<Response> = fetch,
): Promise<FeaturedLesson[]> {
  const { lessons, from } = await featuredLessons(get);
  const mine = lessonsIn(lessons, lang);
  console.warn(`Featured ${lang} lessons: ${mine.length} of ${lessons.length}, from the ${from}`);
  return mine;
}
