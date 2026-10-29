/**
 * `@jadwigo/bank/testing`: a bank in every state a consumer must handle, with no network. Only
 * test files import it (dependency-cruiser's testing-only-in-tests rule).
 */
import type { Need, SearchEnvelope, SearchRow } from "@jadwigo/contracts";
import { apiSearch } from "./api.ts";
import { BankError, publicEnvelope, ranked, statesFor } from "./envelope.ts";
import { DEFAULT_ARM, FIXTURE_REV, FIXTURE_ROWS, fixtureSearch, setRow } from "./fixture.ts";
import type { BankSearch } from "./ports.ts";

export { FIXTURE_ROWS, setRow };

function envelope(need: Need, fields: Partial<SearchEnvelope>): SearchEnvelope {
  return publicEnvelope({
    version: 1,
    need,
    arm: DEFAULT_ARM,
    stage: "final",
    timing_ms: { total: 0 },
    cache: "off",
    bank_rev: FIXTURE_REV,
    rows: [],
    state: statesFor(DEFAULT_ARM, "empty"),
    ...fields,
  });
}

/** A bank holding exactly these sets, searched like the fixture bank. */
export function fakeBank({
  rows = FIXTURE_ROWS,
}: {
  rows?: readonly SearchRow[];
} = {}): BankSearch {
  return fixtureSearch(rows);
}

/** A bank holding nothing: every search is `empty`, with no rows. */
export const emptyBank: BankSearch = fixtureSearch([]);

/** Every search falls below the bank's floor: `abstained`, with no rows. */
export const bankThatAbstains: BankSearch = {
  search: async (need) => envelope(need, { rows: [], state: statesFor(DEFAULT_ARM, "abstained") }),
};

/**
 * The reranker failed, so arm C answers `degraded` and the rows are A1's, unreranked. The rows
 * still arrive: a degraded rerank fails open.
 */
export const degradedRerank: BankSearch = {
  async search(need) {
    const rows = ranked(
      FIXTURE_ROWS.map((row) => ({ ...row, rerank_score: null })),
      "A1",
    );
    return envelope(need, {
      arm: "A1",
      rows,
      state: statesFor("A1", "ok", {
        C: { arm: "C", state: "degraded", detail: "the reranker did not answer in time" },
      }),
    });
  },
};

/** Every search times out: it rejects with a `timeout` BankError. */
export const bankThatTimesOut: BankSearch = {
  search: async () => {
    throw new BankError("timeout", "the bank took too long");
  },
};

/**
 * A bank route whose answer carries an answer key, a private body and a field the envelope does
 * not name, served to the real `api` backend over a fake fetch. What the consumer gets is what
 * `publicEnvelope` leaves: the key stripped, the private-bodied row dropped.
 */
export const keyLeakAttempt: BankSearch = apiSearch({
  base: "https://api.test",
  token: "test-read-token",
  fetch: async (_url, init) => {
    const need = JSON.parse(String(init?.body)) as Need;
    const [first, second] = FIXTURE_ROWS;
    const leaky = {
      version: 1,
      need,
      arm: DEFAULT_ARM,
      timing_ms: { total: 0 },
      bank_rev: FIXTURE_REV,
      api_key: "leaked-key-value",
      rows: [
        { ...first, answer_key: { solution: "12" } },
        { ...second, rank: 2, body: "the private question body" },
      ],
      state: statesFor(DEFAULT_ARM, "ok"),
    };
    return new Response(JSON.stringify(leaky), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  },
});
