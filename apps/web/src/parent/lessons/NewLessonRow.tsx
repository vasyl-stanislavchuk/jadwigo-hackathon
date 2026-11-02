/**
 * "Nowa lekcja" atop the Lekcje table (dl-uukj.47.18; owner, 2026-11-02: "Row atop the table";
 * handoff §6 Lekcje: a way to start a new lesson from here, never top-right). It wears §3's dashed
 * add style, the sidebar "+"'s line and ink, so it never reads as a lesson; it opens /parent, the
 * first screen.
 */

import { copy, type Language } from "@jadwigo/copy";
import { PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { parentPath } from "../route.ts";

export function NewLessonRow({ language }: { language: Language }): ReactElement {
  return (
    <NavLink
      href={parentPath({ lang: pageLang() })}
      className="flex min-h-jw-control items-center gap-2 rounded-jw-small border-jw border-dashed border-jw-line-strong px-3 text-jw-ink-soft hover:border-jw-ink-soft hover:text-jw-ink focus-visible:outline-3 focus-visible:outline-jw-focus"
      data-new-lesson-row
    >
      <PlusIcon aria-hidden className="size-4 shrink-0" />
      {copy(language, "parent_new_lesson", {}, CATEGORY)}
    </NavLink>
  );
}
