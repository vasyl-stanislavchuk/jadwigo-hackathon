/**
 * Runs the render rules over a drawn step once it has settled (its pictures loaded or failed, one
 * frame drawn), and hands the findings to `onFindings`. With no `onFindings` it does nothing: the
 * rules run only where the dev server takes them (LessonBuilderScreen).
 */

import type { Finding } from "@jadwigo/lesson-import/file";
import { type RefObject, useEffect } from "react";
import { type RenderedStep, renderFindings } from "./rules.ts";

const PICTURE_WAIT_MS = 3_000;

/** Every picture under `root` loaded or failed, or the wait ran out. */
function settled(root: Element): Promise<void> {
  const pending = [...root.querySelectorAll("img")].filter((img) => !img.complete);
  const each = pending.map(
    (img) =>
      new Promise<void>((done) => {
        img.addEventListener("load", () => done(), { once: true });
        img.addEventListener("error", () => done(), { once: true });
      }),
  );
  const wait = new Promise<void>((done) => setTimeout(done, PICTURE_WAIT_MS));
  return Promise.race([Promise.all(each).then(() => undefined), wait]);
}

export function useRenderCheck(
  ref: RefObject<Element | null>,
  step: RenderedStep,
  drawn: unknown,
  onFindings: ((step_id: string, findings: Finding[]) => void) | undefined,
): void {
  const { step_id, path } = step;
  useEffect(() => {
    const root = ref.current;
    if (onFindings === undefined || root === null) return;
    let live = true;
    void settled(root).then(() =>
      requestAnimationFrame(() => {
        if (live) onFindings(step_id, renderFindings(root, { step_id, path }));
      }),
    );
    return () => {
      live = false;
    };
  }, [ref, step_id, path, drawn, onFindings]);
}
