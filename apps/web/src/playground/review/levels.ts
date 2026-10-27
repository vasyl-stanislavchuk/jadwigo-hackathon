/**
 * The three CRA levels of the review tab (decision
 * 2026-10-18-the-playground-s-abstraction-switch-has-three-cra-levels): concrete draws groups of
 * objects, representational draws the array (dots in rows), abstract is the question as written.
 * The levels are figures set on the same question, so its key and its help are untouched: a level
 * only redraws.
 *
 * A times-table question whose key names the fact (a `times_table` rule, or a `fill_blank` rule
 * whose blank is the product) gets the concrete and representational levels derived from its key.
 * A level the question cannot show is null, and the switch greys it out rather than hiding it.
 */

import type { Language } from "@jadwigo/copy";
import { copy } from "@jadwigo/copy";
import { type FamilySpec, type Figure, GROUP_ICONS, type GroupIcon } from "@jadwigo/lesson-kit";
import type { Tr } from "../localize.ts";
import { LEVELS, type Level } from "../route.ts";

export { LEVELS, type Level } from "../route.ts";

/** What the switch says, in the learner's language: the picture a level draws, in plain words. */
export const LEVEL_LABEL: Record<Level, Tr> = {
  concrete: { pl: "Obrazki", en: "Pictures" },
  representational: { pl: "Kropki", en: "Dots" },
  abstract: { pl: "Same liczby", en: "Numbers only" },
};

/** The level's name in the CRA sequence, for the switch's title. */
export const LEVEL_TITLE: Record<Level, string> = {
  concrete: "Concrete: groups of objects",
  representational: "Representational: the array of dots",
  abstract: "Abstract: the bare fact",
};

const BLANK = "□";

/** The a × b fact a question's key names, or null when the key names none. */
export function factOf(spec: FamilySpec): { a: number; b: number } | null {
  if (spec.family === "enter") {
    const rule = spec.key.rule;
    return rule?.rule === "times_table" ? { a: rule.a, b: rule.b } : null;
  }
  if (spec.family === "slots") {
    for (const key of Object.values(spec.key.gaps)) {
      if (key.kind !== "enter") continue;
      const rule = key.rule;
      if (rule?.rule === "times_table") return { a: rule.a, b: rule.b };
      // Only a blank that is the product: a missing factor's picture would count out the answer.
      const [a, b, ...rest] = rule?.rule === "fill_blank" ? rule.operands : [];
      if (
        rule?.rule === "fill_blank" &&
        rule.op === "mul" &&
        a !== undefined &&
        b !== undefined &&
        rest.length === 0 &&
        rule.template.replaceAll(" ", "").endsWith(`=${BLANK}`)
      )
        return { a, b };
    }
  }
  return null;
}

/** The object a derived concrete figure draws: fixed per fact, so the same question keeps its icon. */
export function iconFor(a: number, b: number): GroupIcon {
  return GROUP_ICONS[(a * b) % GROUP_ICONS.length] ?? "apple";
}

/** The question with `figure` as its picture. Enter and Slots carry it in their data, Choose in its stem. */
export function withFigure(spec: FamilySpec, figure: Figure): FamilySpec {
  switch (spec.family) {
    case "enter":
      return { ...spec, data: { ...spec.data, figure } };
    case "slots":
      return { ...spec, data: { ...spec.data, figure } };
    case "choose":
      return { ...spec, data: { ...spec.data, stem: { ...spec.data.stem, figure } } };
    default:
      return spec;
  }
}

/** The figure a level draws for an a × b fact, in the learner's language. Abstract keeps the question's own. */
export function figureFor(level: Level, a: number, b: number, language: Language): Figure | null {
  switch (level) {
    case "concrete":
      return {
        kind: "groups",
        groups: a,
        each: b,
        icon: iconFor(a, b),
        alt: copy(language, "groups_label", { a, b }),
      };
    case "representational":
      return { kind: "dots", rows: a, cols: b, alt: copy(language, "array_label", { a, b }) };
    case "abstract":
      return null;
  }
}

/** The question at `level`: derived from its key, the question as written for abstract, else null. */
export function levelSpec(spec: FamilySpec, level: Level, language: Language): FamilySpec | null {
  if (level === "abstract") return spec;
  const fact = factOf(spec);
  if (fact === null) return null;
  const figure = figureFor(level, fact.a, fact.b, language);
  return figure === null ? null : withFigure(spec, figure);
}

/** Which levels the switch offers for a question, in order, with the ones it cannot show marked. */
export function levelsOf(
  spec: FamilySpec,
  language: Language,
): { level: Level; available: boolean }[] {
  return LEVELS.map((level) => ({ level, available: levelSpec(spec, level, language) !== null }));
}
