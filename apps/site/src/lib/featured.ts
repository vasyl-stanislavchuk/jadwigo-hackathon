// The featured lessons the landing page's gallery shows (dl-5ssh.4.3): read from the app's public
// GET /api/v1/featured-lessons when the site is built, since the API answers only its own origin
// (no CORS). A build with no network falls back to the snapshot in src/content/featured.json. A lesson
// whose title ends in "(mock)" is left out (owner, 2026-10-31).
// Each page shows only the lessons in its own language (dl-w0b4.85).
import { Featured, type FeaturedLesson, ROUTES } from "@jadwigo/contracts";
import snapshot from "../content/featured.json" with { type: "json" };
import { appUrl } from "../index.ts";

export const featuredUrl = new URL(ROUTES.featuredLessons.path, appUrl).href;

/** The app's player (playPath in apps/web/src/play/route.ts); an assignment id follows it. */
export const playBase = new URL("play/", appUrl).href;

/** Where a card goes: the app's player for that assignment. */
export const playUrl = (lesson: FeaturedLesson): string => `${playBase}${lesson.assignment_id}`;

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
  const mine = sortByGrade(lessonsIn(lessons, lang), lang);
  console.warn(`Featured ${lang} lessons: ${mine.length} of ${lessons.length}, from the ${from}`);
  return mine;
}

/**
 * Grade 1 first, then 2 and 3, and a lesson with no grade last; within a grade, by title in the
 * page's language (dl-w0b4.108).
 */
export function sortByGrade(
  lessons: readonly FeaturedLesson[],
  lang: FeaturedLesson["language"],
): FeaturedLesson[] {
  const rank = (l: FeaturedLesson): number => l.grade ?? Number.POSITIVE_INFINITY;
  return [...lessons].sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title, lang));
}

/** The grades the lessons have, lowest first: the landing page's tabs. None while no lesson has a grade. */
export const gradesOf = (lessons: readonly FeaturedLesson[]): number[] =>
  [...new Set(lessons.flatMap((l) => (l.grade === null ? [] : [l.grade])))].sort((a, b) => a - b);

/**
 * /lekcje's groups: one per grade present, lowest first, then the lessons with no grade, which have
 * no tab on the landing page and show only here.
 */
export function gradeGroups(
  lessons: readonly FeaturedLesson[],
): { grade: number | null; lessons: FeaturedLesson[] }[] {
  const groups = gradesOf(lessons).map((grade) => ({
    grade,
    lessons: lessons.filter((l) => l.grade === grade),
  }));
  const loose = lessons.filter((l) => l.grade === null);
  return loose.length > 0 ? [...groups, { grade: null, lessons: loose }] : groups;
}

/**
 * What scripts/check-dist.ts finds wrong with a built landing or lessons page: every grade the page
 * offers, as a tab (`name="grade" value="2"`) or a group (`id="grade-2"`), needs a card of that grade
 * that links to the app's player. Returns one line per grade that has none.
 */
export function gradePlayProblems(html: string, playPrefix: string): string[] {
  const offered = new Set(
    [...html.matchAll(/name="grade" value="(\d+)"|id="grade-(\d+)"/g)].map((m) => m[1] ?? m[2]),
  );
  const cards = html.split(/<li\b/).slice(1);
  return [...offered]
    .filter(
      (g) =>
        !cards.some((c) => c.includes(`data-grade="${g}"`) && c.includes(`href="${playPrefix}`)),
    )
    .map((g) => `grade ${g} has no card that links to ${playPrefix}`);
}
