import type { PartialCopyTable } from "./types.ts";

// The adult English lines (dl-i952.17, owner 2026-10-07): only the keys whose child line does not
// fit an adult learning a command-line tool. Every other key falls back to en.ts. Plain,
// warm and short; no score, clock or loss words. Read and approved by the owner, 2026-10-07.
export const enAdult: PartialCopyTable = {
  praise: [
    { text: "That's right.", reviewed: true },
    { text: "Exactly.", reviewed: true },
    { text: "Good, that works.", reviewed: true },
  ],
  try_again: [
    { text: "Not quite. Have another go.", reviewed: true },
    { text: "Take another look and try again.", reviewed: true },
  ],
  move_on: { text: "Skip for now", reviewed: true },
  moved_on: { text: "Fine, we'll come back to this one.", reviewed: true },
  start: { text: "Start the lesson", reviewed: true },
  mic_check: { text: "Microphone check (coming soon)", reviewed: true },
  tutor_resting: { text: "Practising without voice today.", reviewed: true },
  load_failed: { text: "This lesson didn't load. Reload the page to try again.", reviewed: true },
  finished: { text: "That's the lesson done. Thank you!", reviewed: true },
  can_do_heading: { text: "What you can do now", reviewed: true },
  session_finished: { text: "This lesson is finished. You can start it again.", reviewed: true },
};
