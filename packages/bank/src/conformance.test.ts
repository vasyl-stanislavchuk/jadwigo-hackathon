import { type Need, SearchEnvelope } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { bankContract, CONFORMANCE_NEEDS, envelopeViolations } from "./conformance.ts";
import { createBank } from "./index.ts";
import {
  bankThatAbstains,
  degradedRerank,
  emptyBank,
  FIXTURE_ROWS,
  keyLeakAttempt,
} from "./testing.ts";

/** The route as apps/api answers it: the fixture bank's envelope, as JSON over a fake fetch. */
const fakeRoute: typeof fetch = async (_url, init) => {
  const need = JSON.parse(String(init?.body)) as Need;
  return Response.json(await createBank("fixture").search(need));
};

bankContract("the fixture profile", () => createBank("fixture"));
bankContract("the api profile against a fake route", () =>
  createBank("api", { base: "https://api.test", token: "read-token", fetch: fakeRoute }),
);
bankContract("emptyBank", () => emptyBank, { holds: false });
bankContract("bankThatAbstains", () => bankThatAbstains);
bankContract("degradedRerank", () => degradedRerank);
bankContract("keyLeakAttempt, through the api profile's guard", () => keyLeakAttempt);

describe("the suite fails a broken bank", () => {
  const good = () => createBank("fixture").search(CONFORMANCE_NEEDS[0] as Need);
  const [khan] = FIXTURE_ROWS;

  it.each([
    [
      "a row carrying a private body",
      async () => {
        const answer = await good();
        return { ...answer, rows: [{ ...answer.rows[0], body: "the private question body" }] };
      },
      /carries body/,
    ],
    [
      "a row carrying an answer key",
      async () => ({ ...(await good()), rows: [{ ...khan, rank: 1, answer_key: "12" }] }),
      /carries answer_key/,
    ],
    [
      "a field the envelope does not name",
      async () => ({ ...(await good()), rows: [{ ...khan, rank: 1, secret_rev: "x" }] }),
      /secret_rev, which the envelope does not name/,
    ],
    [
      "a state outside the 5",
      async () => {
        const answer = await good();
        return { ...answer, state: answer.state.map((s) => ({ ...s, state: "broken" })) };
      },
      /not one of the 5/,
    ],
    [
      "an abstained search with rows",
      async () => {
        const answer = await good();
        return {
          ...answer,
          state: answer.state.map((s) => (s.arm === "C" ? { ...s, state: "abstained" } : s)),
        };
      },
      /abstained search returned rows/,
    ],
    [
      "no timing",
      async () => {
        const { timing_ms: _, ...answer } = await good();
        return answer;
      },
      /timing_ms is missing/,
    ],
    [
      "no bank_rev",
      async () => {
        const { bank_rev: _, ...answer } = await good();
        return answer;
      },
      /bank_rev is missing/,
    ],
    [
      "a missing arm",
      async () => {
        const answer = await good();
        return { ...answer, state: answer.state.filter((s) => s.arm !== "A1") };
      },
      /arm A1 has no state row/,
    ],
    [
      "ranks out of order",
      async () => {
        const answer = await good();
        return { ...answer, rows: answer.rows.map((row) => ({ ...row, rank: 7 })) };
      },
      /has rank 7/,
    ],
    [
      "a Khan set with no credit line",
      async () => {
        const { credit: _, ...bare } = khan ?? { credit: "" };
        return { ...(await good()), rows: [{ ...bare, rank: 1 }] };
      },
      /no credit line/,
    ],
  ])("with %s", async (_, broken, complaint) => {
    const found = envelopeViolations(await broken());
    expect(found.join("\n")).toMatch(complaint);
  });

  it("finds nothing wrong with the fixture's own answer", async () => {
    const answer = await good();
    expect(SearchEnvelope.parse(answer)).toEqual(answer);
    expect(envelopeViolations(answer)).toEqual([]);
  });
});
