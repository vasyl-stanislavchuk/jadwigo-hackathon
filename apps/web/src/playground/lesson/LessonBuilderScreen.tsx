/**
 * The lesson builder at /playground/lesson (dl-a38n): the newest draft in JADWIGO_DRAFTS_DIR,
 * part by part and step by step, drawn in the kit's preview mode with the check's findings
 * pinned to each step. Step 0 draws the frame and the two slots; lane web fills the draft and
 * the steps (adapter.ts, the watcher), lane bridge fills comments/ and activity/.
 */
import type { ReactElement } from "react";
import { ActivitySlot, CommentsSlot } from "./slots.ts";

export const LESSON_BUILDER_PATH = "/playground/lesson";

export function LessonBuilderScreen(): ReactElement {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 p-8">
      <h1 className="text-lg font-medium">Lesson builder</h1>
      <p className="text-muted-foreground">
        No draft yet. Ask for a lesson through the jadwigo MCP, and it appears here as it is
        drafted.
      </p>
      <CommentsSlot />
      <ActivitySlot />
    </div>
  );
}
