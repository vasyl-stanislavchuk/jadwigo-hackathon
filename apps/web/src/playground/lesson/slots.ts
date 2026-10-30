/**
 * The two slots the bridge lane fills (dl-a38n, lead decision 6): comments pinned to a step, and
 * the activity panel that says what the session did. Each is a no-op until its folder exists
 * (`comments/`, `activity/`), and LessonBuilderScreen mounts both from here, so the web lane
 * and the bridge lane never edit one file.
 */
import type { ReactElement } from "react";

export function CommentsSlot(_props: { step_id?: string }): ReactElement | null {
  return null;
}

export function ActivitySlot(): ReactElement | null {
  return null;
}
