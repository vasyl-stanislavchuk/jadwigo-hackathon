/**
 * Help on a step (docs/18 "Help on a step", owner 2026-10-13): a ladder of four rungs the learner
 * climbs one at a time, by asking ("Help me") or by missing. Every rung gives a little more, and
 * the step always ends with the learner doing something: the last rung is a twin, an item like
 * this one that the learner answers alone.
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
 * 4. twin: the full worked solution, then the twin to answer.
 *
 * Khan's items bring `hints` instead (dl-w3.52): an ordered list of cards, each a little more,
 * the last one the answer.
 *
 * Help is drawn as one note that grows (lesson frame rule 6, decision dl-q3p9): every card released
 * so far stays, the older ones muted, under a counter "n z m" that reads the cards the step really
 * has (`releaseStack`). A step without hints gives its rungs as the cards.
 *
 * The whole ladder is held with the key: the page gets a rung only when the server releases it
 * (ruling 05's rule for the key, applied to every rung, so a rung can never leak early). A rung
 * the author did not write is skipped, so a step with no help shows no Help button and a step
 * with no twin ends on the worked solution and moving on, as before.
 */

import type { HelpCard, HintCard } from "@jadwigo/contracts";
import { uncoloured } from "../parts/richTextMacros.ts";
import type { HelpPicture, PageHelp, PageHintCard, PageSolutionLine } from "../stage/types.ts";
import { answerWords, givesAway } from "./answer.ts";
import { Family, Surface } from "./names.ts";
import { slotIndex, tileMode } from "./sequence/model.ts";
import { fillOrder } from "./slots/model.ts";
import { type BareSpec, type FamilySpec, pageSpec, type Verdict } from "./types.ts";

export type { HintCard } from "@jadwigo/contracts";

/** A card on the hint stack: a Khan hint as written, or a ladder rung turned into one (its
 * picture kept, its worked or almost-there lines under `lines`). The page's PageHintCard. */
type StackCard = HintCard & { picture?: HelpPicture; lines?: string[]; blank?: boolean };

/**
 * The ladder as the playground holds it: the contracts' `Help`, and the twin rung 4 plays. In v0 a
 * twin is its own lesson question in the database, so `Help` has no field for it; the playground
 * keeps it beside the ladder until its loader turns each twin into a question of its own.
 */
export const HelpRung = { None: 0, Look: 1, Boost: 2, Almost: 3, Twin: 4 } as const;
export type HelpRungNo = (typeof HelpRung)[keyof typeof HelpRung];

/** A step as help reads it: its spec, or only its help when a test has no more. Without the
 * spec no answer words are known, so no hint is held back for printing one. */
export type HelpOf = Pick<FamilySpec, "help"> | FamilySpec;

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
 * them (Slots addendum 2.3): a step's gaps (a column's units first, a pyramid's bottom row first),
 * a group's items, a bar graph's bars. A slipped letter's part (`g2.l3`) belongs to its gap, which
 * is missed too. Null for every other family: a choice's rung 2 takes distractors away, which
 * gives no part's answer, and the rest have no parts help can point at.
 */
function missedOf(spec: BareSpec, verdict: Pick<Verdict, "correct" | "parts">): string[] | null {
  const order = partOrder(spec);
  if (order === null) return null;
  const missed = new Set(
    verdict.correct ? [] : verdict.parts.filter((p) => !p.correct).map((p) => p.id),
  );
  return order.filter((id) => missed.has(id));
}

/** The parts help follows, in fill order, or null for a family whose help keeps the author's lists. */
function partOrder(spec: BareSpec): string[] | null {
  const s = spec as FamilySpec;
  switch (s.family) {
    case Family.Slots:
      return fillOrder(s.data);
    case Family.Group:
      return s.data.items.map((i) => i.id);
    case Family.Place:
      return s.key.surface === Surface.Bars ? Object.keys(s.key.heights) : null;
    default:
      return null;
  }
}

/** The last miss of a step, as help reads it. */
export function lastMissOf(
  spec: BareSpec,
  verdict: Pick<Verdict, "correct" | "parts" | "mistake_class">,
): LastMiss {
  return { mistake: verdict.mistake_class, missed: missedOf(spec, verdict) };
}

/**
 * The parts rung 1 outlines and rung 2 gives. In a family that follows the missed parts: the first
 * missed part, given only when another was missed after it. Before any miss rung 1 outlines what
 * the author's look points at, and rung 2 gives nothing, since nothing is missed yet. In any other
 * family, the author's lists.
 */
export function followed(
  spec: FamilySpec,
  miss: LastMiss,
): { focus: string[] | null; give: string[] } {
  const help = spec.help ?? {};
  if (partOrder(spec) === null) return { focus: help.look?.focus ?? null, give: help.give ?? [] };
  const missed = miss.missed ?? [];
  const [first] = missed;
  if (first === undefined) return { focus: help.look?.focus ?? null, give: [] };
  return { focus: [first], give: missed.length >= 2 ? [first] : [] };
}

// ---- Khan's hints -----------------------------------------------------------------------------

export type HintsByRung = Record<1 | 2 | 3 | 4, HintCard[]>;

/**
 * Khan's hints on the ladder. The hints are taken in order: the first two go to rungs 1 and 2
 * (one card each), the rest before the last to rung 3 (several cards in one rung), the last to
 * rung 4, where it is the answer by design. A hint that prints an answer word, and every hint
 * after it, goes to rung 3 at the earliest, behind the one-attempt gate: 48 of the pulled Khan
 * items fill their first blank in their first hint, and the page never holds the key before the
 * answer is committed (ruling 05). Rungs 1 and 2 then hold only what the author wrote for them.
 */
export function hintsOnLadder(spec: HelpOf): HintsByRung {
  const out: HintsByRung = { 1: [], 2: [], 3: [], 4: [] };
  const hints = spec.help?.hints ?? [];
  if (hints.length === 0) return out;
  const answers = "family" in spec ? answerWords(spec) : [];
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

/** The hints the stack may show before any attempt: the ones the ladder puts on rungs 1 and 2. The
 * rest, the last hint among them, wait for one real attempt. Khan has no such gate; this is the
 * conservative choice until the owner reviews the stack (dl-w3.46.1). */
export function stackFree(spec: HelpOf): number {
  const by = hintsOnLadder(spec);
  return by[1].length + by[2].length;
}

/** Whether the step's help is Khan's hints, counted card by card, rather than its rungs. */
function hinted(spec: HelpOf | undefined): boolean {
  return (spec?.help?.hints?.length ?? 0) > 0;
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

/** The parts `ids` names, read from the spec's key, or null when the family gives nothing away. */
export function givenOf(spec: BareSpec, ids: string[]): Given | null {
  if (ids.length === 0) return null;
  const s = spec as FamilySpec;
  switch (s.family) {
    case Family.Choose:
      return { removed: ids.filter((id) => !s.key.correct.includes(id)) };
    case Family.Slots: {
      const gaps: Record<string, string> = {};
      for (const id of ids) {
        const k = s.key.gaps[id];
        if (k === undefined) continue;
        const answer = k.kind === Family.Enter ? k.accept[0] : k.correct[0];
        if (answer !== undefined) gaps[id] = answer;
      }
      return { gaps };
    }
    case Family.Sequence: {
      const order = s.key.orders[0] ?? [];
      if (tileMode(s.data)) {
        const slots: Record<string, string> = {};
        for (const id of ids) {
          const i = slotIndex(id);
          const tile = i === null ? undefined : order[i];
          if (tile !== undefined) slots[id] = tile;
        }
        return { slots };
      }
      const placed: Record<string, number> = {};
      for (const id of ids) if (order.includes(id)) placed[id] = order.indexOf(id);
      return { placed };
    }
    case Family.Group: {
      const items: Record<string, string[]> = {};
      for (const id of ids) if (s.key.items[id]) items[id] = [...s.key.items[id]];
      return { items };
    }
    case Family.Place: {
      if (s.key.surface !== Surface.Bars) return null;
      const heights: Record<string, number> = {};
      for (const id of ids) if (s.key.heights[id] !== undefined) heights[id] = s.key.heights[id];
      return { heights };
    }
    default:
      return null;
  }
}

/** What the page is given for one rung: the card to show, and on rung 4 the twin to answer. In a
 * stack of hints `rung` counts the cards released instead. */
export interface ReleasedHelp {
  rung: number;
  card: HelpCard | null;
  /** Rung 1: the parts to outline. */
  focus: string[] | null;
  /** From rung 2 until the twin: the parts given away. */
  given: Given | null;
  /** Rung 3: the worked lines with the last one left for the learner. Rung 4: all of them. */
  worked: string[] | null;
  /** Rung 3 only: true when the last line was cut off `worked`, so the page draws the blank;
   * false when the author wrote rung 3 (`almost`) with the blank in its words. */
  blank: boolean;
  twin: BareSpec | null;
  /** Ladder: the hints mapped onto this rung. Stack: every card released so far. */
  hints: StackCard[] | null;
  /** Stack only: how many cards the step has in all. */
  hintsTotal: number | null;
}

function has(spec: HelpOf, rung: HelpRungNo, by: HintsByRung): boolean {
  const help = spec.help ?? {};
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
      return help.twin !== undefined || (help.worked?.length ?? 0) > 0 || by[4].length > 0;
    default:
      return false;
  }
}

/** The rungs written, in order. */
export function rungsWritten(spec: HelpOf | undefined): HelpRungNo[] {
  if (spec?.help === undefined) return [];
  const by = hintsOnLadder(spec);
  return ([HelpRung.Look, HelpRung.Boost, HelpRung.Almost, HelpRung.Twin] as const).filter((r) =>
    has(spec, r, by),
  );
}

/** The next rung the author wrote above `from`, or null at the top. A rung not written is skipped. */
export function nextRung(spec: HelpOf | undefined, from: number): HelpRungNo | null {
  return rungsWritten(spec).find((r) => r > from) ?? null;
}

/** The rung a help request reaches: the next one written, held at rung 2 until the gate opens. */
export function rungFor(spec: HelpOf | undefined, from: number, open: boolean): HelpRungNo | null {
  const next = nextRung(spec, from);
  if (next === null) return null;
  if (next >= HelpRung.Almost && !open) return null;
  return next;
}

/** What the server releases for a rung, given the last miss: its mistake class picks the card,
 * its missed parts what rung 1 outlines and rung 2 gives (`followed`). The parts rung 2 gives
 * away stay given on rung 3. The twin is a new item, so nothing is given on it. An authored look,
 * boost or almost wins over the hints mapped onto its rung. */
export function release(
  spec: FamilySpec,
  rung: HelpRungNo,
  miss: LastMiss = NO_MISS,
): ReleasedHelp {
  const help = spec.help ?? {};
  const by = hintsOnLadder(spec);
  const hinted = (help.hints?.length ?? 0) > 0;
  const none = {
    focus: null,
    given: null,
    worked: null,
    blank: false,
    twin: null,
    hints: null,
    hintsTotal: null,
  };
  const parts = followed(spec, miss);
  const given =
    rung === HelpRung.Boost || rung === HelpRung.Almost ? givenOf(spec, parts.give) : null;
  const mapped = (r: 1 | 2 | 3 | 4, authored: boolean): StackCard[] | null =>
    authored || by[r].length === 0 ? null : by[r];
  // The card written for the last miss, when the step has a rung 1 for it to take.
  const hasLook = help.look !== undefined || by[1].length > 0;
  const named = miss.mistake === null ? undefined : help.boost_by_mistake?.[miss.mistake];
  const targeted = hasLook ? named : undefined;
  switch (rung) {
    case HelpRung.Look: {
      // After a named miss, rung 1 follows it (Enter addendum section 6, dl-uukj.29.108): an
      // accent slip first hears about the accent, not where the tens go. Either way it
      // outlines the first missed part (Slots addendum 2.3).
      if (targeted !== undefined)
        return { ...none, rung, card: targeted, focus: parts.focus, hints: null };
      return {
        ...none,
        rung,
        card: help.look ?? null,
        focus: parts.focus,
        hints: mapped(1, help.look !== undefined),
      };
    }
    case HelpRung.Boost: {
      // The named miss's card went on rung 1, so rung 2 is the general boost, else the look.
      // A step with no rung 1 keeps the named card here.
      const card =
        targeted !== undefined
          ? (help.boost ?? help.look ?? null)
          : (named ?? help.boost ?? Object.values(help.boost_by_mistake ?? {})[0] ?? null);
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
        twin: help.twin ?? null,
        hints: mapped(4, false),
      };
    default:
      return { ...none, rung, card: null };
  }
}

/** Whether a help request can reach any rung now. The page shows Help only when it can. */
export function canAsk(spec: HelpOf | undefined, from: number, open: boolean): boolean {
  return rungFor(spec, from, open) !== null;
}

// ---- the stack --------------------------------------------------------------------------------

/** A ladder rung's release as one stack card: its words and picture, its lines. */
function stackCardOf(r: ReleasedHelp): StackCard {
  const card: StackCard = { text: r.card?.text ?? "" };
  if (r.card?.picture) card.picture = r.card.picture;
  if (r.worked) {
    card.lines = r.worked;
    if (r.blank) card.blank = true;
  }
  return card;
}

/**
 * Khan's stack: the first k cards, cumulative, so each stays on screen under the next ("1 of 4",
 * "Get another hint"). With `hints`, the cards are the hints themselves and k counts them. Without
 * `hints`, the stack is the ladder's cards in order (look, boost, the almost-there lines as one
 * card, the worked solution as one card), k is the ladder's rung, and the rung's own focus, given
 * parts and twin come with it, so the family's in-answer help still works.
 */
export function releaseStack(spec: FamilySpec, k: number, miss: LastMiss = NO_MISS): ReleasedHelp {
  const hints = spec.help?.hints ?? [];
  if (hints.length > 0) {
    // The first hint is rung 1: it outlines the first missed part, as the ladder's look does.
    const focus = k === 1 ? followed(spec, miss).focus : null;
    return {
      rung: k,
      card: null,
      focus,
      given: null,
      worked: null,
      blank: false,
      twin: null,
      hints: hints.slice(0, k),
      hintsTotal: hints.length,
    };
  }
  const written = rungsWritten(spec);
  const reached = written.filter((r) => r <= k);
  const cards = reached.map((r) => stackCardOf(release(spec, r, miss)));
  const last = reached.at(-1);
  const top = last === undefined ? null : release(spec, last, miss);
  return {
    rung: k,
    card: null,
    focus: top?.focus ?? null,
    given: top?.given ?? null,
    worked: null,
    blank: false,
    twin: top?.twin ?? null,
    hints: cards,
    hintsTotal: written.length,
  };
}

/** The next card a stack request reaches: the next hint, held once the free ones are shown until
 * the gate opens; or, without hints, the ladder's next rung. */
export function stackNext(spec: HelpOf | undefined, from: number, open: boolean): number | null {
  if (spec?.help === undefined) return null;
  const n = spec.help.hints?.length ?? 0;
  if (n === 0) return rungFor(spec, from, open);
  if (from >= n) return null;
  return from < stackFree(spec) || open ? from + 1 : null;
}

// ---- for the server (today: the playground's simulated one) -----------------------------------

/** The next help a request reaches, or null when nothing more can be given now. `from` is the
 * cards released so far: hints with hints, else the rung. */
export function helpNext(spec: HelpOf | undefined, from: number, open: boolean): number | null {
  return stackNext(spec, from, open);
}

/** Whether anything is left to give on this step, gate aside: the Help button's offer. */
export function helpLeft(spec: HelpOf | undefined, from: number): boolean {
  if (spec?.help === undefined) return false;
  return hinted(spec) ? from < (spec.help.hints?.length ?? 0) : nextRung(spec, from) !== null;
}

/** The last help there is: every hint, else the twin rung. */
export function helpTop(spec: HelpOf): number {
  return hinted(spec) ? (spec.help?.hints?.length ?? 0) : HelpRung.Twin;
}

/** A rung's card as the page draws it: its words and its picture, never the parts it outlines. */
function pageCard(card: HelpCard): PageHelp["card"] {
  return card.picture === undefined
    ? { text: card.text }
    : { text: card.text, picture: card.picture };
}

/** The page's copy of released help: the note's cards so far, the twin with its key stripped, and
 * whether more is written. */
export function pageHelpOf(spec: FamilySpec, to: number, miss: LastMiss = NO_MISS): PageHelp {
  const released = releaseStack(spec, to, miss);
  return {
    ...released,
    card: released.card === null ? null : pageCard(released.card),
    twin: released.twin ? pageSpec(released.twin) : null,
    hints: released.hints as PageHintCard[] | null,
    more: helpLeft(spec, to),
  };
}

// ---- the solution card ------------------------------------------------------------------------

/** Words by which a line points at a picture: "this image", "the following", "na rysunku", or a
 * line that ends on a colon, as Khan's "The following image shows 3 × 2:". */
const REFERS =
  /\b(?:image|picture|diagram|figure|model|array|shown|below|following)\b|rysun|obraz|ilustrac|schemat|poniż|następuj|:\s*$/iu;

/** Whether a worked line refers to a picture, so the card draws the hint's pictures under it. */
export function refersToPicture(line: string): boolean {
  return REFERS.test(line.trim());
}

/**
 * The solution card's lines (Choose addendum 1.2, dl-uukj.29.86), released with the solution when
 * the step is moved on: every line of the worked solution (`help.worked`, or a Choose key's
 * `worked_solution` on a step with no help), in ink. Khan's worked lines repeat its hints: their
 * colour commands are taken off (the colours point at a picture the card may not draw), and a
 * hint's pictures come with its line only when the line refers to them. A step with no worked
 * lines has no card.
 */
export function solutionLines(spec: FamilySpec): PageSolutionLine[] {
  const worked =
    spec.help?.worked ??
    (spec.family === Family.Choose ? spec.key.worked_solution : undefined) ??
    [];
  const hints = spec.help?.hints ?? [];
  return worked
    .filter((line) => line.trim() !== "")
    .map((line, i) => {
      const hint =
        hints.find((h) => h.text === line) ??
        (hints.length === worked.length ? hints[i] : undefined);
      const pictures =
        hint?.pictures && hint.pictures.length > 0 && refersToPicture(line)
          ? (hint.pictures as PageSolutionLine["pictures"])
          : undefined;
      return pictures ? { text: uncoloured(line), pictures } : { text: uncoloured(line) };
    });
}
