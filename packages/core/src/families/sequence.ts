import type {
  SequenceData,
  SequenceItem,
  SequenceKey,
  SequenceValue,
  Verdict,
} from "@jadwigo/contracts";

/**
 * The Sequence judge: right when the order is one of the accepted orders. A miss gets one class for
 * the whole order, measured against the nearest accepted order (the fewest items out of place), and
 * checked in this sequence so each answer gets the most specific one (order design session,
 * dl-w3.26):
 *   reversed            the exact reverse: the direction was misread
 *   swapped_neighbours  one pair of neighbours swapped, everything else right
 *   one_misplaced       one item taken out and put elsewhere, the rest in order
 *   other_order         anything else
 * A value that is not an order of the items is `other_wrong`.
 *
 * Tile mode (dl-w3.51.9) compares what the tiles say, not their ids, so two `8` tiles are
 * interchangeable. When the places hold the right tiles out of order the classes above
 * apply. When they do not:
 *   extra_tile          a place holds a tile no accepted order uses (`×` for `+`)
 *   missing_tile        every tile belongs, but one the answer needs was left out (`8 + +`)
 *
 * Marks: the whole step only. Marking each position would tell the learner where items
 * belong (the marks rule).
 *
 * `tileMode`, `slotCount` and `slotIndex` read the question's shape: tiles or cards, and how many
 * places a tile row has.
 */

/** Whether the step answers with tiles in places rather than cards in a list. */
export function tileMode(
  data: Pick<SequenceData, "tiles">,
): data is SequenceData & { tiles: SequenceItem[] } {
  return Array.isArray(data.tiles);
}

/** The number of places in tile mode, from `slots`, else from the first accepted order. */
function slotCount(data: Pick<SequenceData, "slots">, key?: Pick<SequenceKey, "orders">): number {
  return data.slots ?? key?.orders[0]?.length ?? 0;
}

const SLOT_ID = /^s(\d+)$/;

/** The place a slot id names (0 is first), or null when the id is not one. */
export function slotIndex(id: string): number | null {
  const m = SLOT_ID.exec(id);
  return m === null ? null : Number(m[1]) - 1;
}

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i]);

const sorted = (xs: readonly string[]): string => [...xs].sort().join("\u0000");

function isPermutation(value: readonly string[], key: readonly string[]): boolean {
  return value.length === key.length && sorted(value) === sorted(key);
}

function swappedNeighbours(value: readonly string[], key: readonly string[]): boolean {
  const diff = value.flatMap((x, i) => (x === key[i] ? [] : [i]));
  const [i, j] = diff;
  return (
    diff.length === 2 &&
    i !== undefined &&
    j === i + 1 &&
    value[i] === key[j] &&
    value[j] === key[i]
  );
}

/** One entry taken out of `value` and one of `key`, the same one, leaves the two equal. Checked
 * by position, so repeated tiles do not count as one move when they took two. */
function oneMisplaced(value: readonly string[], key: readonly string[]): boolean {
  const without = (xs: readonly string[], i: number) => xs.filter((_, k) => k !== i);
  return value.some((x, i) =>
    key.some((y, j) => x === y && same(without(value, i), without(key, j))),
  );
}

const outOfPlace = (value: readonly string[], key: readonly string[]): number =>
  value.filter((x, i) => x !== key[i]).length;

function readOrder(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((x) => typeof x === "string") ? value : null;
}

/** The class of an order that holds the right things out of order. */
function orderClass(order: readonly string[], orders: readonly (readonly string[])[]): string {
  const nearest = [...orders].sort((a, b) => outOfPlace(order, a) - outOfPlace(order, b))[0];
  if (nearest === undefined) return "other_order";
  if (nearest.length > 2 && same(order, [...nearest].reverse())) return "reversed";
  if (swappedNeighbours(order, nearest)) return "swapped_neighbours";
  if (oneMisplaced(order, nearest)) return "one_misplaced";
  return "other_order";
}

const miss = (mistake_class: string): Verdict => ({ correct: false, mistake_class, parts: [] });

/**
 * Tile mode judges what the places say. The bank keeps its tiles, so one tile may fill several
 * places (`8`, `+`, `8` from a single `8`), and an id used twice is a real answer, not a slip.
 */
function judgeTiles(
  data: SequenceData & { tiles: SequenceItem[] },
  key: SequenceKey,
  order: string[],
): Verdict {
  const textOf = new Map(data.tiles.map((t) => [t.id, t.text.trim()]));
  const slots = slotCount(data, key);
  if (order.length !== slots || order.some((id) => !textOf.has(id))) return miss("other_wrong");
  const said = order.map((id) => textOf.get(id) ?? id);
  const accepted = key.orders.map((o) => o.map((id) => textOf.get(id) ?? id));
  if (accepted.some((k) => same(said, k))) return { correct: true, mistake_class: null, parts: [] };
  const alike = accepted.filter((k) => isPermutation(said, k));
  if (alike.length > 0) return miss(orderClass(said, alike));
  const wanted = new Set(accepted.flat());
  return miss(said.some((text) => !wanted.has(text)) ? "extra_tile" : "missing_tile");
}

export function judgeSequence(data: SequenceData, key: SequenceKey, value: unknown): Verdict {
  const order = readOrder(value);
  if (order === null) return miss("other_wrong");
  if (tileMode(data)) return judgeTiles(data, key, order);
  const first = key.orders[0];
  if (first === undefined || !isPermutation(order, first)) return miss("other_wrong");
  if (key.orders.some((k) => same(order, k)))
    return { correct: true, mistake_class: null, parts: [] };
  return miss(orderClass(order, key.orders));
}

export function sequenceSolution(key: SequenceKey): SequenceValue {
  return [...(key.orders[0] ?? [])];
}
