/**
 * The frame of a parent page that is not a list (dl-uukj.47.67 handoff §8, S21): the wide 960 column
 * left-aligned to the 32 gutter (16 on a phone), sections 32 apart, and a title block: an optional
 * disc, the h1 (22 in the adult scale) with one muted line under it, the page's primary action after
 * the title. The child page, the lesson overview and the attempt review stand on it.
 */

import { cn, Heading, Page } from "@jadwigo/ui";
import type { ComponentProps, ReactElement, ReactNode } from "react";

/** shortcut: Page has no "wide" width yet, so the wide column is Page's prose one narrowed here;
 * move it into Page when a second lane needs it. */
export function WidePage({ className, ...props }: ComponentProps<typeof Page>): ReactElement {
  return (
    <Page
      width="prose"
      className={cn("mx-0 max-w-240 min-w-0 gap-8 px-4 pt-5 pb-8 md:px-8", className)}
      {...props}
    />
  );
}

export function TitleBlock({
  disc,
  title,
  line,
  action,
  className,
  ...props
}: Omit<ComponentProps<"header">, "title"> & {
  disc?: ReactNode;
  title: string;
  /** The one muted line under the title. */
  line?: ReactNode;
  /** The page's primary action, after the title; on a phone it goes under it. */
  action?: ReactNode;
}): ReactElement {
  return (
    <header className={cn("flex flex-wrap items-center gap-3", className)} {...props}>
      {disc}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Heading className="font-semibold break-words">{title}</Heading>
        {line !== undefined && (
          <p className="flex flex-wrap items-center gap-x-1.5 text-jw-page-small text-muted-foreground">
            {line}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
