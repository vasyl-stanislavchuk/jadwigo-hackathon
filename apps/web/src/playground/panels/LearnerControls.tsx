/**
 * Who the learner is: the language the example is shown in and the learner's category (an adult
 * reads adult lines). Both live in the URL (?lang=, ?who=), so they stay as you move on. Try it and
 * Review add the playground switches of the question type on show (switches.ts switchesFor).
 */

import type { Category, Language } from "@jadwigo/copy";
import type { ReactElement } from "react";
import { querySwitch, setQuery, useLocation } from "../route.ts";
import { ControlGroup, Segmented } from "../shell/controls.tsx";
import { switchesFor } from "../switches.ts";

const LANGUAGE_OPTIONS: { value: Language; label: string; title: string }[] = [
  { value: "pl", label: "Polski", title: "Polish" },
  { value: "en", label: "English", title: "English" },
];

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "child", label: "Child" },
  { value: "adult", label: "Adult" },
];

export function LearnerControls({
  language,
  category,
  question_type,
}: {
  language: Language;
  category: Category;
  /** Shows the playground switches of this question type. */
  question_type?: string;
}): ReactElement {
  return (
    <>
      <ControlGroup title="Learner" hint="Every example is written in Polish and English.">
        <Segmented<Language>
          label="Language"
          value={language}
          options={LANGUAGE_OPTIONS}
          onChange={(lang) => setQuery({ lang })}
        />
        <Segmented<Category>
          label="Who"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={(who) => setQuery({ who })}
        />
      </ControlGroup>
      {question_type !== undefined && <PlaygroundSwitches question_type={question_type} />}
    </>
  );
}

/** One segmented control per switch that applies to this question type, its value read from the URL. */
export function PlaygroundSwitches({
  question_type,
}: {
  question_type: string;
}): ReactElement | null {
  const { query } = useLocation();
  const shown = switchesFor(question_type);
  if (shown.length === 0) return null;
  return (
    <ControlGroup
      title="Playground switches"
      hint="The owner picks. A lesson plays the first choice of each."
    >
      {shown.map((sw) => (
        <Segmented<string>
          key={sw.name}
          label={sw.label}
          value={querySwitch(query, sw.name) ?? sw.default}
          options={sw.values.map((value) => ({ value, label: sw.labels?.[value] ?? value }))}
          onChange={(value) => setQuery({ [sw.name]: value })}
        />
      ))}
    </ControlGroup>
  );
}
