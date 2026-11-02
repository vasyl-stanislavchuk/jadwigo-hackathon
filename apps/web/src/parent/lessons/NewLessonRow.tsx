/**
 * "Nowa lekcja", the Lekcje page's one clear action at its top left (dl-uukj.47.18; handoff §6
 * Lekcje: a way to start a new lesson from here, never top-right; design review 2026-11-02: a clear
 * call to action at the top left). A primary button with a "+", sized to its words, above the
 * filters; it opens /parent, the first screen.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { parentPath } from "../route.ts";

export function NewLessonRow({ language }: { language: Language }): ReactElement {
  return (
    <Button asChild size="control" className="self-start">
      <NavLink href={parentPath({ lang: pageLang() })} data-new-lesson-row>
        <PlusIcon aria-hidden />
        {copy(language, "parent_new_lesson", {}, CATEGORY)}
      </NavLink>
    </Button>
  );
}
