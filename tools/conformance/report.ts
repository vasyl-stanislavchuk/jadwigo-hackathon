// What a conformance run writes (dl-a38n.31): the sidecar beside the items file, which the bank's
// import reads as each item's verdict (dl-a38n.32), and the report, which ranks each failing shape
// (a rule on a question type) by how many of the bank's sets it serves, so the converter is fixed
// where it matters most. Pure: run.ts reads the page and writes the files.

/** A render finding as the page reports it (packages/lesson-import findings.ts; tools imports nothing of ours). */
export interface Finding {
  readonly step_id: string | null;
  readonly path: string;
  readonly level: "error" | "warn";
  readonly rule: string;
  readonly text: string;
  readonly fix: string;
}

/** One item's verdict, as /playground/conformance reports it. */
export interface ItemResult {
  readonly item_id: string;
  readonly set_id: string | null;
  readonly question_type: string | null;
  readonly problem_type: string | null;
  readonly findings: readonly Finding[];
}

/** The sidecar, `<items>.render.json`: the bank refuses an item that is not render_ok. */
export interface Sidecar {
  readonly items: Record<
    string,
    { readonly render_ok: boolean; readonly findings: readonly Finding[] }
  >;
  readonly rules_version: string;
  readonly ran_at: string;
}

/** A failing shape: one rule on one question type, with the sets and items it touches. */
export interface Shape {
  readonly rule: string;
  readonly question_type: string | null;
  readonly level: "error" | "warn";
  readonly sets: number;
  readonly items: number;
  readonly set_ids: readonly string[];
  /** A few item ids to look at first. */
  readonly examples: readonly string[];
  readonly fix: string;
}

const renderOk = (r: ItemResult): boolean => !r.findings.some((f) => f.level === "error");

export function sidecarOf(
  results: readonly ItemResult[],
  rulesVersion: string,
  ranAt: string,
): Sidecar {
  const items: Record<string, Sidecar["items"][string]> = {};
  for (const r of [...results].sort((a, b) => (a.item_id < b.item_id ? -1 : 1))) {
    items[r.item_id] = { render_ok: renderOk(r), findings: r.findings };
  }
  return { items, rules_version: rulesVersion, ran_at: ranAt };
}

/** Each failing shape, the one serving the most sets first, then the most items, then by name. */
export function shapesOf(results: readonly ItemResult[]): Shape[] {
  const byShape = new Map<
    string,
    {
      rule: string;
      question_type: string | null;
      level: "error" | "warn";
      fix: string;
      sets: Set<string>;
      items: string[];
    }
  >();
  for (const r of results) {
    for (const f of r.findings) {
      const key = `${f.rule}\u0000${r.question_type ?? ""}`;
      const shape = byShape.get(key) ?? {
        rule: f.rule,
        question_type: r.question_type,
        level: f.level,
        fix: f.fix,
        sets: new Set<string>(),
        items: [],
      };
      if (f.level === "error") shape.level = "error";
      if (r.set_id !== null) shape.sets.add(r.set_id);
      if (!shape.items.includes(r.item_id)) shape.items.push(r.item_id);
      byShape.set(key, shape);
    }
  }
  return [...byShape.values()]
    .map((s) => ({
      rule: s.rule,
      question_type: s.question_type,
      level: s.level,
      sets: s.sets.size,
      items: s.items.length,
      set_ids: [...s.sets].sort(),
      examples: s.items.slice(0, 3),
      fix: s.fix,
    }))
    .sort(
      (a, b) =>
        b.sets - a.sets ||
        b.items - a.items ||
        `${a.rule} ${a.question_type}`.localeCompare(`${b.rule} ${b.question_type}`),
    );
}

/** The run in a few lines: the counts, then the failing shapes, most sets first. */
export function summaryLines(
  results: readonly ItemResult[],
  shapes: readonly Shape[],
  top = 10,
): string[] {
  const failing = results.filter((r) => !renderOk(r)).length;
  const lines = [
    `${results.length} items checked, ${failing} fail a check (contract, key or render), ${shapes.length} shapes`,
  ];
  for (const s of shapes.slice(0, top)) {
    lines.push(
      `  ${s.level} ${s.rule} on ${s.question_type ?? "(no question type)"}: ${s.sets} sets, ${s.items} items (e.g. ${s.examples.join(", ")})`,
    );
  }
  return lines;
}
