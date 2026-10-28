/**
 * The checks for an inline choice (mark_numbers, dl-w3.61.2), called from validate.ts. The text in
 * `stem.text` is the answer: every option sits in it at its `{oN}` marker, and every marker there is
 * an option. Marking is several picks with a Check button. A text where every token is right leaves
 * nothing to leave out, so the step asks nothing (a warning).
 */

import type { Family } from "../names.ts";
import { markerIds } from "../slots/model.ts";
import type { SpecOf } from "../types.ts";

type Report = (path: string, rule: string, message: string) => void;

export function validateInline(
  spec: SpecOf<typeof Family.Choose>,
  err: Report,
  warn: Report,
): void {
  const { data, key } = spec;
  if (data.layout !== "inline") {
    if (data.tokens !== undefined)
      err("data.tokens", "tokens_not_inline", "Tappable words apply to an inline text only.");
    return;
  }
  if (data.select !== "many")
    err("data.select", "inline_needs_many", "Marking a text takes several picks: select many.");
  const text = data.stem?.text ?? "";
  if (text.trim() === "") {
    err(
      "data.stem.text",
      "inline_needs_text",
      "An inline choice needs the text it marks, in stem.text.",
    );
    return;
  }
  if (data.stem?.text_replaces_say)
    err(
      "data.stem.text_replaces_say",
      "inline_text_is_answer",
      "The inline text is the answer, drawn under say: it cannot replace say.",
    );
  const markers = markerIds(text);
  const ids = data.options.map((o) => o.id);
  for (const id of ids)
    if (!markers.includes(id))
      err(
        "data.stem.text",
        "option_not_marked",
        `The option ${id} has no {${id}} marker in the text.`,
      );
  for (const m of markers)
    if (!ids.includes(m))
      err("data.stem.text", "unknown_marker", `The marker {${m}} names no option.`);
  if (markers.some((m, i) => markers.indexOf(m) !== i))
    err("data.stem.text", "duplicate_marker", "An option is marked twice in the text.");
  data.options.forEach((o, i) => {
    if (o.content.kind !== "text" && o.content.kind !== "number")
      err(`data.options[${i}]`, "inline_token_kind", "A token in a text is words or a number.");
  });
  if (key.correct.length === ids.length)
    warn(
      "key.correct",
      "nothing_to_leave_out",
      "Every token is needed, so nothing is left out and the step asks nothing.",
    );
}
