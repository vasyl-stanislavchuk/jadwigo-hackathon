import type {
  GroupData,
  GroupKey,
  GroupValue,
  PartMark,
  PartVerdict,
  Verdict,
} from "@jadwigo/contracts";

/**
 * The Group judge: every item is a part, right when its groups are exactly the key's. A missed item
 * is `not_placed` when it is in no group, its `near` class when the author named the group it went
 * to, else `wrong_group`. The step is right only when every item is.
 *
 * Marks: per item when there are three or more groups. With two groups a marked item could only
 * belong in the other one, which gives the answer away, so the whole step is marked (the marks
 * rule).
 *
 * Ported from david-learns `frontend/src/families/group/judge.ts`.
 */

function readGroups(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const items = (value as { items?: unknown }).items;
  return items !== null && typeof items === "object" && !Array.isArray(items)
    ? (items as Record<string, unknown>)
    : null;
}

/** The same groups, each once: a group named twice is not a second group. */
const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  new Set(a).size === a.length && a.length === b.length && a.every((x) => b.includes(x));

export function judgeGroup(data: GroupData, key: GroupKey, value: unknown): Verdict {
  const given = readGroups(value);
  if (given === null) return { correct: false, mistake_class: "other_wrong", parts: [] };
  const parts = data.items.map((item): PartVerdict => {
    const raw = given[item.id];
    const placed = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
    if (sameSet(placed, key.items[item.id] ?? []))
      return { id: item.id, correct: true, mistake_class: null };
    if (placed.length === 0) return { id: item.id, correct: false, mistake_class: "not_placed" };
    const near =
      key.near !== undefined && Object.hasOwn(key.near, item.id) ? key.near[item.id] : undefined;
    const named = placed
      .map((g) => (near !== undefined && Object.hasOwn(near, g) ? near[g] : undefined))
      .find((c) => c !== undefined);
    return { id: item.id, correct: false, mistake_class: named ?? "wrong_group" };
  });
  const firstWrong = parts.find((p) => !p.correct);
  return {
    correct: firstWrong === undefined,
    mistake_class: firstWrong?.mistake_class ?? null,
    parts,
  };
}

export function groupMarks(data: GroupData, verdict: Verdict): PartMark[] | null {
  if (verdict.correct || data.groups.length < 3) return null;
  return verdict.parts.map(({ id, correct }) => ({ id, correct }));
}

export function groupSolution(key: GroupKey): GroupValue {
  return {
    items: Object.fromEntries(Object.entries(key.items).map(([id, groups]) => [id, [...groups]])),
  };
}
