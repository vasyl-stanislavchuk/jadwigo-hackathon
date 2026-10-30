/**
 * The learner's page (dl-uukj.32.10), the one frame /, /play, the results and the child's review
 * stand on: the kit's Page at the kid width, which writes the .kid-page class and the
 * data-learner-view and data-play markers that stage.css, lesson.css, StepShell, HelpLadder and
 * stepKeys read, with the lesson's ground as its only child (lesson.css styles
 * `.kid-page[data-play] > [data-lesson-theme]`). Column is where a page that is not a question
 * stands: a message, the list of lessons, the results, at the child's answer size.
 */

import { LessonTheme } from "@jadwigo/lesson-kit";
import { cn, Page } from "@jadwigo/ui";
import type { ComponentProps, ReactElement, ReactNode } from "react";

export function KidPage({ children }: { children: ReactNode }): ReactElement {
  return (
    <Page width="kid">
      <LessonTheme>{children}</LessonTheme>
    </Page>
  );
}

export function Column({ className, ...props }: ComponentProps<"div">): ReactElement {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-2xl flex-col items-start gap-6 p-6 text-jw-option",
        className,
      )}
      {...props}
    />
  );
}
