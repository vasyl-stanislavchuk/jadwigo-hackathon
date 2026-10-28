import type {
  Gap,
  GapKey,
  PartMark,
  PartVerdict,
  SlotsData,
  SlotsKey,
  SlotsValue,
  Verdict,
} from "@jadwigo/contracts";
import { enterClass, letterParts, matchesForm } from "../enter/judge.ts";
import { columnBlank } from "./column.ts";
import { markerIds } from "./model.ts";

/**
 * The Gaps judge: every gap is a part, judged on its own in reading order. A typed gap uses the
 * Enter rules (families/enter/judge.ts); a chosen gap is right when it is an accepted option. A
 * missed gap takes, in order: the author's `near` class for that entry, the key's number rule,
 * `gap_swap` when the entry is another gap's accepted answer, else `other_wrong`. The step's class is
 * its first missed gap's. Adapted from the fill_gaps design session's draft (dl-w3.30), re-keyed so
 * a chosen gap's value is an option id.
 *
 * A column (dl-w3.61.4, families/slots/column.ts) reads an empty small cell as what it stands for (no
 * carry, a digit left as written), and a missed cell no near miss names is `fact_error`: in a
 * column every cell is a one-digit fact, and a digit that belongs in another cell is no swap.
 *
 * Marks: every gap, right or missed, so the right ones stay and the missed ones are marked. A typed
 * word gap missed by an accent or one slipped letter also has its letters marked, `<gap>.l<n>`, as
 * the Enter field does (Enter addendum 3.6): only those letters are drawn, and the gap stays paper.
 *
 * A fraction gap under `simplify: 'required'` is judged as an Enter fraction is (Enter addendum
 * 3.4): one equal to its key but not in lowest terms is right. The playground then asked for it
 * more simply (slotsNudge); v0 has no such ask on the wire, so that is not ported.
 *
 * A gap the key has no entry for is a miss, `other_wrong`, never a throw: the validator refuses
 * such a step, and a judge reads anything.
 *
 * Ported from david-learns `frontend/src/families/slots/judge.ts`.
 */

function readGaps(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const gaps = (value as { gaps?: unknown }).gaps;
  return gaps !== null && typeof gaps === "object" && !Array.isArray(gaps)
    ? (gaps as Record<string, unknown>)
    : null;
}

function accepts(gap: Gap, key: GapKey | undefined, entry: string): boolean {
  if (key === undefined) return false;
  if (gap.kind === "choose" || key.kind === "choose")
    return key.kind === "choose" && key.correct.includes(entry);
  return (
    entry.trim() !== "" &&
    key.accept.some((a) => matchesForm(gap.input, key, a, entry, undefined, gap.simplify))
  );
}

/** The gaps in reading order: the picture's markers, the template's, then the table's row by row,
 * then any gap none of them mentions. */
function ordered(data: SlotsData): Gap[] {
  const byId = new Map(data.gaps.map((g) => [g.id, g]));
  const seen = markerIds(data).flatMap((id) => byId.get(id) ?? []);
  return [...seen, ...data.gaps.filter((g) => !seen.includes(g))];
}

export function judgeSlots(data: SlotsData, key: SlotsKey, value: unknown): Verdict {
  const given = readGaps(value);
  if (given === null) return { correct: false, mistake_class: "other_wrong", parts: [] };
  const gaps = ordered(data);
  const parts = gaps.map((gap): PartVerdict => {
    const k = key.gaps[gap.id];
    const raw = given[gap.id];
    const typed = typeof raw === "string" ? raw : "";
    const blank = data.column && typed.trim() === "" ? columnBlank(data.column, gap.id) : null;
    const entry = blank ?? typed;
    if (accepts(gap, k, entry)) return { id: gap.id, correct: true, mistake_class: null };
    if (k === undefined) return { id: gap.id, correct: false, mistake_class: "other_wrong" };
    const authored =
      k.kind === "enter" && gap.kind === "enter"
        ? enterClass(gap.input, k, entry)
        : (k.near?.[entry] ?? null);
    if (authored !== null) return { id: gap.id, correct: false, mistake_class: authored };
    if (data.column) return { id: gap.id, correct: false, mistake_class: "fact_error" };
    const swapped =
      entry.trim() !== "" &&
      gaps.some((other) => other.id !== gap.id && accepts(gap, key.gaps[other.id], entry));
    return { id: gap.id, correct: false, mistake_class: swapped ? "gap_swap" : "other_wrong" };
  });
  const firstWrong = parts.find((p) => !p.correct);
  return {
    correct: firstWrong === undefined,
    mistake_class: firstWrong?.mistake_class ?? null,
    parts,
  };
}

export function slotsMarks(
  data: SlotsData,
  key: SlotsKey,
  value: unknown,
  verdict: Verdict,
): PartMark[] | null {
  if (verdict.correct || verdict.parts.length === 0) return null;
  const given = readGaps(value) ?? {};
  return verdict.parts.flatMap(({ id, correct, mistake_class }) => {
    const gap = data.gaps.find((g) => g.id === id);
    const k = key.gaps[id];
    const raw = given[id];
    const letters =
      !correct &&
      gap?.kind === "enter" &&
      gap.input === "text" &&
      k?.kind === "enter" &&
      typeof raw === "string"
        ? letterParts(k, raw, mistake_class, id)
        : [];
    return [{ id, correct }, ...letters.map((l) => ({ id: l.id, correct: l.correct }))];
  });
}

export function slotsSolution(key: SlotsKey): SlotsValue {
  return {
    gaps: Object.fromEntries(
      Object.entries(key.gaps).map(([id, k]) => [
        id,
        (k.kind === "choose" ? k.correct[0] : k.accept[0]) ?? "",
      ]),
    ),
  };
}
