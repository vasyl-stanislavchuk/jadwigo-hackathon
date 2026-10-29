/**
 * The lesson's frame on Zeszyt. Zeszyt is the app's one look, not only the lesson's (decision dl-76lr,
 * 2026-10-25; the owner on 2026-10-29, epic dl-uukj.32): its roles and sizes live in @jadwigo/ui's
 * foundation.css, which the tokens lane (dl-uukj.32.2) moves from [data-lesson-theme='zeszyt'] to
 * :root, so a parent's page and the home list wear it too. This wrapper marks what only a lesson
 * adds: the [data-lesson-theme] scope the stylesheets select for a lesson (its ground, its controls'
 * press and focus), the ink caret and the keyboard's focus frame. The app loads the
 * stylesheets with @jadwigo/ui/styles.css. Ported from david-learns
 * frontend/src/playground/theme/LessonTheme.tsx, which also loaded the stylesheets and the font.
 */

import { type ReactNode, useEffect } from "react";
import { installInkCaret } from "./inkCaret.ts";
import { installKeyboardFocus } from "./keyboardFocus.ts";

export function LessonTheme({ children }: { children: ReactNode }): JSX.Element {
  // Zeszyt's 3px breathing caret over every typed field (the export's AnswerField), and the
  // keyboard's frame only after keyboard use, even when the app moves the focus (keyboardFocus.ts).
  // Each installs once per page, whichever theme mounts first.
  useEffect(() => {
    installInkCaret();
    installKeyboardFocus();
  }, []);
  return <div data-lesson-theme="zeszyt">{children}</div>;
}
