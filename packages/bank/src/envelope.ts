import { SearchEnvelope, type SearchRow, type SearchState } from "@jadwigo/contracts";

/** Every arm the bank knows, in the order its envelope lists them. */
export const ARMS = ["A", "A1", "B", "B1", "C", "C2"] as const;

/** Why a search did not answer: refused (the need), unavailable (the bank) or timed out. */
export class BankError extends Error {
  override name = "BankError";
  constructor(
    readonly kind: "refused" | "unavailable" | "timeout",
    message: string,
  ) {
    super(message);
  }
}

const Row = SearchEnvelope.shape.rows.element;

/**
 * An answer as the public envelope: rows that do not parse (one carrying a private body among
 * them) are dropped whole, and fields the schema does not name are stripped. An answer that is
 * still no envelope is `unavailable`. Both backends end here, so no backend can leak a key.
 */
export function publicEnvelope(answer: unknown): SearchEnvelope {
  if (typeof answer !== "object" || answer === null)
    throw new BankError("unavailable", "the bank's answer is not an envelope");
  const rows = (answer as { rows?: unknown }).rows;
  const kept = Array.isArray(rows) ? rows.filter((row) => Row.safeParse(row).success) : rows;
  const parsed = SearchEnvelope.safeParse({ ...answer, rows: kept });
  if (!parsed.success) throw new BankError("unavailable", "the bank's answer is not an envelope");
  return parsed.data;
}

/** One state row per arm: `asked` came out as `state`, `also` as given, the rest `not_asked`. */
export function statesFor(
  asked: string,
  state: SearchState["state"],
  also: Readonly<Record<string, SearchState>> = {},
): SearchState[] {
  return ARMS.map(
    (arm) => also[arm] ?? (arm === asked ? { arm, state } : { arm, state: "not_asked" }),
  );
}

/** Ranks from 1 in the given order, each row answering for `arm`. */
export function ranked(rows: readonly SearchRow[], arm: string): SearchRow[] {
  return rows.map((row, i) => ({ ...row, rank: i + 1, arm }));
}
