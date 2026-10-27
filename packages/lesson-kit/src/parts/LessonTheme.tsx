/**
 * The lesson's look: Zeszyt, the only one (decision dl-76lr, 2026-10-25). Its tokens are in
 * @jadwigo/ui's foundation.css under [data-lesson-theme='zeszyt'], and lesson.css puts the lesson on
 * its ground; the app loads both with @jadwigo/ui/styles.css. Ported from david-learns
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
