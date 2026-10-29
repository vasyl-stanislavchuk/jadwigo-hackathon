import { type Need, SearchEnvelope } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { ARMS } from "./envelope.ts";
import type { BankSearch } from "./ports.ts";

const STATES = new Set(["ok", "empty", "abstained", "degraded", "not_asked"]);
const ROW_FIELDS = new Set(Object.keys(SearchEnvelope.shape.rows.element.shape));
const PRIVATE_FIELDS = ["body", "private_body", "answer_key", "key", "solution"];

/** Needs every bank is asked: one most banks hold, one in Polish spelling, one nobody holds. */
export const CONFORMANCE_NEEDS: readonly Need[] = [
  { words: "dodawanie add within 20", language: "pl", grade: "1" },
  { words: "ułamki połowa", skills: ["maths.fractions.unit"], language: "pl", grade: "3" },
  { words: "photosynthesis of a leaf", language: "en", grade: "3", limit: 5 },
];

/**
 * What is wrong with one answer, as sentences; empty when it keeps the contract. The answer is
 * read as it arrived, before any parse, so a backend cannot pass by leaning on the caller's.
 */
export function envelopeViolations(answer: unknown): string[] {
  const found: string[] = [];
  const parsed = SearchEnvelope.safeParse(answer);
  if (!parsed.success) {
    found.push(`the answer is not a SearchEnvelope: ${parsed.error.issues[0]?.message}`);
  }
  const raw = (typeof answer === "object" && answer !== null ? answer : {}) as {
    rows?: unknown;
    state?: unknown;
    timing_ms?: unknown;
    bank_rev?: unknown;
  };
  const rows = Array.isArray(raw.rows) ? (raw.rows as Record<string, unknown>[]) : [];
  const state = Array.isArray(raw.state) ? (raw.state as { arm?: unknown; state?: unknown }[]) : [];

  if (typeof raw.timing_ms !== "object" || raw.timing_ms === null)
    found.push("timing_ms is missing");
  if (typeof raw.bank_rev !== "string" || raw.bank_rev === "") found.push("bank_rev is missing");

  for (const row of state) {
    if (!STATES.has(String(row.state)))
      found.push(`arm ${String(row.arm)} has state ${String(row.state)}, not one of the 5`);
  }
  const arms = state.map((row) => String(row.arm));
  if (new Set(arms).size !== arms.length) found.push("an arm has more than one state row");
  for (const arm of ARMS) if (!arms.includes(arm)) found.push(`arm ${arm} has no state row`);

  for (const row of rows) {
    for (const field of Object.keys(row)) {
      if (PRIVATE_FIELDS.includes(field)) found.push(`row ${String(row["id"])} carries ${field}`);
      else if (!ROW_FIELDS.has(field))
        found.push(`row ${String(row["id"])} carries ${field}, which the envelope does not name`);
    }
    if (row["source"] === "khan" && typeof row["credit"] !== "string")
      found.push(`row ${String(row["id"])} is from Khan Academy with no credit line`);
  }
  const ids = rows.map((row) => row["id"]);
  if (new Set(ids).size !== ids.length) found.push("a set appears twice");
  rows.forEach((row, i) => {
    if (row["rank"] !== i + 1) found.push(`row ${i + 1} has rank ${String(row["rank"])}`);
  });

  const states = state.map((row) => row.state);
  if (states.includes("abstained") && rows.length > 0)
    found.push("an abstained search returned rows");
  if (states.filter((s) => s !== "not_asked").length === 0)
    found.push("no arm was asked: every state row is not_asked");
  return found;
}

/**
 * The suite every bank backend passes: `make` builds the bank, `holds` says whether it holds
 * sets at all (a degraded rerank must then still return rows: it fails open). Run on the fixture
 * and api profiles and on every double in `conformance.test.ts`.
 */
export function bankContract(
  name: string,
  make: () => BankSearch,
  { holds = true }: { holds?: boolean } = {},
): void {
  describe(`${name} keeps the bank contract`, () => {
    it.each(CONFORMANCE_NEEDS.map((need) => [need.words, need] as const))(
      "answers %s with a valid public envelope",
      async (_, need) => {
        const answer = await make().search(need);
        expect(envelopeViolations(answer)).toEqual([]);
      },
    );

    it("fails open on a degraded rerank: rows still arrive when the bank holds any", async () => {
      for (const need of CONFORMANCE_NEEDS) {
        const answer = await make().search(need);
        const degraded = answer.state.some((row) => row.state === "degraded");
        if (degraded && holds) expect(answer.rows.length).toBeGreaterThan(0);
      }
    });

    it("answers the same need the same way twice", async () => {
      const [need] = CONFORMANCE_NEEDS;
      if (need === undefined) return;
      const bank = make();
      const [a, b] = [await bank.search(need), await bank.search(need)];
      expect(b.rows.map((row) => row.id)).toEqual(a.rows.map((row) => row.id));
    });
  });
}
