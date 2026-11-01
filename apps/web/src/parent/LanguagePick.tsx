/**
 * The parent's pl/en pick (dl-uukj.33): on the sign-in page, where it is the language the first
 * sign-in sends as `AccountCreate.language`, and on the parent home, where it moves the screens.
 * Each language is named in itself, so a parent who reads only one finds it.
 */

import { copy, type Language } from "@jadwigo/copy";
import { SegmentedControl } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { pickLanguage } from "../nav/language.ts";
import { LANGUAGES } from "../nav/location.ts";
import { CATEGORY } from "./adult.ts";

const NAME = { pl: "parent_language_pl", en: "parent_language_en" } as const satisfies Record<
  Language,
  string
>;

export function LanguagePick({ language }: { language: Language }): ReactElement {
  return (
    <div data-language-pick>
      <SegmentedControl
        label={copy(language, "parent_language", {}, CATEGORY)}
        size="sm"
        value={language}
        options={LANGUAGES.map((l) => ({ value: l, label: copy(language, NAME[l], {}, CATEGORY) }))}
        onChange={(value) => {
          const picked = LANGUAGES.find((l) => l === value);
          if (picked !== undefined) pickLanguage(picked);
        }}
      />
    </div>
  );
}
