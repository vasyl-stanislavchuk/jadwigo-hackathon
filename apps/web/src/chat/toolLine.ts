/**
 * A tool line in the parent's words (dl-uukj.47.30; research §15.3, "each line is a sentence in the
 * parent's language, never a verb name or JSON"): each verb's icon, and its sentence built from the
 * call's typed input ("Szukanie zadań o: odejmowanie do 20"), or the verb's plain sentence when the
 * input gives nothing to say. Icons are decorative: the sentence and the state are the text.
 */

import type { VerbName } from "@jadwigo/contracts/run";
import type { CopyKey } from "@jadwigo/copy";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Eye,
  LayoutList,
  Lightbulb,
  type LucideIcon,
  NotebookPen,
  PencilLine,
  Search,
  Target,
} from "lucide-react";
import { TOOL_KEY } from "./tools.ts";

export const TOOL_ICON: Readonly<Record<VerbName, LucideIcon>> = {
  question_search: Search,
  lesson_draft: LayoutList,
  lesson_edit: PencilLine,
  lesson_check: ClipboardCheck,
  lesson_show: Eye,
  learner_skills: Target,
  learner_week: CalendarDays,
  learner_mistakes: NotebookPen,
  curriculum_topics: BookOpen,
  lesson_ideas: Lightbulb,
};

/** What a line's sentence may draw on besides the call's input. */
export interface LineContext {
  /** A learner's first name by id, from the parent's family; null when it is not one of theirs. */
  nameOf?: (learner: string) => string | null;
  /** Sends words as the parent's message: a widget's "Ułóż tę lekcję" (dl-z5ja.129). */
  onAsk?: (text: string) => void;
  /** The answers given in this page to an approval's choose form, by its call (dl-uukj.47.35). */
  chosen?: (call_id: string) => readonly (string | null)[] | undefined;
}

export interface Sentence {
  key: CopyKey;
  vars: Record<string, string>;
}

/** A non-empty string field of the input, trimmed, or null. */
function field(input: Record<string, unknown> | undefined, name: string): string | null {
  const value = input?.[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** The sentence for one call: built from its input where the input says enough. */
export function sentenceOf(
  verb: VerbName,
  input: Record<string, unknown> | undefined,
  context: LineContext = {},
): Sentence {
  const plain: Sentence = { key: TOOL_KEY[verb], vars: {} };
  const about = (key: CopyKey, name: string, value: string | null): Sentence =>
    value === null ? plain : { key, vars: { [name]: value } };
  const child = (): string | null => {
    const id = field(input, "learner_id");
    return id === null ? null : (context.nameOf?.(id) ?? null);
  };
  switch (verb) {
    case "lesson_draft":
      return about("chat_tool_lesson_draft_about", "topic", field(input, "topic"));
    case "question_search":
      return about("chat_tool_question_search_about", "topic", field(input, "words"));
    case "lesson_edit":
      return about("chat_tool_lesson_edit_step", "step", field(input, "step_id"));
    case "lesson_show":
      return about("chat_tool_lesson_show_step", "step", field(input, "step_id"));
    case "lesson_check":
      return about("chat_tool_lesson_check_about", "title", field(input, "title"));
    case "curriculum_topics":
      return about("chat_tool_curriculum_topics_about", "topic", field(input, "words"));
    case "learner_skills":
      return about("chat_tool_learner_skills_about", "child", child());
    case "learner_week":
      return about("chat_tool_learner_week_about", "child", child());
    case "learner_mistakes":
      return about("chat_tool_learner_mistakes_about", "child", child());
    case "lesson_ideas":
      return about("chat_tool_lesson_ideas_about", "child", child());
  }
}
