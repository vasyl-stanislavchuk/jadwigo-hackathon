import { InMemoryStore } from "@jadwigo/store";
import { FIXED_NOW, LESSON_FILES } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { DRAFTS_POD, FEATURED_POD } from "./ids.ts";
import { importLessonFile } from "./import.ts";
import { withdrawLesson } from "./withdraw.ts";

const newStore = () => new InMemoryStore({ now: () => FIXED_NOW });
const listed = async (store: InMemoryStore) =>
  (await store.listOpenAssignments(FEATURED_POD.id)).map((o) => o.assignment.id);

describe("withdrawLesson", () => {
  it("archives a featured lesson named by its id: off the list, its assignment still plays", async () => {
    const store = newStore();
    const { lesson, assignment } = await importLessonFile(store, LESSON_FILES[0]);
    expect(await listed(store)).toContain(assignment.id);

    expect((await withdrawLesson(store, lesson.id)).status).toBe("archived");
    expect(await listed(store)).not.toContain(assignment.id);
    const started = await store.startAttempt(FEATURED_POD.id, { assignment_id: assignment.id });
    expect(started.attempt.assignment_id).toBe(assignment.id);
    // Rerunning is safe.
    expect((await withdrawLesson(store, lesson.id)).status).toBe("archived");
  });

  it("resolves an assignment id to its lesson, and --restore puts it back", async () => {
    const store = newStore();
    const { lesson, assignment } = await importLessonFile(store, LESSON_FILES[0]);
    expect((await withdrawLesson(store, assignment.id)).id).toBe(lesson.id);
    expect(await listed(store)).not.toContain(assignment.id);

    expect((await withdrawLesson(store, assignment.id, { restore: true })).status).toBe(
      "published",
    );
    expect(await listed(store)).toContain(assignment.id);
  });

  it("refuses an id outside the featured pod, and an id that is neither", async () => {
    const store = newStore();
    const draft = await importLessonFile(store, LESSON_FILES[0], DRAFTS_POD);
    await expect(withdrawLesson(store, draft.assignment.id)).rejects.toThrow(
      /not an assignment of the featured pod/,
    );
    await expect(withdrawLesson(store, draft.lesson.id)).rejects.toThrow(
      /not a lesson of the featured pod/,
    );
    expect((await store.getLesson(DRAFTS_POD.id, draft.lesson.id))?.status).toBe("published");
    await expect(withdrawLesson(store, "multiplication-times-four")).rejects.toThrow(
      /neither a lesson id/,
    );
  });
});
