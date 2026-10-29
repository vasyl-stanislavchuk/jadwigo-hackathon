import { ROUTES, SearchEnvelope } from "@jadwigo/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BankError, bankProfile, createBank } from "./index.ts";
import {
  bankThatAbstains,
  bankThatTimesOut,
  degradedRerank,
  emptyBank,
  FIXTURE_ROWS,
  fakeBank,
  keyLeakAttempt,
  setRow,
} from "./testing.ts";

const NEED = { words: "dodawanie", language: "pl", grade: "1" } as const;

function stateOf(envelope: SearchEnvelope, arm: string): string | undefined {
  return envelope.state.find((row) => row.arm === arm)?.state;
}

describe("createBank('fixture')", () => {
  const bank = createBank("fixture");

  it("returns an envelope SearchEnvelope parses, arm C ok and every other arm not_asked", async () => {
    const envelope = await bank.search(NEED);
    expect(SearchEnvelope.parse(envelope)).toEqual(envelope);
    expect(envelope.rows.map((row) => row.id)).toEqual(["set_khan_xf1x001"]);
    expect(envelope.bank_rev).toBe("fixture");
    expect(envelope.state).toEqual([
      { arm: "A", state: "not_asked" },
      { arm: "A1", state: "not_asked" },
      { arm: "B", state: "not_asked" },
      { arm: "B1", state: "not_asked" },
      { arm: "C", state: "ok" },
      { arm: "C2", state: "not_asked" },
    ]);
  });

  it("meets Polish spelling with or without its letters", async () => {
    for (const words of ["ułamki połowa", "ulamki polowa"]) {
      const envelope = await bank.search({ words, language: "pl", grade: "3" });
      expect(envelope.rows.map((row) => row.id)).toEqual(["set_own_fx0003"]);
    }
  });

  it("finds by skill and ranks from 1, best first, within the limit", async () => {
    const envelope = await bank.search({
      skills: ["maths.multiply.facts"],
      words: "add within 20 multiply",
      language: "en",
      grade: "2",
      limit: 1,
    });
    expect(envelope.rows).toHaveLength(1);
    expect(envelope.rows[0]?.rank).toBe(1);
  });

  it("answers a need no set holds as empty, not an error", async () => {
    const envelope = await bank.search({ words: "photosynthesis", language: "en", grade: "3" });
    expect(envelope.rows).toEqual([]);
    expect(stateOf(envelope, "C")).toBe("empty");
  });

  it("carries the credit line on a Khan set", async () => {
    const [khan] = FIXTURE_ROWS;
    expect(khan?.credit).toMatch(/^Khan Academy, CC BY-NC-SA 4.0, https:/);
  });
});

describe("createBank('api')", () => {
  it("calls POST /api/v1/question-searches with the need and the bearer token", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const answer = await createBank("fixture").search(NEED);
    const bank = createBank("api", {
      base: "https://api.test/",
      token: "read-token",
      fetch: async (url, init) => {
        calls.push({ url: String(url), init });
        return Response.json(answer);
      },
    });
    expect(await bank.search(NEED)).toEqual(answer);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe(`https://api.test${ROUTES.questionSearches.path}`);
    expect(calls[0]?.init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(NEED);
    const headers = (calls[0]?.init?.headers ?? {}) as Record<string, string>;
    expect(headers["authorization"]).toBe("Bearer read-token");
  });

  it.each([
    [
      "refused",
      async () =>
        Response.json({ error: { type: "BadRequest", message: "grade: bad" } }, { status: 400 }),
      "grade: bad",
    ],
    ["unavailable", async () => new Response("", { status: 502 }), "502"],
    [
      "unavailable",
      async () => {
        throw new TypeError("fetch failed");
      },
      "no answer",
    ],
    [
      "timeout",
      async () => {
        throw new DOMException("timed out", "TimeoutError");
      },
      "took over",
    ],
  ])("rejects with a %s BankError", async (kind, fetch, message) => {
    const bank = createBank("api", { base: "", fetch: fetch as typeof globalThis.fetch });
    const error = await bank.search(NEED).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(BankError);
    expect(error).toMatchObject({ kind });
    expect((error as BankError).message).toContain(message);
  });
});

describe("@jadwigo/bank/testing", () => {
  it("fakeBank searches exactly the sets it is given", async () => {
    const only = setRow({ id: "set_own_fx0099", titles: { pl: "Dodawanie dziesiątek" } });
    const envelope = await fakeBank({ rows: [only] }).search(NEED);
    expect(envelope.rows.map((row) => row.id)).toEqual(["set_own_fx0099"]);
  });

  it("emptyBank answers empty with no rows", async () => {
    const envelope = await emptyBank.search(NEED);
    expect([envelope.rows, stateOf(envelope, "C")]).toEqual([[], "empty"]);
  });

  it("bankThatAbstains answers abstained with no rows", async () => {
    const envelope = await bankThatAbstains.search(NEED);
    expect([envelope.rows, stateOf(envelope, "C")]).toEqual([[], "abstained"]);
  });

  it("degradedRerank still returns A1's rows, with C degraded and a detail", async () => {
    const envelope = await degradedRerank.search(NEED);
    expect(envelope.rows.length).toBeGreaterThan(0);
    expect(envelope.rows.every((row) => row.arm === "A1" && row.rerank_score === null)).toBe(true);
    expect(stateOf(envelope, "C")).toBe("degraded");
    expect(stateOf(envelope, "A1")).toBe("ok");
    expect(envelope.state.find((row) => row.arm === "C")?.detail).toBeTruthy();
  });

  it("bankThatTimesOut rejects with a timeout BankError", async () => {
    await expect(bankThatTimesOut.search(NEED)).rejects.toMatchObject({ kind: "timeout" });
  });

  it("keyLeakAttempt reaches the consumer with the key stripped and the private-bodied row dropped", async () => {
    const envelope = await keyLeakAttempt.search(NEED);
    expect(envelope.rows.map((row) => row.id)).toEqual([FIXTURE_ROWS[0]?.id]);
    const text = JSON.stringify(envelope);
    for (const leak of ["answer_key", "private question body", "leaked-key-value", "api_key"])
      expect(text).not.toContain(leak);
  });
});

describe("bankProfile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads JADWIGO_BANK, unset or blank as undefined", () => {
    vi.stubEnv("JADWIGO_BANK", " api ");
    expect(bankProfile()).toBe("api");
    vi.stubEnv("JADWIGO_BANK", "  ");
    expect(bankProfile()).toBeUndefined();
  });

  it("refuses local and remote by name, since jadwigo-bank serves them", () => {
    vi.stubEnv("JADWIGO_BANK", "local");
    expect(() => bankProfile()).toThrow(/local and remote are jadwigo-bank's/);
  });
});
