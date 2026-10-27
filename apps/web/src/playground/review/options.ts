/**
 * Settings side by side (dl-w3.47): the same question under each value of a question type option,
 * so the reviewer compares a layout, a select rule or a gap kind on one task. `variantsOf` rewrites
 * the question's data per value and keeps only the variants lesson-kit's validate accepts with no
 * error, so an impossible pairing (a binary layout with four options) is never drawn.
 *
 * Only options that change what is drawn are compared. A key's case and accents rules changed only
 * the verdict, so they left with judging.
 *
 * A rewrite may move a second setting along when the first forces it: text on the keypad has no keys
 * to type it with. Each such coupling is noted below.
 */

import type { Gap, GapKey } from "@jadwigo/contracts";
import {
  columnKey,
  type FamilyName,
  type FamilySpec,
  GRAPH_KINDS,
  type GraphKind,
  tileMode,
  validate,
} from "@jadwigo/lesson-kit";

/** The options compared per family, with the values each takes. A family missing here has none. */
const OPTION_VALUES: Partial<Record<FamilyName, Record<string, readonly string[]>>> = {
  choose: {
    layout: ["list", "grid", "binary", "lettered", "inline"],
    select: ["one", "many"],
  },
  enter: {
    entry: ["keypad", "keyboard"],
    input: ["number", "text", "expression"],
  },
  slots: {
    gap_kind: ["enter", "choose"],
    // A written column with its small cells (carries, lent tens) or without them.
    carry_row: ["true", "false"],
  },
  group: { each_item: ["one", "many"], layout: ["columns", "zones"] },
  // Cards become tiles, each used once; tiles that repeat have no card form.
  sequence: { shape: ["cards", "tiles"] },
  place: {
    // A drawn graph's kind: the same data as each of the six graphs (a histogram needs its bins).
    kind: GRAPH_KINDS,
    minute_step: ["5", "15", "30"],
    hands: ["geared", "free"],
    total: ["hidden", "shown"],
    shape: ["bar", "circle", "rect"],
    cells: ["squares", "dots", "open"],
  },
};

interface Variant {
  value: string;
  spec: FamilySpec;
  /** The value the question was written with. */
  current: boolean;
}

export interface OptionVariants {
  option: string;
  current: string;
  variants: Variant[];
}

const LETTERS = ["A", "B", "C", "D", "E"];

/** The value the question has now for `option`; a Slots question with both kinds of gap is `mixed`. */
function currentValue(spec: FamilySpec, option: string): string {
  if (spec.family === "slots" && option === "gap_kind") {
    const kinds = new Set(spec.data.gaps.map((g) => g.kind as string));
    return kinds.size === 1 ? ([...kinds][0] ?? "") : "mixed";
  }
  if (spec.family === "slots" && option === "carry_row")
    return spec.data.column ? String(spec.data.column.carry_row) : "";
  if (spec.family === "sequence" && option === "shape")
    return tileMode(spec.data) ? "tiles" : "cards";
  return String((spec.data as Record<string, unknown>)[option] ?? "");
}

const isNumber = (s: string): boolean => /^-?[0-9]+$/.test(s.trim());

type EnterGap = Extract<Gap, { kind: "enter" }>;
type ChooseGap = Extract<Gap, { kind: "choose" }>;
type EnterGapKey = Extract<GapKey, { kind: "enter" }>;
type ChooseGapKey = Extract<GapKey, { kind: "choose" }>;

/** A typed gap as a chosen one: the accepted form and each near miss become options. */
function toChooseGap(gap: EnterGap, key: EnterGapKey): { gap: Gap; key: GapKey } {
  const labels = [key.accept[0], ...Object.keys(key.near ?? {})].filter(
    (l, i, all): l is string => l !== undefined && all.indexOf(l) === i,
  );
  const options = labels.map((label, i) => ({ id: `c${i + 1}`, label }));
  const near: Record<string, string> = {};
  for (const [label, cls] of Object.entries(key.near ?? {})) {
    const id = options.find((o) => o.label === label)?.id;
    if (id !== undefined && id !== "c1") near[id] = cls;
  }
  // A gap placed on the picture keeps its place whichever kind it is.
  return {
    gap: { id: gap.id, kind: "choose", options, ...(gap.at ? { at: gap.at } : {}) },
    key: { kind: "choose", correct: ["c1"], ...(Object.keys(near).length > 0 ? { near } : {}) },
  };
}

/** A chosen gap as a typed one: the right option's words are the accepted form, the others near misses. */
function toEnterGap(gap: ChooseGap, key: ChooseGapKey): { gap: Gap; key: GapKey } {
  const label = (id: string) => gap.options.find((o) => o.id === id)?.label ?? id;
  const accept = key.correct.map(label);
  const near: Record<string, string> = {};
  for (const [id, cls] of Object.entries(key.near ?? {})) near[label(id)] = cls;
  const input = accept.every(isNumber) ? "number" : "text";
  return {
    gap: { id: gap.id, kind: "enter", input, ...(gap.at ? { at: gap.at } : {}) },
    key: { kind: "enter", accept, ...(Object.keys(near).length > 0 ? { near } : {}) },
  };
}

function rewriteChoose(
  spec: Extract<FamilySpec, { family: "choose" }>,
  id: string,
  option: string,
  value: string,
): FamilySpec | null {
  const data = spec.data;
  if (option === "select")
    return { ...spec, id, data: { ...data, select: value as typeof data.select } };
  if (option !== "layout") return null;
  const layout = value as typeof data.layout;
  const options = data.options.map((o, i) => {
    const { letter: _letter, ...rest } = o;
    return layout === "lettered" ? { ...rest, letter: o.letter ?? LETTERS[i] ?? "" } : rest;
  });
  // A list never becomes inline, having no text to mark.
  if (layout === "inline" && data.layout !== "inline") return null;
  // An inline text drawn as a list keeps its sentence, with the tokens written in.
  if (data.layout === "inline" && layout !== "inline" && data.stem?.text) {
    const words = (oid: string) => {
      const c = data.options.find((o) => o.id === oid)?.content;
      return c?.kind === "text" ? c.text : c?.kind === "number" ? String(c.number) : oid;
    };
    const { tokens: _tokens, ...plain } = data;
    const text = data.stem.text.replace(/\{([a-z][a-z0-9_]*)\}/g, (_m, oid: string) => words(oid));
    return { ...spec, id, data: { ...plain, layout, options, stem: { ...data.stem, text } } };
  }
  return { ...spec, id, data: { ...data, layout, options } };
}

function rewriteSlots(
  spec: Extract<FamilySpec, { family: "slots" }>,
  id: string,
  option: string,
  value: string,
): FamilySpec | null {
  // A column's cells come from its sum: with or without the small cells, the gaps and key are
  // derived again. A column's digits stay typed.
  if (option === "carry_row") {
    if (!spec.data.column) return null;
    const column = { ...spec.data.column, carry_row: value === "true" };
    const derived = columnKey(column);
    return { ...spec, id, data: { ...spec.data, column, gaps: derived.gaps }, key: derived.key };
  }
  if (option !== "gap_kind" || (spec.data.column && value !== "enter")) return null;
  const gaps: Gap[] = [];
  const keys: Record<string, GapKey> = {};
  for (const gap of spec.data.gaps) {
    const key = spec.key.gaps[gap.id];
    if (key === undefined) return null;
    let next: { gap: Gap; key: GapKey };
    if (gap.kind === value) next = { gap, key };
    else if (gap.kind === "enter" && key.kind === "enter") next = toChooseGap(gap, key);
    else if (gap.kind === "choose" && key.kind === "choose") next = toEnterGap(gap, key);
    else return null;
    gaps.push(next.gap);
    keys[gap.id] = next.key;
  }
  return { ...spec, id, data: { ...spec.data, gaps }, key: { ...spec.key, gaps: keys } };
}

function rewritePlace(
  spec: Extract<FamilySpec, { family: "place" }>,
  id: string,
  option: string,
  value: string,
): FamilySpec | null {
  const data = spec.data;
  // A picture graph stacks whole pictures, so validate drops a step other than the tick, and a
  // histogram without its bins.
  if (option === "kind" && data.surface === "bars")
    return { ...spec, id, data: { ...data, kind: value as GraphKind } };
  // The minute hand's step and the hands' gearing; validate drops a step the key's minute is off.
  if (data.surface === "clock" && option === "minute_step")
    return { ...spec, id, data: { ...data, minute_step: Number(value) as 5 | 15 | 30 } };
  if (data.surface === "clock" && option === "hands")
    return { ...spec, id, data: { ...data, hands: value as "geared" | "free" } };
  if (option === "total" && data.surface === "coins")
    return { ...spec, id, data: { ...data, total: value as "hidden" | "shown" } };
  // A rectangle takes two rows when the parts split evenly into them, else one.
  if (option === "shape" && data.surface === "fraction") {
    const { rows: _rows, ...rest } = data;
    return {
      ...spec,
      id,
      data:
        value === "rect"
          ? { ...rest, shape: "rect", rows: rest.parts % 2 === 0 ? 2 : 1 }
          : { ...rest, shape: value as "bar" | "circle" },
    };
  }
  if (option === "cells" && data.surface === "grid" && data.split === "one")
    return { ...spec, id, data: { ...data, cells: value as "dots" | "squares" | "open" } };
  return null;
}

/** The question with `option` set to `value`, or null when the pairing has no meaning. Not yet validated. */
function rewrite(spec: FamilySpec, option: string, value: string): FamilySpec | null {
  const id = `${spec.id}~${option}=${value}`;
  switch (spec.family) {
    case "choose":
      return rewriteChoose(spec, id, option, value);
    case "enter": {
      const data = spec.data;
      // The keypad has digits only: text on it would have no keys.
      if (option === "entry")
        return value === "keypad" && data.input === "text"
          ? null
          : { ...spec, id, data: { ...data, entry: value as typeof data.entry } };
      if (option === "input")
        return {
          ...spec,
          id,
          data: {
            ...data,
            input: value as typeof data.input,
            entry: value === "text" && data.entry === "keypad" ? "keyboard" : data.entry,
          },
        };
      return null;
    }
    case "slots":
      return rewriteSlots(spec, id, option, value);
    case "group":
      if (option === "each_item")
        return { ...spec, id, data: { ...spec.data, each_item: value as "one" | "many" } };
      if (option === "layout")
        return { ...spec, id, data: { ...spec.data, layout: value as "columns" | "zones" } };
      return null;
    case "sequence":
      if (option !== "shape" || value !== "tiles" || tileMode(spec.data)) return null;
      return {
        ...spec,
        id,
        data: {
          ...spec.data,
          items: [],
          tiles: spec.data.items,
          slots: spec.data.items.length,
        },
      };
    case "place":
      return rewritePlace(spec, id, option, value);
    default:
      return null;
  }
}

/** One group per option the family compares: the question's own value first and marked, then each
 * other value that validates with no error. An option with one valid value is left out. */
export function variantsOf(spec: FamilySpec): OptionVariants[] {
  const options = OPTION_VALUES[spec.family] ?? {};
  const out: OptionVariants[] = [];
  for (const [option, values] of Object.entries(options)) {
    const current = currentValue(spec, option);
    const variants: Variant[] = [];
    for (const value of values) {
      if (value === current) {
        variants.push({ value, spec, current: true });
        continue;
      }
      const rewritten = rewrite(spec, option, value);
      if (rewritten === null || validate(rewritten).some((p) => p.level === "error")) continue;
      variants.push({ value, spec: rewritten, current: false });
    }
    variants.sort((a, b) => Number(b.current) - Number(a.current));
    if (variants.length > 1) out.push({ option, current, variants });
  }
  return out;
}
