/**
 * The draft watcher (dl-a38n, lane web): list JADWIGO_DRAFTS_DIR, watch it, and push the newest
 * draft and its check file to the page as a `builder:draft` custom HMR event. The directory comes
 * from a function in src/config.ts, never from process.env here (lint/no-raw-process-env.grit).
 * Step 0 leaves it empty; the lane's bead (dl-a38n.9) names the event and what it carries.
 */
import type { ViteDevServer } from "vite";

export function draftWatch(_server: ViteDevServer): void {}
