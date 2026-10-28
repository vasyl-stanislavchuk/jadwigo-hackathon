import { FEATURED_POD_ID, type Featured } from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";

/**
 * `GET /api/v1/featured-lessons`: the lessons anyone may play now, from the landing page. Only
 * the featured pod's (owner, 2026-10-28), read under its own scope, so no other pod's assignment
 * is ever listed. A start on one still goes through `authorize()`, which checks it again.
 */
export async function featuredLessons(store: Store): Promise<Featured> {
  const open = await store.listOpenAssignments(FEATURED_POD_ID);
  return {
    lessons: open.map(({ assignment, lesson }) => ({
      assignment_id: assignment.id,
      lesson_id: lesson.id,
      title: lesson.title,
      language: lesson.language,
    })),
  };
}
