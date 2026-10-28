import type { HelpCard, HintCard, ReleasedHelp, Verdict } from "@jadwigo/contracts";
import { solutionOf } from "./judge.ts";
import type { Question } from "./question.ts";
import { slotIndex, tileMode } from "./sequence.ts";
import { fillOrder } from "./slots/model.ts";

/**
 * Help on a question (docs/18 "Help on a step", owner 2026-10-13): a ladder of four rungs the
 * learner climbs one at a time, by asking ("Help me") or by missing. Every rung gives a little
 * more, and the question always ends with the learner doing something: the last rung is the
 * worked solution. The twin, a question like this one that the learner answers alone, is its own
 * lesson question in v0.
 *
 * 1. look: where to look, in one sentence. Never reduces the work (Wood, Bruner & Ross 1976:
 *    help only where the learner cannot manage). After a named miss, the card written for that
 *    miss takes rung 1 instead, and the general boost (else the look) moves to rung 2.
 * 2. boost: a smaller step or a picture (Zearn's Boost: a miss splits the problem). A boost written
 *    for the mistake the learner just made wins over the general one.
 *
 * Help follows the missed part (Slots addendum 2.3, decision dl-4e0f 12b) in a family whose miss
 * names its parts (`missedOf`: gaps, a group's items, a graph's bars). Rung 1 outlines the first
 * part missed in fill order, not the author's `look.focus`. Rung 2 gives a missed part's answer
 * only when two or more parts were missed, and never the last missed one; otherwise it gives
 * nothing and its card is the smaller step in words. Before any miss, the author's lists stand.
 * A choice's rung 2 takes distractors away, which gives no part's answer, so it keeps `give`.
 * 3. almost: the worked solution with its last line left for the learner (backward fading, Renkl
 *    & Atkinson).
 * 4. worked: the full worked solution.
 *
 * Khan's questions bring `hints` instead (dl-w3.52): an ordered list of cards, each a little more,
 * the last one the answer. They are mapped onto the ladder (`hintsOnLadder`).
 *
 * The whole ladder is held with the key: the page gets a rung only when the server releases it
 * (ruling 05's rule for the key, applied to every rung, so a rung can never leak early). A rung
 * the author did not write is skipped, so a question with no help shows no Help button.
 *
 * Two parts of the playground's help are left out of v0:
 * - The hint stack (`releaseStack`, `stackNext`, `stackFree`, `helpNext`, `helpTop`, `pageHelpOf`):
 *   the wire's `ReleasedHelp.rung` stops at 4, so v0 plays Khan's hints mapped onto the ladder.
 *   The solution card (`solutionLines`) is not on the v0 wire either.
 * - The `twin` field: a twin is its own lesson question in the database, so the contracts' `Help`
 *   has none. Rung 4 is written when the worked solution or the last hint is.
 *
 * Explain has no verdict in v0, so its help never follows a miss.
 */

export const HelpRung = { None: 0, Look: 1, Boost: 2, Almost: 3, Twin: 4 } as const;
type HelpRungNo = (typeof HelpRung)[keyof typeof HelpRung];
/** A rung the server can release: every one but None. */
export type ReleasedRung = Exclude<HelpRungNo, 0>;

/** A question as help reads it: the question, or only its help when a test has no more. Without
 * the question no answer words are known, so no hint is held back for printing one. */
export type HelpOf = Pick<Question, "help"> | Question;

/** Whether the learner has tried enough for rungs 3 and 4: one real attempt. Waiting never opens
 * them (decision 2026-10-16-help-ladder-the-planner-writes-every-rung), so the ladder cannot be
 * clicked straight through to the solution (help abuse, Aleven & Koedinger). */
export function gateOpen(attempts: number): boolean {
  return attempts > 0;
}

// ---- the last miss ----------------------------------------------------------------------------

/** What help knows of the learner's last miss: its mistake class, and the parts it missed in fill
 * order. `missed` is null in a family whose help keeps the author's lists (`missedOf`). */
export interface LastMiss {
  mistake: string | null;
  missed: string[] | null;
}

/** No miss yet: the author's lists stand, and no card is written for a mistake. */
export const NO_MISS: LastMiss = { mistake: null, missed: null };

/** A miss known only by its mistake class: the card follows it, the parts stay the author's. */
export const namedMiss = (mistake: string | null): LastMiss => ({ mistake, missed: null });

/**
 * The parts a verdict missed, in the order the learner fills them, for a family whose help follows
 * them (Slots addendum 2.3): a question's gaps (a column's units first, a pyramid's bottom row
 * first), a group's items, a bar graph's bars. A slipped letter's part (`g2.l3`) belongs to its
 * gap, which is missed too. Null for every other family: a choice's rung 2 takes distractors away,
 * which gives no part's answer, and the rest have no parts help can point at.
 */
function missedOf(
  question: Question,
  verdict: Pick<Verdict, "correct" | "parts">,
): string[] | null {
  const order = partOrder(question);
  if (order === null) return null;
  const missed = new Set(
    verdict.correct ? [] : verdict.parts.filter((p) => !p.correct).map((p) => p.id),
  );
  return order.filter((id) => missed.has(id));
}

/** The parts help follows, in fill order, or null for a family whose help keeps the author's lists. */
function partOrder(question: Question): string[] | null {
  switch (question.family) {
    case "slots":
      return fillOrder(question.data);
    case "group":
      return question.data.items.map((i) => i.id);
    case "place":
      return question.key.surface === "bars" ? Object.keys(question.key.heights) : null;
    default:
      return null;
  }
}

/** The last miss of a question, as help reads it. */
export function lastMissOf(
  question: Question,
  verdict: Pick<Verdict, "correct" | "parts" | "mistake_class">,
): LastMiss {
  return { mistake: verdict.mistake_class, missed: missedOf(question, verdict) };
}

/**
 * The parts rung 1 outlines and rung 2 gives. In a family that follows the missed parts: the first
 * missed part, given only when another was missed after it. Before any miss rung 1 outlines what
 * the author's look points at, and rung 2 gives nothing, since nothing is missed yet. In any other
 * family, the author's lists.
 */
export function followed(
  question: Question,
  miss: LastMiss,
): { focus: string[] | null; give: string[] } {
  const help = question.help ?? {};
  if (partOrder(question) === null)
    return { focus: help.look?.focus ?? null, give: help.give ?? [] };
  const missed = miss.missed ?? [];
  const first = missed[0];
  if (first === undefined) return { focus: help.look?.focus ?? null, give: [] };
  return { focus: [first], give: missed.length >= 2 ? [first] : [] };
}

// ---- the answer's words -----------------------------------------------------------------------

/** The words a learner would read as the answer: the solution's text and numbers, and for a choice
 * the right options' own words. Ids such as `o2` are not words. Sequence, Group and Place answer
 * with ids and positions, never words a card could print. */
export function answerWords(question: Question): string[] {
  const out: string[] = [];
  const walk = (v: unknown): void => {
    if (typeof v === "number") out.push(String(v));
    else if (typeof v === "string" && !/^[a-z]+\d+$/.test(v)) out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v !== null && typeof v === "object") Object.values(v).forEach(walk);
  };
  if (question.family === "choose") {
    for (const o of question.data.options) {
      if (!question.key.correct.includes(o.id)) continue;
      if (o.content.kind === "text") out.push(o.content.text);
      if (o.content.kind === "number") out.push(String(o.content.number));
    }
  } else if (question.family === "slots") {
    for (const [id, answer] of Object.entries(question.key.gaps)) {
      if (answer.kind === "enter") out.push(...answer.accept);
      else {
        const gap = question.data.gaps.find((g) => g.id === id);
        if (gap?.kind === "choose")
          out.push(...gap.options.filter((o) => answer.correct.includes(o.id)).map((o) => o.label));
      }
    }
  } else if (question.family === "enter") {
    walk(solutionOf(question));
  }
  // A decimal answer prints either way, `0.29` or `0,29` (dl-w3.70.7), and a fraction as Khan's
  // TeX prints it, `\dfrac{3}{4}` or `2\dfrac{1}{4}` (dl-w3.70.16).
  return out
    .filter((w) => w.trim() !== "")
    .flatMap((w) => {
      const t = w.trim();
      if (/^-?[0-9]*\.[0-9]+$/.test(t)) return [w, w.replace(".", ",")];
      const f = /^(?:([0-9]+) )?([0-9]+)\/([0-9]+)$/.exec(t);
      if (f === null) return [w];
      const [, whole = "", num = "", den = ""] = f;
      return [w, ...["frac", "dfrac", "tfrac"].map((c) => `${whole}\\${c}{${num}}{${den}}`)];
    });
}

/** The answer word `text` prints whole, or null when it prints none. */
export function givesAway(text: string, answers: string[]): string | null {
  for (const a of answers) {
    const escaped = a.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      escaped !== "" &&
      new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "iu").test(text)
    )
      return a;
  }
  return null;
}

// ---- Khan's hints -----------------------------------------------------------------------------

export type HintsByRung = Record<ReleasedRung, HintCard[]>;

/**
 * Khan's hints on the ladder. The hints are taken in order: the first two go to rungs 1 and 2
 * (one card each), the rest before the last to rung 3 (several cards in one rung), the last to
 * rung 4, where it is the answer by design. A hint that prints an answer word, and every hint
 * after it, goes to rung 3 at the earliest, behind the one-attempt gate: 48 of the pulled Khan
 * items fill their first blank in their first hint, and the page never holds the key before the
 * answer is committed (ruling 05). Rungs 1 and 2 then hold only what the author wrote for them.
 */
export function hintsOnLadder(question: HelpOf): HintsByRung {
  const out: HintsByRung = { 1: [], 2: [], 3: [], 4: [] };
  const hints = question.help?.hints ?? [];
  if (hints.length === 0) return out;
  const answers = "family" in question ? answerWords(question) : [];
  const last = hints.length - 1;
  let early: 1 | 2 | 3 = 1;
  hints.forEach((h, i) => {
    if (i === last) out[4].push(h);
    else if (early < 3 && givesAway(h.text, answers) === null) {
      out[early].push(h);
      early = (early + 1) as 1 | 2 | 3;
    } else {
      early = 3;
      out[3].push(h);
    }
  });
  return out;
}

// ---- the ladder -------------------------------------------------------------------------------

/**
 * The parts a rung 2 gives away, as the page draws them: each family's own shape, read from the key.
 * - choose: distractors taken away.
 * - gaps: gaps filled with a right answer.
 * - sequence: items fixed at their place (0 is first); in tile mode, places filled with their tile
 *   (by the place's id, `s1` is first).
 * - group: items placed in a right group.
 * - place on bars (dl-w3.51.3): bars drawn to their height.
 */
export type Given =
  | { removed: string[] }
  | { gaps: Record<string, string> }
  | { placed: Record<string, number> }
  | { slots: Record<string, string> }
  | { items: Record<string, string[]> }
  | { heights: Record<string, number> };

/** The parts `ids` names, read from the question's key, or null when the family gives nothing away. */
export function givenOf(question: Question, ids: string[]): Given | null {
  if (ids.length === 0) return null;
  switch (question.family) {
    case "choose": {
      const correct = question.key.correct;
      return { removed: ids.filter((id) => !correct.includes(id)) };
    }
    case "slots": {
      const gaps: Record<string, string> = {};
      for (const id of ids) {
        const k = question.key.gaps[id];
        if (k === undefined) continue;
        const answer = k.kind === "enter" ? k.accept[0] : k.correct[0];
        if (answer !== undefined) gaps[id] = answer;
      }
      return { gaps };
    }
    case "sequence": {
      const order = question.key.orders[0] ?? [];
      if (tileMode(question.data)) {
        const slots: Record<string, string> = {};
        for (const id of ids) {
          const i = slotIndex(id);
          const tile = i === null || i < 0 ? undefined : order[i];
          if (tile !== undefined) slots[id] = tile;
        }
        return { slots };
      }
      const placed: Record<string, number> = {};
      for (const id of ids) if (order.includes(id)) placed[id] = order.indexOf(id);
      return { placed };
    }
    case "group": {
      const items: Record<string, string[]> = {};
      for (const id of ids) {
        const groups = question.key.items[id];
        if (groups) items[id] = [...groups];
      }
      return { items };
    }
    case "place": {
      if (question.key.surface !== "bars") return null;
      const heights: Record<string, number> = {};
      for (const id of ids) {
        const height = question.key.heights[id];
        if (height !== undefined) heights[id] = height;
      }
      return { heights };
    }
    default:
      return null;
  }
}

function has(question: HelpOf, rung: ReleasedRung, by: HintsByRung): boolean {
  const help = question.help ?? {};
  const hinted = (help.hints?.length ?? 0) > 0;
  switch (rung) {
    case HelpRung.Look:
      return help.look !== undefined || by[1].length > 0;
    case HelpRung.Boost:
      return (
        help.boost !== undefined ||
        Object.keys(help.boost_by_mistake ?? {}).length > 0 ||
        (help.give?.length ?? 0) > 0 ||
        by[2].length > 0
      );
    case HelpRung.Almost:
      // With hints, the hints are the ladder: `worked` is their recap on rung 4, not a rung 3.
      return (
        (help.almost?.length ?? 0) > 0 ||
        by[3].length > 0 ||
        (!hinted && (help.worked?.length ?? 0) > 1)
      );
    case HelpRung.Twin:
      return (help.worked?.length ?? 0) > 0 || by[4].length > 0;
  }
}

/** The rungs written, in order. */
export function rungsWritten(question: HelpOf | undefined): ReleasedRung[] {
  if (question?.help === undefined) return [];
  const by = hintsOnLadder(question);
  return ([HelpRung.Look, HelpRung.Boost, HelpRung.Almost, HelpRung.Twin] as const).filter((r) =>
    has(question, r, by),
  );
}

/** The next rung the author wrote above `from`, or null at the top. A rung not written is skipped. */
export function nextRung(question: HelpOf | undefined, from: number): ReleasedRung | null {
  return rungsWritten(question).find((r) => r > from) ?? null;
}

/** The rung a help request reaches: the next one written, held at rung 2 until the gate opens. */
export function rungFor(
  question: HelpOf | undefined,
  from: number,
  open: boolean,
): ReleasedRung | null {
  const next = nextRung(question, from);
  if (next === null) return null;
  if (next >= HelpRung.Almost && !open) return null;
  return next;
}

/** What the server releases for a rung, given the last miss: its mistake class picks the card,
 * its missed parts what rung 1 outlines and rung 2 gives (`followed`). The parts rung 2 gives
 * away stay given on rung 3. The twin is a new question, so nothing is given on it. An authored
 * look, boost or almost wins over the hints mapped onto its rung. */
export function release(
  question: Question,
  rung: ReleasedRung,
  miss: LastMiss = NO_MISS,
): ReleasedHelp {
  const help = question.help ?? {};
  const by = hintsOnLadder(question);
  const hinted = (help.hints?.length ?? 0) > 0;
  const none = { focus: [], given: null, worked: null, blank: false, hints: [] };
  const parts = followed(question, miss);
  const given =
    rung === HelpRung.Boost || rung === HelpRung.Almost ? givenOf(question, parts.give) : null;
  const mapped = (r: ReleasedRung, authored: boolean): HintCard[] =>
    authored || by[r].length === 0 ? [] : by[r];
  // The card written for the last miss, when the question has a rung 1 for it to take.
  const hasLook = help.look !== undefined || by[1].length > 0;
  // A mistake card that prints the answer never reaches rung 1 or 2, as a Khan hint would not.
  const answers = answerWords(question);
  const keeps = (card: HelpCard | undefined): HelpCard | undefined =>
    card !== undefined && givesAway(card.text, answers) === null ? card : undefined;
  const byMistake = help.boost_by_mistake ?? {};
  const named = keeps(
    miss.mistake !== null && Object.hasOwn(byMistake, miss.mistake)
      ? byMistake[miss.mistake]
      : undefined,
  );
  const targeted = hasLook ? named : undefined;
  switch (rung) {
    case HelpRung.Look: {
      // After a named miss, rung 1 follows it (Enter addendum section 6, dl-uukj.29.108): an
      // accent slip first hears about the accent, not where the tens go. Either way it
      // outlines the first missed part (Slots addendum 2.3).
      const focus = parts.focus ?? [];
      if (targeted !== undefined) return { ...none, rung, card: targeted, focus };
      return {
        ...none,
        rung,
        card: help.look ?? null,
        focus,
        hints: mapped(1, help.look !== undefined),
      };
    }
    case HelpRung.Boost: {
      // The named miss's card went on rung 1, so rung 2 is the general boost, else the look.
      // A question with no rung 1 keeps the named card here.
      const card =
        targeted !== undefined
          ? (help.boost ?? help.look ?? null)
          : (named ?? help.boost ?? Object.values(byMistake).map(keeps).find(Boolean) ?? null);
      return { ...none, rung, card, given, hints: mapped(2, card !== null) };
    }
    case HelpRung.Almost: {
      if (help.almost !== undefined)
        return { ...none, rung, card: null, given, worked: help.almost, blank: false };
      if (by[3].length > 0) return { ...none, rung, card: null, given, hints: by[3] };
      return {
        ...none,
        rung,
        card: null,
        given,
        worked: !hinted && help.worked ? help.worked.slice(0, -1) : null,
        blank: !hinted && help.worked !== undefined,
      };
    }
    case HelpRung.Twin:
      return {
        ...none,
        rung,
        card: null,
        worked: help.worked ? [...help.worked] : null,
        hints: mapped(4, false),
      };
  }
}

/** Whether a help request can reach any rung now. The page shows Help only when it can. */
export function canAsk(question: HelpOf | undefined, from: number, open: boolean): boolean {
  return rungFor(question, from, open) !== null;
}

/** Whether anything is left to give on this question, gate aside: the Help button's offer. */
export function helpLeft(question: HelpOf | undefined, from: number): boolean {
  if (question?.help === undefined) return false;
  return nextRung(question, from) !== null;
}
