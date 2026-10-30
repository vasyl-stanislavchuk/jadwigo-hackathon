/**
 * The lesson builder's dev-server side (dl-a38n, wave 1 step 0): one Vite plugin, loaded only
 * while `vite` serves, that calls two hooks from two files so two lanes never edit one file.
 *
 *   draft-watch.ts   watches JADWIGO_DRAFTS_DIR and pushes the newest draft over HMR (lane web)
 *   ask.ts           takes a comment from the page and appends it to the draft's asks file (lane bridge)
 *
 * The page it serves is src/playground/lesson/LessonBuilderScreen.tsx. The design is
 * docs/research/live-lesson-builder.md; the lanes are docs/worklog/dl-a38n/2026-10-30-wave-1.md.
 */
import type { Plugin, ViteDevServer } from "vite";
import { ask } from "./ask.ts";
import { draftWatch } from "./draft-watch.ts";

export const BUILDER_PLUGIN = "jadwigo-builder";

/** The plugin: on `serve` only, so a build never carries it. */
export function builderPlugin(): Plugin {
  return {
    name: BUILDER_PLUGIN,
    apply: "serve",
    configureServer(server: ViteDevServer) {
      draftWatch(server);
      ask(server);
    },
  };
}
