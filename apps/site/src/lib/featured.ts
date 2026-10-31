// The featured lessons the landing page's gallery shows (dl-5ssh.4.3): read from the app's public
// GET /api/v1/featured-lessons when the site is built, since the API answers only its own origin
// (no CORS). A build with no network falls back to the snapshot in src/content/featured.json. A lesson
// whose title ends in "(mock)" is left out (owner, 2026-10-31).
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
