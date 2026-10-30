/**
 * The page's side of the render check (dl-a38n.28): each drawn step reports its findings, and once
 * the steps settle the whole draft's findings go to the dev server (`POST /@builder/render`,
 * dev/render.ts) in one post. A post goes only when the findings changed, because the file it
 * writes comes back with the draft and redraws the page: an unchanged report must end that loop.
 */

import type { Finding } from "@jadwigo/lesson-import/file";

const SETTLE_MS = 300;
const RENDER_PATH = "/@builder/render";

type Send = (draft_id: string, findings: Finding[]) => void;

/** A report for one draft at a time. Each drawn step reports with the draft's id and the ids of
 * the steps drawn now, so a step that left the draft takes its findings with it, and a new draft
 * starts clean. */
export function renderReport(send: Send, wait = SETTLE_MS) {
  let draft: string | null = null;
  let byStep = new Map<string, Finding[]>();
  let shown: readonly string[] = [];
  let last = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    // Wait until every drawn step has reported, so a half-drawn draft never clears the file.
    if (draft === null || !shown.every((id) => byStep.has(id))) return;
    const findings = shown.flatMap((id) => byStep.get(id) ?? []);
    const text = JSON.stringify([draft, findings]);
    if (text === last) return;
    last = text;
    send(draft, findings);
  };

  return (
    draft_id: string,
    step_ids: readonly string[],
    step_id: string,
    findings: Finding[],
  ): void => {
    if (draft_id !== draft) {
      draft = draft_id;
      byStep = new Map();
      last = "";
    }
    shown = step_ids;
    byStep.set(step_id, findings);
    clearTimeout(timer);
    timer = setTimeout(flush, wait);
  };
}

/** The post itself, through the loopback gate's header (dev/ask.ts admit). */
export function postRender(draft_id: string, findings: Finding[]): void {
  void fetch(RENDER_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Builder": "1" },
    body: JSON.stringify({ draft_id, findings }),
  }).catch(() => {});
}
