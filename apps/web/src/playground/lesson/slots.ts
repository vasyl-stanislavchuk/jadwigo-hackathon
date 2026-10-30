/**
 * The two slots the bridge lane fills (dl-a38n, lead decision 6): comments pinned to a step, and
 * the activity panel that says what the session did. LessonBuilderScreen mounts both from here, so
 * the web lane and the bridge lane never edit one file.
 *
 * CommentsSlot takes the step it sits under and the draft on the page; with no draft_id it uses the
 * newest draft, and with no step_id it comments on the whole lesson (comments/, dl-a38n.13).
 * ActivitySlot is what the session is doing, from its transcript (activity/, dl-a38n.15).
 */
export { ActivitySlot } from "./activity/ActivitySlot.tsx";
export { CommentsSlot } from "./comments/CommentsSlot.tsx";
