/**
 * The step's frame (dl-0ax3.3): shadcn's unstyled Questionnaire (@shadcn/react) around the
 * current step, so a block's choices get its radio semantics, arrow keys and letter shortcuts.
 *
 * The lesson's state stays on the server. The frame holds one item, the step the snapshot is
 * on, and that item is controlled from the runner's state: Questionnaire's own Next, Previous
 * and Skip are never rendered, its item change is never listened to, and a submit does nothing.
 * A missed answer therefore stays on the step until the runner moves (ruling 07). Its Progress is
 * not rendered either: no count, score or countdown reaches a child (charter:
 * struggle-not-pressure).
 *
 * The Runner and the block test harness (blocks/render.tsx) both frame a step with this, so a
 * block renders the same way in its tests as in a lesson.
 *
 * The letter shortcuts (A to E picks the first five options) are the built blocks' and the
 * Runner's: they pass `letters`. A family step takes none, since A to E is a numbered list on screen
 * with keys 1 to 5 (Choose addendum 2.2, decision dl-n501), so a letter typed there does nothing.
 *
 * The letter shortcuts listen on the frame, so they act only while focus is inside it. Each step
 * mounts a new frame (the Runner keys it by step id), and on mount the frame takes focus when
 * nothing else holds it: the first step after the start tap, and every step after the control
 * that moved on is gone (dl-7k3l). It never takes focus from a control the child or a screen
 * reader is on, it does not scroll, and the step shows no focus ring. `data-step` names the step
 * for a driver that plays the page (make e2e, dl-xdyq.20); it carries no key.
 */

import { cn } from "@jadwigo/ui";
import { Questionnaire } from "@shadcn/react/questionnaire";
import { type ReactElement, type ReactNode, useEffect, useRef } from "react";
import { LessonLanguage } from "./lessonLanguage.ts";
import type { Language } from "./types.ts";

export function StepFrame({
  stepId,
  className,
  letters = false,
  lessonLanguage = null,
  children,
}: {
  stepId: string;
  className?: string;
  letters?: boolean;
  /** The lesson's language, set as `lang` on the question's own text (stage/lessonLanguage.ts). */
  lessonLanguage?: Language | null;
  children: ReactNode;
}): ReactElement {
  // Questionnaire takes no ref on React 18, so a wrapper with no box finds the step.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const held = document.activeElement;
    if (held !== null && held !== document.body) return;
    box.current?.querySelector<HTMLElement>("fieldset")?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={box} className="contents">
      <Questionnaire.Root
        item={stepId}
        {...(letters ? { shortcuts: "letters" as const } : {})}
        noValidate
        onSubmit={(event) => event.preventDefault()}
        data-step-frame
        data-step={stepId}
      >
        {/* A fieldset with no group role (the blocks name their own groups), and its min-width
                    reset so a wide block shrinks to the column. */}
        <Questionnaire.Item
          name={stepId}
          role="none"
          className={cn("min-w-0 outline-none", className)}
        >
          <LessonLanguage.Provider value={lessonLanguage}>{children}</LessonLanguage.Provider>
        </Questionnaire.Item>
      </Questionnaire.Root>
    </div>
  );
}
