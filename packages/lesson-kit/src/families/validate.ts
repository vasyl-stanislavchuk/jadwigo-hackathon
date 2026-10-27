/**
 * The checks a family step must pass before a learner sees it (docs/18 §7d). ClassTime checked
 * questions only in its editor, so an import could save a question with no key or a category named
 * "Example category" (classtime-data-model.md §2, §9). dl checks the step itself, here for the
 * playground and, from dl-w3.38.6, in `dl drop lint`.
 *
 * An `error` is a step that cannot be judged or shown fairly. A `warning` is a step that works but
 * loses evidence or clarity, such as a distractor with no mistake class behind it.
 */

import type { HelpCard } from "@jadwigo/contracts";
import { formAllowed, NUMBER_FORMS, parseDecimal, parseFraction } from "../parts/exact.ts";
import { MAX_CATEGORIES, tickOf } from "../parts/graph.ts";
import { commonDenominator, unitOf, wholeCount } from "../parts/numberLine.ts";
import { termsIn } from "../parts/richTextParse.ts";
import { answerWords, givesAway } from "./answer.ts";
import { validateInline } from "./choose/markNumbers.validate.ts";
import { isNoneOption, PICK } from "./choose/model.ts";
import { formOf, isEquation, parseEquation, parseExpression } from "./enter/expression.ts";
import { validateText } from "./enter/shortText.validate.ts";
import type { Figure } from "./figure.ts";
import { layoutOf } from "./group/model.ts";
import { Family, QuestionType, Surface } from "./names.ts";
import { areaModelProblems } from "./place/areaModel.ts";
import { clockProblems } from "./place/clock.validate.ts";
import { coinsProblems } from "./place/coins.validate.ts";
import { fractionProblems } from "./place/fraction.ts";
import { graphKindProblems } from "./place/graph.validate.ts";
import { type Point, partsHolding, partsOf } from "./place/model.ts";
import { slotCount, slotId, slotIndex, tileMode } from "./sequence/model.ts";
import { clockReadProblems } from "./slots/clock.ts";
import { columnProblems } from "./slots/column.validate.ts";
import { markerIds, playsAsChoose } from "./slots/model.ts";
import { coinsFigureProblems, moneyCountProblems } from "./slots/money.ts";
import { pyramidProblems } from "./slots/pyramid.validate.ts";
import type { Stem as StemData } from "./stem/model.ts";
import type { FamilySpec } from "./types.ts";

export interface Problem {
  path: string;
  rule: string;
  level: "error" | "warning";
  message: string;
}

/** The most gaps one step shows a child at once (ClassTime allows 200). */
const MAX_GAPS = 6;
/** Text an editor leaves behind when nobody wrote the real thing. */
const PLACEHOLDER = /^(?:example (?:item|category|option)|todo|tbd|lorem ipsum|\.\.\.|…)$/i;

export function validate(spec: FamilySpec): Problem[] {
  const out: Problem[] = [];
  const err = (path: string, rule: string, message: string) =>
    out.push({ path, rule, level: "error", message });
  const warn = (path: string, rule: string, message: string) =>
    out.push({ path, rule, level: "warning", message });
  const label = (path: string, text: string) => {
    if (text.trim() === "") err(path, "empty_label", "A label is empty.");
    else if (PLACEHOLDER.test(text.trim()))
      err(path, "placeholder", `“${text}” is placeholder text.`);
  };
  const unique = (path: string, ids: string[]) => {
    const dup = ids.find((id, i) => ids.indexOf(id) !== i);
    if (dup !== undefined) err(path, "duplicate_id", `The id ${dup} is used twice.`);
  };
  /** A key-derivable value spoken in `say` gives the answer away (docs/18 §7a rule 1). */
  const notSaid = (answer: string) => {
    const escaped = answer.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      escaped !== "" &&
      new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(spec.say)
    )
      err("say", "key_in_say", `say speaks the answer “${answer}”.`);
  };

  if (spec.say.trim() === "") err("say", "empty_label", "say is empty: every exercise is spoken.");
  // A dots or groups figure (families/figure.ts) is read by its alt: a drawing with no words is a gap for a screen reader.
  // So is a clock, coins or fraction bars (dl-w3.61).
  const figured = spec.data as { figure?: Figure; stem?: { figure?: Figure } };
  for (const figure of [figured.figure, figured.stem?.figure]) {
    if (
      figure !== undefined &&
      (figure.kind === "dots" || figure.kind === "groups") &&
      figure.alt.trim() === ""
    )
      err("data.figure", "missing_alt", "A dots or groups figure needs alt text.");
    if (
      figure !== undefined &&
      (figure.kind === "clock" || figure.kind === "coins" || figure.kind === "fraction_bars") &&
      figure.alt.trim() === ""
    )
      err("data.figure", "missing_alt", `A ${figure.kind} figure needs alt text.`);
    coinsFigureProblems(figure, err); // lane E (dl-w3.61.6)
    // Fraction bars to compare (dl-w3.61.7): the alt says what is drawn, never which is bigger.
    if (figure !== undefined && figure.kind === "fraction_bars" && /[<>=]/.test(figure.alt))
      err(
        "data.figure",
        "key_in_alt",
        "The fraction bars’ alt compares them: say what is drawn, never which is bigger.",
      );
  }
  // The voice reads say verbatim and a lesson plays by tapping and reading (decision
  // 2026-10-18-voice-is-additive-lessons-play-by-tapping-and-reading): maths in say is words,
  // never TeX. A stem or an option may hold TeX (components/parts/RichText.tsx).
  if (/[$\\]/.test(spec.say))
    err(
      "say",
      "tex_in_say",
      "say holds TeX: the voice reads it aloud, so write the maths in words and put the TeX in the stem.",
    );
  // A glossary term is tapped, and the voice would read its markup (dl-w3.56).
  if (termsIn(spec.say).length > 0)
    err(
      "say",
      "term_in_say",
      "say holds a glossary term: the voice reads it aloud, so put the term in the stem or a help card.",
    );

  switch (spec.family) {
    case Family.Choose: {
      const { data, key } = spec;
      const ids = data.options.map((o) => o.id);
      unique("data.options", ids);
      data.options.forEach((o, i) => {
        if (o.content.kind === "text") label(`data.options[${i}]`, o.content.text);
        if (o.content.kind === "image" && o.content.alt.trim() === "")
          err(`data.options[${i}]`, "missing_alt", "A picture option needs alt text.");
        if (o.content.kind === "pictures") {
          if (o.content.pictures.length === 0)
            err(
              `data.options[${i}]`,
              "no_pictures",
              "A pictures option needs at least one picture.",
            );
          if (o.content.pictures.some((p) => p.alt.trim() === ""))
            err(`data.options[${i}]`, "missing_alt", "Every picture in an option needs alt text.");
        }
      });
      if (data.options.length < 2)
        err("data.options", "too_few_options", "A choice needs at least two options.");
      if (data.layout === "binary" && data.options.length !== 2)
        err("data.options", "binary_needs_two", "A binary choice has exactly two options.");
      if (data.layout === "lettered" && data.options.length > 5)
        err("data.options", "too_many_options", "Lettered options go up to E.");
      if (data.layout === "grid" && data.options.length > 6)
        warn("data.options", "too_many_options", "More than six options crowd a child’s screen.");
      key.correct.forEach((id) => {
        if (!ids.includes(id))
          err("key.correct", "unknown_id", `The key names ${id}, which is not an option.`);
      });
      if (key.correct.length === 0)
        err("key.correct", "no_right_option", "At least one option must be right.");
      if (data.select === "one" && key.correct.length > 1)
        err("key.correct", "one_right_option", "A single choice has exactly one right option.");
      if (data.select === "many" && key.correct.length === ids.length)
        warn("key.correct", "all_right", "Every option is right, so nothing is asked.");
      // "None of these" (dl-w3.70.4): one at most, the last option, never an inline token,
      // and alone in the key when several may be picked. `why` is said after it is picked
      // right, so it belongs to a step whose answer it is.
      const nones = data.options.filter(isNoneOption).map((o) => o.id);
      if (nones.length > 1)
        err("data.options", "two_none_options", "A choice has one “none of these” option at most.");
      if (nones.length > 0 && data.options.at(-1)?.content.kind !== "none")
        err("data.options", "none_not_last", "“None of these” is the last option.");
      if (nones.length > 0 && (data.layout === "inline" || data.layout === "binary"))
        err(
          "data.layout",
          "none_in_layout",
          `A ${data.layout} choice has no “none of these” option.`,
        );
      if (key.correct.length > 1 && key.correct.some((id) => nones.includes(id)))
        err(
          "key.correct",
          "none_with_others",
          "“None of these” is right alone, never beside another option.",
        );
      if (key.why !== undefined) {
        label("key.why", key.why);
        if (!key.correct.some((id) => nones.includes(id)))
          err(
            "key.why",
            "why_without_none",
            "A why line belongs to a step whose answer is “none of these”.",
          );
      }
      for (const o of data.options) {
        // A contest task's say reads every option out, so naming the answer among them gives nothing away.
        if (key.correct.includes(o.id) && !data.stem?.text_replaces_say) {
          if (o.content.kind === "text") notSaid(o.content.text);
          if (o.content.kind === "number") notSaid(String(o.content.number));
        } else if (!key.correct.includes(o.id) && key.near?.[o.id] === undefined) {
          warn(
            `key.near.${o.id}`,
            "distractor_unexplained",
            `The distractor ${o.id} names no mistake it was built from.`,
          );
        }
      }
      // A line with its pick in place (Slots addendum section 1): one `{pick}` outside TeX, one pick.
      if (data.line !== undefined) {
        const picks = markerIds(data.line).filter((m) => m === PICK).length;
        if (picks !== 1)
          err(
            "data.line",
            "pick_marker",
            `The line holds the {${PICK}} marker ${picks} times: once, outside TeX.`,
          );
        if (data.select !== "one")
          err("data.line", "line_one_pick", "A line takes one pick in its place.");
        if (data.layout === "inline")
          err("data.line", "line_inline", "An inline choice is its own line: it takes no `line`.");
      }
      validateInline(spec, err, warn);
      break;
    }
    case Family.Enter: {
      const { data, key } = spec;
      if (key.accept.length === 0 || key.accept.some((a) => a.trim() === ""))
        err("key.accept", "no_accepted_form", "List at least one non-empty accepted form.");
      if (data.input === "number" && !data.decimal && key.accept.some((a) => !/^-?[0-9]+$/.test(a)))
        err("key.accept", "not_a_number", "A number entry accepts digits only.");
      // A decimal (dl-w3.70.7) is written with a point and read exactly (enter/exact.ts).
      if (
        data.input === "number" &&
        data.decimal &&
        key.accept.some((a) => !/^-?[0-9]*\.?[0-9]+$/.test(a) || parseDecimal(a) === null)
      )
        err(
          "key.accept",
          "not_a_decimal",
          "A decimal entry accepts a number written with digits and one point, such as 0.29.",
        );
      if (data.input !== "number" && data.decimal)
        err(
          "data.decimal",
          "decimal_on_text",
          "A decimal comma key applies to a number entry only.",
        );
      // A fraction (dl-w3.70.16): every accepted form a fraction the boxes can hold, the solution in a form the key takes.
      if (data.input === "fraction")
        fractionKeyProblems("key", key.accept, key.forms, data.whole === true, err);
      else {
        if (key.forms !== undefined || key.exact_terms !== undefined)
          err(
            "key.forms",
            "forms_on_text",
            "Accepted number forms and exact terms apply to a fraction entry only.",
          );
        if (data.whole !== undefined || data.simplify !== undefined)
          err(
            "data.input",
            "fraction_rule_on_text",
            "A whole-number box and a lowest-terms rule apply to a fraction entry only.",
          );
      }
      if (data.input !== "number" && key.tolerance !== undefined)
        err("key.tolerance", "tolerance_on_text", "A tolerance applies to numbers only.");
      // An expression key is compared by value and form (enter/expression.ts), so each form must parse and have the shape the key asks for.
      // An equation (dl-w3.70.17): every accepted form one equation, and the keypad's `=` on.
      if (data.input === "expression" && key.accept.some(isEquation)) {
        if (!data.equation)
          err(
            "data.equation",
            "equation_needs_key",
            "An equation key needs the keypad’s = sign: set equation.",
          );
        for (const a of key.accept)
          if (parseEquation(a) === null)
            err(
              "key.accept",
              "not_an_equation",
              `The accepted form “${a}” is not one equation of two expressions.`,
            );
        if (key.form !== undefined && key.form !== "any")
          err(
            "key.form",
            "form_on_equation",
            "An equation compares each side’s terms; it takes no form.",
          );
      } else if (data.input === "expression") {
        if (data.equation)
          err(
            "data.equation",
            "equation_without_key",
            "The keypad shows =, but the key is no equation.",
          );
        for (const a of key.accept) {
          const e = parseExpression(a);
          if (e === null)
            err(
              "key.accept",
              "not_an_expression",
              `The accepted form “${a}” does not read as an expression of numbers and signs.`,
            );
          else if (key.form !== undefined && key.form !== "any" && formOf(e) !== key.form)
            err(
              "key.form",
              "form_mismatch",
              `The accepted form “${a}” is not a ${key.form}, which the key asks for.`,
            );
        }
      } else if (key.form !== undefined)
        err("key.form", "form_on_text", "A required form applies to an expression only.");
      key.accept.forEach(notSaid);
      // A decimal is said with a comma in Polish (dl-w3.70.7).
      if (data.decimal)
        key.accept
          .filter((a) => a.includes("."))
          .forEach((a) => {
            notSaid(a.replace(".", ","));
          });
      validateText(spec, err);
      if (data.figure?.kind === "number_line") {
        lineProblems("data.figure", data.figure, err, warn);
        if (wholeCount(data.figure.marker - data.figure.min, data.figure.step) === null)
          err("data.figure.marker", "marker_off_tick", "The marker to read sits between ticks.");
      }
      // A ruler figure (dl-w3.51.4) measures a picture: the ruler needs a scale and a length, the picture its words, and the answer is a number.
      if (data.figure?.kind === "ruler") {
        const r = data.figure;
        if (data.input !== "number")
          err(
            "data.input",
            "ruler_needs_number",
            "A length read off a ruler is typed as a number.",
          );
        if (!(r.length > 0) || !(r.pixels_per_unit > 0))
          err(
            "data.figure",
            "ruler_scale",
            "A ruler needs a length in units and the picture pixels per unit, both above zero.",
          );
        if (r.ticks !== undefined && (!Number.isInteger(r.ticks) || r.ticks < 1))
          err(
            "data.figure.ticks",
            "ruler_ticks",
            "The marks per unit are a whole number, one or more.",
          );
        if (r.length * r.pixels_per_unit > r.picture.width * 2)
          warn("data.figure", "ruler_long", "The ruler is more than twice the picture’s width.");
        if (r.picture.alt.trim() === "")
          err("data.figure.picture", "missing_alt", "The picture under the ruler needs alt text.");
        else
          key.accept.forEach((a) => {
            if (
              new RegExp(
                `(^|[^\\p{L}\\p{N}])${a.trim()}\\s*${r.unit}($|[^\\p{L}\\p{N}])`,
                "iu",
              ).test(r.picture.alt)
            )
              err(
                "data.figure.picture",
                "key_in_alt",
                `The picture’s alt gives the length away (“${a} ${r.unit}”).`,
              );
          });
      }
      break;
    }
    case Family.Slots: {
      const { data, key } = spec;
      const markers = markerIds(data);
      const ids = data.gaps.map((g) => g.id);
      unique("data.gaps", ids);
      unique("data.template", markers);
      markers
        .filter((m) => !ids.includes(m))
        .forEach((m) => {
          err("data.template", "marker_without_gap", `The marker {${m}} has no gap.`);
        });
      ids
        .filter((id) => !markers.includes(id))
        .forEach((id) => {
          err(
            "data.gaps",
            "gap_without_marker",
            `The gap ${id} has no marker in the template or the table.`,
          );
        });
      // The fill order (paper-behaviour README §3.4) names every gap once.
      if (
        data.fill_order &&
        (data.fill_order.length !== ids.length ||
          new Set(data.fill_order).size !== ids.length ||
          data.fill_order.some((id) => !ids.includes(id)))
      )
        err(
          "data.fill_order",
          "fill_order_gaps",
          "The fill order names every gap once, and nothing else.",
        );
      // A gap on a picture (dl-w3.51.2) needs the picture, with its words, and a place on it.
      if (data.picture && data.picture.alt.trim() === "")
        err("data.picture", "missing_alt", "The picture to label needs alt text.");
      data.gaps.forEach((g, i) => {
        if (g.at === undefined) return;
        if (!data.picture)
          err(
            `data.gaps[${i}].at`,
            "at_without_picture",
            `The gap ${g.id} is placed, but the step has no picture.`,
          );
        else if (g.at.x < 0 || g.at.x > 100 || g.at.y < 0 || g.at.y > 100)
          err(
            `data.gaps[${i}].at`,
            "off_the_picture",
            `The gap ${g.id} sits outside the picture: x and y are percent, 0 to 100.`,
          );
      });
      if (data.picture && !data.gaps.some((g) => g.at !== undefined))
        warn(
          "data.picture",
          "picture_without_marker",
          "The picture has no gap placed on it, so there is nothing to label.",
        );
      if (spec.question_type === QuestionType.MoneyCount) moneyCountProblems(data, key, err); // lane E (dl-w3.61.6)
      if (data.table) {
        // A table draws as a grid (dl-w3.51.5): every row as wide as the header, and something in it.
        if (data.table.rows.length === 0)
          err("data.table", "empty_table", "The table has no rows.");
        const width = data.table.header.length;
        data.table.rows.forEach((row, i) => {
          if (row.length !== width)
            err(
              `data.table.rows[${i}]`,
              "ragged_table",
              `Row ${i + 1} has ${row.length} cells, but the header has ${width}.`,
            );
        });
      }
      columnProblems(data, key, err, warn);
      pyramidProblems(data, key, err, warn);
      if (ids.length === 0) err("data.gaps", "no_gaps", "A gap step needs at least one gap.");
      // The registry rule (Slots addendum section 1): one chosen gap and nothing typed is a tap on a tile.
      if (playsAsChoose(data))
        err(
          "data.gaps",
          "plays_as_choose",
          "One chosen gap and nothing typed plays as Choose: write it as a Choose step with its line.",
        );
      if (ids.length > MAX_GAPS)
        warn("data.gaps", "too_many_gaps", `More than ${MAX_GAPS} gaps crowd a child’s screen.`);
      data.gaps.forEach((g, i) => {
        const k = key.gaps[g.id];
        if (k === undefined) {
          err(`key.gaps.${g.id}`, "missing_key", `The gap ${g.id} has no key.`);
          return;
        }
        if (k.kind !== g.kind) {
          err(
            `key.gaps.${g.id}`,
            "key_kind",
            `The gap ${g.id} is ${g.kind}, but its key is ${k.kind}.`,
          );
          return;
        }
        if (g.kind === Family.Choose && k.kind === Family.Choose) {
          if (g.options.length < 2)
            err(
              `data.gaps[${i}]`,
              "too_few_options",
              `The gap ${g.id} needs at least two options.`,
            );
          g.options.forEach((o, j) => {
            label(`data.gaps[${i}].options[${j}]`, o.label);
          });
          if (k.correct.length === 0 || k.correct.some((c) => !g.options.some((o) => o.id === c)))
            err(`key.gaps.${g.id}`, "unknown_id", `The gap ${g.id}'s key names no option of it.`);
        }
        if (
          g.kind === Family.Enter &&
          k.kind === Family.Enter &&
          (k.accept.length === 0 || k.accept.some((a) => a.trim() === ""))
        )
          err(`key.gaps.${g.id}`, "no_accepted_form", `The gap ${g.id} lists no accepted form.`);
        // A decimal gap (dl-w3.70.7): a number gap whose answers read as decimals.
        if (g.kind === Family.Enter && g.decimal && g.input !== "number")
          err(
            `data.gaps[${i}].decimal`,
            "decimal_on_text",
            `The gap ${g.id} is text, so it takes no decimal comma key.`,
          );
        if (
          g.kind === Family.Enter &&
          k.kind === Family.Enter &&
          g.decimal &&
          k.accept.some((a) => !/^-?[0-9]*\.?[0-9]+$/.test(a) || parseDecimal(a) === null)
        )
          err(
            `key.gaps.${g.id}`,
            "not_a_decimal",
            `The gap ${g.id} accepts a number written with digits and one point, such as 0.29.`,
          );
        // A fraction gap (dl-w3.70.16), as an Enter fraction.
        if (g.kind === Family.Enter && k.kind === Family.Enter && g.input === "fraction")
          fractionKeyProblems(`key.gaps.${g.id}`, k.accept, k.forms, g.whole === true, err);
      });
      // lane D (dl-w3.61.5): a clock to read (clock_read).
      clockReadProblems(data, key, err);
      // end lane D
      break;
    }
    case Family.Sequence: {
      const { data, key } = spec;
      if (key.orders.length === 0)
        err("key.orders", "missing_key", "List at least one accepted order.");
      if (tileMode(data)) {
        // Tile mode (dl-w3.51.9): tiles may read the same (two `8` tiles), the places are
        // counted, and every accepted order names a tile for each place.
        const ids = data.tiles.map((t) => t.id);
        unique("data.tiles", ids);
        data.tiles.forEach((tile, i) => {
          label(`data.tiles[${i}]`, tile.text);
        });
        if (ids.length < 2)
          err("data.tiles", "too_few_items", "A tile bank needs at least two tiles.");
        if (ids.some((id) => slotIndex(id) !== null))
          err(
            "data.tiles",
            "duplicate_id",
            "A tile id of the form s1 is a place id: name tiles otherwise.",
          );
        const slots = slotCount(data, key);
        if (slots < 2) err("data.slots", "too_few_slots", "An order needs at least two places.");
        key.orders.forEach((order, i) => {
          if (order.length !== slots || order.some((id) => !ids.includes(id)))
            err(
              `key.orders[${i}]`,
              "not_an_order",
              "An accepted order names a tile for every place.",
            );
        });
      } else {
        const ids = data.items.map((i) => i.id);
        unique("data.items", ids);
        data.items.forEach((item, i) => {
          label(`data.items[${i}]`, item.text);
        });
        if (ids.length < 3)
          err("data.items", "too_few_items", "An order needs at least three items.");
        const texts = data.items.map((i) => i.text.trim());
        // Twin cards (Khan's sorter, dl-w3.70.12) are interchangeable, so they are judged
        // only when the key accepts every swap of them; otherwise the order cannot be judged.
        if (new Set(texts).size !== texts.length && !coversTwinSwaps(ids, texts, key.orders))
          err(
            "data.items",
            "duplicate_text",
            "Two items read the same, so their order cannot be judged unless every swap of them is an accepted order.",
          );
        key.orders.forEach((order, i) => {
          if (order.length !== ids.length || ids.some((id) => !order.includes(id)))
            err(`key.orders[${i}]`, "not_an_order", "An accepted order must hold every item once.");
        });
        if (key.orders.some((order) => order.join("\u0000") === ids.join("\u0000")))
          warn(
            "data.items",
            "starts_solved",
            "The cards are listed in an accepted order, so the learner starts on the answer.",
          );
      }
      break;
    }
    case Family.Group: {
      const { data, key } = spec;
      const groupIds = data.groups.map((g) => g.id);
      const itemIds = data.items.map((i) => i.id);
      unique("data.groups", groupIds);
      unique("data.items", itemIds);
      // A card that is only a picture has no label: its picture's words stand in (group/model.ts GroupCard).
      const card = (path: string, c: { label: string; picture?: { alt: string } | undefined }) => {
        if (c.picture !== undefined && c.picture.alt.trim() === "")
          err(`${path}.picture`, "missing_alt", "A picture card needs alt text.");
        if (c.picture === undefined || c.label.trim() !== "") label(path, c.label);
      };
      data.groups.forEach((g, i) => {
        card(`data.groups[${i}]`, g);
      });
      data.items.forEach((item, i) => {
        card(`data.items[${i}]`, item);
      });
      if (groupIds.length < 2)
        err("data.groups", "too_few_groups", "Sorting needs at least two groups.");
      if (layoutOf(data, spec.question_type) === "columns") {
        if (
          data.each_item !== "one" ||
          data.groups.length !== data.items.length ||
          data.groups.some((g) => g.capacity !== 1)
        )
          err(
            "data.layout",
            "not_pairs",
            "Two columns pair each item with one group: as many groups as items, each taking one card, one group per item.",
          );
        else if (data.items.every((item, i) => key.items[item.id]?.[0] === data.groups[i]?.id))
          warn(
            "data.groups",
            "starts_solved",
            "The groups are listed in the key’s order, so the right column starts on the answer.",
          );
      }
      for (const id of itemIds) {
        const groups = key.items[id];
        if (groups === undefined || groups.length === 0)
          err(`key.items.${id}`, "item_unmapped", `The item ${id} belongs to no group in the key.`);
        else if (groups.some((g) => !groupIds.includes(g)))
          err(`key.items.${id}`, "unknown_id", `The item ${id} names a group that does not exist.`);
        else if (data.each_item === "one" && groups.length > 1)
          err(
            `key.items.${id}`,
            "one_group_each",
            `The item ${id} is in several groups, but each item takes one.`,
          );
      }
      for (const g of data.groups) {
        const count = itemIds.filter((id) => key.items[id]?.includes(g.id)).length;
        if (g.capacity !== undefined && count > g.capacity)
          err(
            `data.groups`,
            "over_capacity",
            `The group ${g.id} takes ${g.capacity}, but the key puts ${count} in it.`,
          );
      }
      break;
    }
    case Family.Place: {
      const { data, key } = spec;
      if (data.surface !== key.surface) {
        err(
          "key.surface",
          "key_kind",
          `The surface is ${data.surface}, but the key is for ${key.surface}.`,
        );
        break;
      }
      if (data.surface === Surface.NumberLine && key.surface === Surface.NumberLine) {
        lineProblems("data", data, err, warn);
        if (data.tick_label === "non-reduced" && commonDenominator(data, data.labelled) === null)
          err(
            "data.tick_label",
            "tick_label_unfit",
            "A non-reduced line writes every tick over one denominator, so every tick must be a small fraction.",
          );
        // Tick control (dl-w3.70.19): whole parts from 1 up, the step one of them, the answer
        // on the ticks of some count of parts, and no finer snap or labels the parts would move.
        const d = data.divisions;
        if (d !== undefined) {
          if (!Number.isInteger(d.min) || !Number.isInteger(d.max) || d.min < 1 || d.max < d.min)
            err(
              "data.divisions",
              "bad_divisions",
              "The parts run from a whole number of at least 1 up to one no smaller.",
            );
          else if (
            partsOf(data) < d.min ||
            partsOf(data) > d.max ||
            wholeCount(data.max - data.min, data.step) === null
          )
            err(
              "data.step",
              "step_off_divisions",
              "The line starts cut into a number of parts the stepper can show.",
            );
          if (data.snap !== undefined)
            err(
              "data.snap",
              "snap_with_divisions",
              "A line with a parts stepper snaps to its ticks only.",
            );
        }
        if (key.value < data.min || key.value > data.max)
          err("key.value", "off_the_line", "The answer is not on the line.");
        else if (
          d !== undefined
            ? partsHolding(data, d, key.value) === null
            : wholeCount(key.value - data.min, unitOf(data)) === null
        )
          err(
            "key.value",
            "key_off_snap",
            "The answer is not a position the marker can take: it must sit a whole number of snaps from min.",
          );
        notSaid(String(key.value));
      }
      if (data.surface === Surface.Image && key.surface === Surface.Image) {
        if (data.image_alt.trim() === "")
          err("data.image_alt", "missing_alt", "The picture needs alt text.");
        if (data.taps < 1) err("data.taps", "no_taps", "Ask for at least one tap.");
        if (key.targets.length === 0)
          err("key.targets", "missing_key", "Draw at least one target region.");
        const regions = [...key.targets, ...(key.near ?? [])];
        unique(
          "key",
          regions.map((r) => r.id),
        );
        regions.forEach((r) => {
          if (r.polygon.length < 3)
            err(`key.${r.id}`, "open_polygon", `The region ${r.id} needs at least three points.`);
          if (r.polygon.some((p: Point) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1))
            err(`key.${r.id}`, "outside_image", `The region ${r.id} leaves the picture.`);
        });
      }
      if (
        data.surface === Surface.Grid &&
        key.surface === Surface.Grid &&
        (key.rows > data.size || key.cols > data.size)
      )
        err("data.size", "grid_too_small", "The grid is smaller than the answer.");
      if (data.surface === Surface.Bars && key.surface === Surface.Bars) {
        const ids = data.categories.map((c) => c.id);
        unique("data.categories", ids);
        data.categories.forEach((c, i) => {
          label(`data.categories[${i}]`, c.label);
          if (data.kind === "picture" && c.picture === undefined)
            warn(
              `data.categories[${i}].picture`,
              "no_picture",
              `The category ${c.id} has no picture, so it stacks squares.`,
            );
          if (c.picture !== undefined && "src" in c.picture && c.picture.alt.trim() === "")
            err(`data.categories[${i}].picture`, "missing_alt", "A graph picture needs alt text.");
        });
        if (ids.length < 2)
          err("data.categories", "too_few_categories", "A graph needs at least two categories.");
        if (ids.length > MAX_CATEGORIES)
          warn(
            "data.categories",
            "too_many_categories",
            `More than ${MAX_CATEGORIES} bars leave each one too narrow for a finger.`,
          );
        if (!(data.max > 0) || !(data.step > 0) || wholeCount(data.max, data.step) === null)
          err(
            "data",
            "bad_scale",
            "A graph needs a positive max and a positive step that divides it.",
          );
        else {
          const tick = tickOf(data);
          if (
            !(tick > 0) ||
            wholeCount(tick, data.step) === null ||
            wholeCount(data.max, tick) === null
          )
            err(
              "data.tick",
              "tick_off_scale",
              "The tick must be a whole number of steps and divide max.",
            );
          else if (data.kind === "picture" && tick !== data.step)
            err(
              "data.step",
              "picture_step",
              "A picture graph draws whole pictures: the step must equal the tick.",
            );
          for (const id of ids) {
            const h = key.heights[id];
            if (h === undefined)
              err(`key.heights.${id}`, "missing_key", `The bar ${id} has no height in the key.`);
            else if (h < 0 || h > data.max)
              err(`key.heights.${id}`, "off_the_graph", `The bar ${id} is taller than the graph.`);
            else if (wholeCount(h, data.step) === null)
              err(
                `key.heights.${id}`,
                "key_off_snap",
                `The bar ${id} is not a height a bar can take: it must be a whole number of steps.`,
              );
            const s = data.starting?.[id];
            if (s !== undefined && (s < 0 || s > data.max || wholeCount(s, data.step) === null))
              err(
                `data.starting.${id}`,
                "starting_off_snap",
                `The starting bar ${id} is not a height a bar can take.`,
              );
          }
        }
        Object.keys(key.heights)
          .filter((id) => !ids.includes(id))
          .forEach((id) => {
            err(`key.heights.${id}`, "unknown_id", `The key names ${id}, which is not a category.`);
          });
        graphKindProblems(data, err, warn);
      }
      // lane D (dl-w3.61.5): the clock's checks.
      if (data.surface === Surface.Clock && key.surface === Surface.Clock)
        clockProblems(data, key, err, warn);
      // lane E (dl-w3.61.6): money_pay.
      if (data.surface === Surface.Coins && key.surface === Surface.Coins)
        coinsProblems(data, key, err, warn);
      // lane F (dl-w3.61.7): place/fraction.ts and place/areaModel.ts.
      if (data.surface === Surface.Fraction && key.surface === Surface.Fraction)
        fractionProblems(data, key, err, warn);
      if (data.surface === Surface.Grid && key.surface === Surface.Grid)
        areaModelProblems(data, key, err);
      break;
    }
    case Family.Explain: {
      const { key } = spec;
      if (key.criteria.length === 0)
        err(
          "key.criteria",
          "no_criteria",
          "An explanation needs criteria written before the task.",
        );
      unique(
        "key.criteria",
        key.criteria.map((c) => c.id),
      );
      key.criteria.forEach((c, i) => {
        label(`key.criteria[${i}]`, c.text);
        if (c.cite.trim() === "")
          err(`key.criteria[${i}]`, "uncited", `The criterion ${c.id} names no source.`);
      });
      if (key.criteria_version.trim() === "")
        err("key.criteria_version", "unversioned", "The criteria need a version.");
      const min = spec.data.min_words;
      if (min !== undefined && (!Number.isInteger(min) || min < 1))
        err("data.min_words", "bad_minimum", "The soft minimum is a count of words, one at least.");
      if (min !== undefined && min > 12)
        warn(
          "data.min_words",
          "long_minimum",
          "A soft minimum over twelve words asks a child for a paragraph.",
        );
      if (spec.help?.twin)
        err(
          "help.twin",
          "no_twin",
          "An explanation has no twin: the last rung is an example explanation (docs/18 §3a).",
        );
      break;
    }
  }
  if (spec.help) helpProblems(spec, err, warn);
  termProblems(spec, err);
  referenceProblems(spec, err, label);
  return out;
}

/** A fraction key (dl-w3.70.16): each accepted form a whole number, a fraction or a mixed number
 * the stacked boxes can hold (a mixed number needs the whole number's box), the forms Perseus's,
 * and the solution shown, the first form, in a form the key takes. */
function fractionKeyProblems(
  path: string,
  accept: string[],
  forms: string[] | undefined,
  whole: boolean,
  err: Report,
): void {
  const read = accept.map(parseFraction);
  if (read.some((r) => r === null))
    err(
      `${path}.accept`,
      "not_a_fraction",
      "A fraction entry accepts a whole number, a fraction such as 3/4, or a mixed number such as 2 1/4.",
    );
  if (!whole && read.some((r) => r?.form === "mixed"))
    err(
      `${path}.accept`,
      "mixed_needs_whole",
      "A mixed number needs the whole number’s box: set whole.",
    );
  if (forms?.some((f) => !(NUMBER_FORMS as readonly string[]).includes(f)))
    err(`${path}.forms`, "unknown_form", `The forms are ${NUMBER_FORMS.join(", ")}.`);
  const first = read[0];
  if (first && forms && !formAllowed(forms as never, first.form))
    err(
      `${path}.accept`,
      "solution_form",
      `The solution ${accept[0]} is not in a form the key accepts.`,
    );
}

/** True when every accepted order, with any two cards that read the same swapped, is also
 * accepted (dl-w3.70.12): twins are then interchangeable, as Perseus's sorter scores them. */
function coversTwinSwaps(
  ids: readonly string[],
  texts: readonly string[],
  orders: readonly (readonly string[])[],
): boolean {
  const twins = ids.flatMap((a, i) =>
    ids
      .slice(i + 1)
      .filter((_, k) => texts[i + 1 + k] === texts[i])
      .map((b) => [a, b] as const),
  );
  const accepted = new Set(orders.map((o) => o.join("\u0000")));
  return orders.every((order) =>
    twins.every(([a, b]) => {
      const i = order.indexOf(a);
      const j = order.indexOf(b);
      if (i === -1 || j === -1) return false;
      const swapped = [...order];
      swapped[i] = b;
      swapped[j] = a;
      return accepted.has(swapped.join("\u0000"));
    }),
  );
}

/** A glossary term's meaning never holds the answer (dl-w3.56): the same check as key_in_help,
 * over every text of the step and its help, the twin aside (it has its own key). */
function termProblems(spec: FamilySpec, err: Report): void {
  const answers = answerWords(spec);
  if (answers.length === 0) return;
  const walk = (v: unknown, path: string): void => {
    if (typeof v === "string") {
      for (const { word, meaning } of termsIn(v)) {
        const given = givesAway(meaning, answers);
        if (given !== null)
          err(path, "key_in_term", `The meaning of “${word}” gives the answer “${given}”.`);
      }
    } else if (Array.isArray(v))
      v.forEach((x, i) => {
        walk(x, `${path}[${i}]`);
      });
    else if (v !== null && typeof v === "object")
      for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
  };
  walk(spec.data, "data");
  if (spec.help) {
    const { twin: _twin, ...rest } = spec.help;
    walk(rest, "help");
  }
}

/** A thousands separator between digits (`1{,}000`, `5,280`), dropped before the key check. */
const DIGIT_GROUP = /(?<=\d)(?:\{,\}|,|\\,)(?=\d{3}(?!\d))/g;

/** The relation signs a comparison answers with. A reference sheet writes `=` on every row, so a
 * sign never counts as the sheet giving the answer; numbers stay strict (owner, 2026-10-25,
 * dl-w3.70.8). The converter's RELATION_SIGNS is the same set. */
const RELATION_SIGNS = new Set(["=", "<", ">"]);
const TEX_RELATION: Record<string, string> = { "\\lt": "<", "\\gt": ">", "&lt;": "<", "&gt;": ">" };

function isRelationSign(word: string): boolean {
  const bare = word
    .trim()
    .replace(/^\$+|\$+$/g, "")
    .trim();
  return RELATION_SIGNS.has(TEX_RELATION[bare] ?? bare);
}

/** A stem's reference sheet (stem/model.ts StemReference, dl-w3.70.8) has a prompt and words, and
 * never holds the answer: the page holds it, open or not, before the answer is committed (ruling
 * 05). The same check as key_in_help, less the relation signs; the converter
 * (scripts/khan/to_family.py) refuses such an item before it gets here. */
function referenceProblems(
  spec: FamilySpec,
  err: Report,
  label: (path: string, text: string) => void,
): void {
  const reference = (spec.data as { stem?: StemData }).stem?.reference;
  if (reference === undefined) return;
  label("data.stem.reference.prompt", reference.prompt);
  label("data.stem.reference.text", reference.text);
  const given = givesAway(
    reference.text.replace(DIGIT_GROUP, ""),
    answerWords(spec).filter((w) => !isRelationSign(w)),
  );
  if (given !== null)
    err("data.stem.reference", "key_in_reference", `The reference gives the answer “${given}”.`);
}

/** The ids help may name: options, gaps, items, groups and a graph's bars. */
function partIds(spec: FamilySpec): string[] {
  switch (spec.family) {
    case Family.Choose:
      return spec.data.options.map((o) => o.id);
    case Family.Slots:
      return spec.data.gaps.map((g) => g.id);
    case Family.Sequence:
      if (tileMode(spec.data))
        return [
          ...spec.data.tiles.map((t) => t.id),
          ...Array.from({ length: slotCount(spec.data, spec.key) }, (_, i) => slotId(i + 1)),
        ];
      return spec.data.items.map((i) => i.id);
    case Family.Group:
      return [...spec.data.items.map((i) => i.id), ...spec.data.groups.map((g) => g.id)];
    case Family.Place:
      // lane D (dl-w3.61.5): a clock's parts are its hands.
      if (spec.data.surface === Surface.Clock) return ["h", "m"];
      // end lane D
      return spec.data.surface === Surface.Bars ? spec.data.categories.map((c) => c.id) : [];
    default:
      return [];
  }
}

type Report = (path: string, rule: string, message: string) => void;

/** A number line's scale (dl-w3.55): min below max, a positive step that divides the line, and a
 * snap, when given, that divides the step. A step that leaves a short last interval is a warning:
 * the line still draws, its last tick below max. */
function lineProblems(
  path: string,
  line: { min: number; max: number; step: number; snap?: number | undefined },
  err: Report,
  warn: Report,
): void {
  if (!(line.min < line.max) || !(line.step > 0)) {
    err(path, "bad_scale", "The line needs min below max and a positive step.");
    return;
  }
  if (wholeCount(line.max - line.min, line.step) === null)
    warn(
      `${path}.step`,
      "step_off_line",
      "The step does not divide the line, so the last tick sits below max.",
    );
  if (line.snap !== undefined) {
    if (!(line.snap > 0)) err(`${path}.snap`, "bad_snap", "A snap must be positive.");
    else if (wholeCount(line.step, line.snap) === null)
      err(
        `${path}.snap`,
        "snap_off_step",
        "The snap must divide the step, so every tick is a position the marker can take.",
      );
  }
}

/** The help ladder's checks (help.ts): rungs 1 and 2 never give the answer away, a picture has
 * its words, and the twin is the same exercise type with no ladder of its own. */
function helpProblems(spec: FamilySpec, err: Report, warn: Report): void {
  const help = spec.help ?? {};
  const answers = answerWords(spec);
  const card = (path: string, c: HelpCard) => {
    if (c.text.trim() === "") err(path, "empty_label", "A help card has no words.");
    if (c.picture && c.picture.alt.trim() === "")
      err(`${path}.picture`, "missing_alt", "A help picture needs alt text.");
    const given = givesAway(c.text, answers);
    if (given !== null) err(path, "key_in_help", `This help card gives the answer “${given}”.`);
  };
  if (help.look) card("help.look", help.look);
  if (help.boost) card("help.boost", help.boost);
  for (const [cls, c] of Object.entries(help.boost_by_mistake ?? {}))
    card(`help.boost_by_mistake.${cls}`, c);
  if (help.worked?.some((line) => line.trim() === ""))
    err("help.worked", "empty_label", "A worked line is empty.");
  // Rung 3 as written hides the answer with its own blank, so key_in_help is not applied to it.
  if (help.almost?.some((line) => line.trim() === ""))
    err("help.almost", "empty_label", "An almost-there line is empty.");
  if (help.almost && !help.almost.some((line) => line.includes("□")))
    warn(
      "help.almost",
      "almost_without_blank",
      "Rung 3 as written has no □, so it leaves the learner nothing to fill.",
    );
  // Khan's hints: each has words and its pictures have theirs. The last gives the answer by
  // design. An earlier one that prints an answer word is not refused: help.ts holds it, and every
  // hint after it, behind the one-attempt gate (hintsOnLadder, stackFree). The warning says so,
  // for whoever rewrites the hint (the owner, dl-w3.54).
  help.hints?.forEach((h, i, all) => {
    if (h.text.trim() === "") err(`help.hints[${i}]`, "empty_label", "A hint has no words.");
    h.pictures?.forEach((p, j) => {
      if (p.alt.trim() === "" && p.decorative !== true)
        err(`help.hints[${i}].pictures[${j}]`, "missing_alt", "A hint picture needs alt text.");
    });
    const given = i < all.length - 1 ? givesAway(h.text, answers) : null;
    if (given !== null)
      warn(
        `help.hints[${i}]`,
        "hint_leaks_early",
        `Hint ${i + 1} gives the answer “${given}”, so it and every hint after it wait for one attempt.`,
      );
  });
  const parts = partIds(spec);
  for (const id of [...(help.look?.focus ?? []), ...(help.give ?? [])])
    if (!parts.includes(id))
      err("help", "unknown_part", `Help names ${id}, which is no part of this step.`);
  if (help.give && help.give.length > 0) {
    if (spec.family === Family.Choose) {
      if (spec.data.layout === "binary")
        err("help.give", "gives_the_answer", "Taking an option away from two leaves the answer.");
      if (spec.data.select === "many")
        err(
          "help.give",
          "gives_the_answer",
          "Taking options away from a pick-all says how many are left to find.",
        );
      if (help.give.some((id) => spec.key.correct.includes(id)))
        err(
          "help.give",
          "gives_the_answer",
          "Only a distractor can be taken away, never a right option.",
        );
      if (spec.data.options.length - help.give.length < 2)
        err("help.give", "gives_the_answer", "At least two options must stay.");
    } else if (
      spec.family === Family.Slots ||
      spec.family === Family.Sequence ||
      spec.family === Family.Group
    ) {
      const answerable =
        spec.family === Family.Group
          ? spec.data.items.length
          : spec.family === Family.Sequence && tileMode(spec.data)
            ? slotCount(spec.data, spec.key)
            : parts.length;
      if (
        spec.family === Family.Sequence &&
        tileMode(spec.data) &&
        help.give.some((id) => slotIndex(id) === null)
      )
        err(
          "help.give",
          "unknown_part",
          "Rung 2 fills places: give place ids (s1 is first), not tile ids.",
        );
      if (help.give.length >= answerable)
        err("help.give", "gives_the_answer", "Rung 2 gives a part away, never every part.");
      if (
        spec.family === Family.Group &&
        help.give.some((id) => spec.data.groups.some((g) => g.id === id))
      )
        err("help.give", "unknown_part", "Rung 2 places items: give item ids, not group ids.");
    } else if (spec.family === Family.Place && spec.data.surface === Surface.Bars) {
      if (help.give.length >= spec.data.categories.length)
        err("help.give", "gives_the_answer", "Rung 2 draws a bar, never every bar.");
    } else {
      err(
        "help.give",
        "nothing_to_give",
        `${spec.family} gives no part away: write a smaller step instead.`,
      );
    }
  }
  if (help.twin) {
    if (help.twin.family !== spec.family || help.twin.question_type !== spec.question_type)
      err("help.twin", "twin_not_alike", "The twin must be the same exercise type as the step.");
    if ((help.twin as FamilySpec).help)
      err("help.twin", "twin_has_help", "A twin has no help of its own: it is the last rung.");
    if (help.twin.id === spec.id) err("help.twin.id", "duplicate_id", "The twin needs its own id.");
  }
  if (help.twin && !help.worked)
    warn(
      "help.worked",
      "twin_without_worked",
      "A twin with no worked solution asks again without showing how.",
    );
}
