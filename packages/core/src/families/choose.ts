import type {
  ChooseData,
  ChooseKey,
  ChooseOption,
  ChooseValue,
  PartMark,
  PartVerdict,
  Verdict,
} from "@jadwigo/contracts";

/**
 * The Choose judge. One option: right when it is the correct one, and its class is the one the
 * author wrote for that option (`near`), else `other_wrong`. Several options: every option is a
 * part. A picked distractor is `wrong_pick` (or its `near` class), an unpicked right one is
 * `missed_option`. Nothing is subtracted: each part is its own evidence (ClassTime subtracts the
 * distractors picked; dl records them instead, classtime-data-model.md §3).
 *
 * Marks after a miss (the marks rule): one option marks the option tried, which the verdict has
 * already said is not the answer. Several options mark only the distractors picked. A miss that is
 * only a missed option marks the whole step, because marking a missed option would show it is right.
 *
 * Ported from david-learns `frontend/src/families/choose/judge.ts`, with `isNoneOption` and
 * `isWordToken` from `choose/model.ts`.
 */

/** The "none of these" option, if the step has one (validate.ts keeps it last and alone). */
const isNoneOption = (o: ChooseOption): boolean => o.content.kind === "none";

/** A plain word picked in an inline text under `tokens: 'words'`: `w:<n>`, never an option id. */
const WORD_TOKEN = /^w:\d+$/;
const isWordToken = (id: string): boolean => WORD_TOKEN.test(id);

const OTHER: Verdict = { correct: false, mistake_class: "other_wrong", parts: [] };

/** The author's class for an option id, read only from the near table's own keys. */
const ownNear = (
  near: Readonly<Record<string, string>> | undefined,
  id: string,
): string | undefined => (near !== undefined && Object.hasOwn(near, id) ? near[id] : undefined);

function readChosen(value: unknown): string[] | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const chosen = (value as { chosen?: unknown }).chosen;
  return Array.isArray(chosen) && chosen.every((x) => typeof x === "string") ? chosen : null;
}

export function judgeChoose(data: ChooseData, key: ChooseKey, value: unknown): Verdict {
  const read = readChosen(value);
  if (read === null) return OTHER;
  // Inline with every word tappable (dl-w3.61.2): a plain word stays in the answer, unjudged.
  const inline = data.layout === "inline";
  const chosen = inline ? read.filter((id) => !isWordToken(id)) : read;
  const ids = new Set(data.options.map((o) => o.id));
  if (chosen.some((id) => !ids.has(id)) || new Set(chosen).size !== chosen.length) return OTHER;
  const right = new Set(key.correct);

  if (data.select === "one") {
    const [id] = chosen;
    if (chosen.length !== 1 || id === undefined) return OTHER;
    if (right.has(id)) return { correct: true, mistake_class: null, parts: [] };
    return { correct: false, mistake_class: ownNear(key.near, id) ?? "other_wrong", parts: [] };
  }

  // "None of these" stands alone (dl-w3.70.4): picked beside another option, the answer says two
  // things at once and is not one the page lets a child commit.
  const none = data.options.filter(isNoneOption).map((o) => o.id);
  if (chosen.length > 1 && chosen.some((id) => none.includes(id))) return OTHER;

  const picked = new Set(chosen);
  const parts = data.options.map((o): PartVerdict => {
    const isPicked = picked.has(o.id);
    if (isPicked === right.has(o.id)) return { id: o.id, correct: true, mistake_class: null };
    if (isPicked)
      return {
        id: o.id,
        correct: false,
        mistake_class: ownNear(key.near, o.id) ?? (inline ? "took_unneeded_number" : "wrong_pick"),
      };
    return {
      id: o.id,
      correct: false,
      mistake_class: inline ? "missed_needed_number" : "missed_option",
    };
  });
  // Inline (dl-w3.61.2): a number taken that the answer does not need is the step's class before
  // one left out, wherever it sits in the text: it is the mistake distractor numbers are there for.
  const firstWrong =
    (inline ? parts.find((p) => !p.correct && picked.has(p.id)) : undefined) ??
    parts.find((p) => !p.correct);
  return {
    correct: firstWrong === undefined,
    mistake_class: firstWrong?.mistake_class ?? null,
    parts,
  };
}

export function chooseMarks(data: ChooseData, value: unknown, verdict: Verdict): PartMark[] | null {
  if (verdict.correct) return null;
  const chosen = readChosen(value) ?? [];
  if (data.select === "one") {
    const [id] = chosen;
    return chosen.length === 1 && id !== undefined ? [{ id, correct: false }] : null;
  }
  const wrongPicks = verdict.parts.filter((p) => !p.correct && chosen.includes(p.id));
  return wrongPicks.length > 0 ? wrongPicks.map(({ id }) => ({ id, correct: false })) : null;
}

export function chooseSolution(key: ChooseKey): ChooseValue {
  return { chosen: [...key.correct] };
}
