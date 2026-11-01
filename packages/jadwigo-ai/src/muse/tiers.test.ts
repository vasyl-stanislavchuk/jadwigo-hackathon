import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import type { MuseRequest } from "./client.ts";
import { CONTRIBUTOR_MODEL, HttpMuse, type LiveText } from "./http.ts";
import { leaks } from "./pii.ts";
import { callAnswer, type Reply, scriptedFetch, textAnswer } from "./recorded.test-helpers.ts";

/**
 * Frozen (dl-z5ja.35's second test, moved to dl-z5ja.18 by lead decision 29, then rewritten by
 * the owner's decision of 2026-11-01, bead dl-uafq,
 * `jadwigo-hackathon/decisions/2026-11-01-a-learner-s-data-names-included-may-reach-any-meta-model-the-con`):
 * a learner call's names pass through on every tier, the contributor model included. The guard
 * is kept for bank work only, and a bank call still carries no name. The wire is the body `fetch`
 * was handed, read as a reader would, so no spelling the matcher misses can pass by looking
 * different. Every name here is made up.
 */

const NAMES = ["Kasia", "Łucja"];

/** A request with a learner's name in every place a prompt carries text. */
function withNames(tier: MuseRequest["tier"], tag = "product:lesson-compose"): MuseRequest {
  return {
    ...requestFor(runId(), 1, tag),
    tier,
    names: NAMES,
    instructions: "Draft a lesson. The parent adds: Kasi trudno idzie odejmowanie.",
    input: [
      { type: "message", role: "system", text: "Uczeń: Kasia, klasa 1." },
      { type: "message", role: "user", text: "Kasia is in grade 1, a Lucja i KASIĄ też." },
      { type: "message", role: "assistant", text: "Dobrze, zrobię lekcję dla Kasi." },
      {
        type: "function_call",
        call_id: "c1",
        verb: "lesson_draft",
        arguments: { topic: "odejmowanie dla Kasi", notes: ["Łucja pomaga"] },
      },
      {
        type: "function_call_output",
        call_id: "c1",
        output: { title: "Lekcja dla Kasi", by: { who: "Łucji" } },
      },
    ],
  };
}

function asRead(text: string): string {
  const visible = Array.from(text)
    .filter((ch) => !/^\p{Cf}$/u.test(ch))
    .join("");
  return visible.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "");
}

function http(replies: Reply[], privateModel: string | null = null) {
  const { fetch, sent } = scriptedFetch(replies);
  const live: LiveText[] = [];
  const muse = new HttpMuse({
    fetch,
    api_key: "test-key",
    models: { contributor: CONTRIBUTOR_MODEL, private: privateModel },
    prices: {
      [CONTRIBUTOR_MODEL]: { input: 0.1, cached: 0.002, output: 0.2 },
      "muse-private-test-model": { input: 0.1, cached: 0.002, output: 0.2 },
    },
    budget: () => Promise.resolve(),
    sleep: () => Promise.resolve(),
    now: () => FIXED_NOW,
    live: (t) => live.push(t),
    batch_chars: 1,
  });
  return { muse, sent, live };
}

/** The names a learner request carries, as they are, in the body sent. */
function expectNamesAsSent(
  sent: { body: Record<string, unknown>; raw: string } | undefined,
  request: MuseRequest,
) {
  const body = sent?.body ?? {};
  expect(body["instructions"]).toBe(request.instructions);
  const input = JSON.stringify(body["input"]);
  expect(input).toContain("Kasia is in grade 1, a Lucja i KASIĄ też.");
  expect(input).toContain("odejmowanie dla Kasi");
  expect(input).toContain("Łucji");
  expect(sent?.raw).not.toContain("[NAME_");
}

describe("a learner's name and the tiers (frozen)", () => {
  it("names pass through on every tier", async () => {
    for (const tier of ["private", "contributor"] as const) {
      const { muse, sent } = http([{ status: 200, body: textAnswer(["ok"]) }]);
      const request = withNames(tier);
      await muse.respond(request);
      // No private model is named, so both tiers reach the contributor model, names and all.
      expect(sent[0]?.body["model"]).toBe(CONTRIBUTOR_MODEL);
      expectNamesAsSent(sent[0], request);
    }
  });

  it("a named, priced private model gets the private tier, names as they are", async () => {
    const { muse, sent } = http(
      [{ status: 200, body: textAnswer(["ok"]) }],
      "muse-private-test-model",
    );
    const request = withNames("private");
    await muse.respond(request);
    expect(sent[0]?.body["model"]).toBe("muse-private-test-model");
    expectNamesAsSent(sent[0], request);
  });
});

describe("the guard, kept for bank work", () => {
  it("a bank call carries no learner name on the wire, on either tier", async () => {
    for (const tier of ["private", "contributor"] as const) {
      const { muse, sent } = http([{ status: 200, body: textAnswer(["ok"]) }]);
      await muse.respond(withNames(tier, "bank:search"));
      const wire = sent[0]?.raw ?? "";
      expect(leaks(wire, NAMES)).toEqual([]);
      for (const text of [wire, JSON.stringify(sent[0]?.body)]) {
        expect(asRead(text)).not.toMatch(/kasi|lucj/);
      }
      expect(wire).toContain("[NAME_1]");
      expect(wire).toContain("[NAME_2]");
    }
  });

  it("restores a bank answer, its live text and its tool arguments", async () => {
    const { muse, live } = http([
      { status: 200, body: textAnswer(["Brawo, [NA", "ME_1]! I ", "[NAME_2], [NAME_7]."]) },
      { status: 200, body: callAnswer("lesson_draft", { topic: "dla [NAME_1]" }) },
    ]);
    const r = await muse.respond(withNames("contributor", "bank:search"));
    expect(r.text).toBe("Brawo, Kasia! I Łucja, [NAME_7].");
    expect(live.map((l) => l.text).join("")).toBe("Brawo, Kasia! I Łucja, [NAME_7].");
    const call = await muse.respond(withNames("contributor", "bank:search"));
    expect(call.tool_calls[0]?.input).toEqual({ topic: "dla Kasia" });
  });

  it("guards the lanes HttpMuse is told to, and only those", async () => {
    const { fetch, sent } = scriptedFetch([
      { status: 200, body: textAnswer(["ok"]) },
      { status: 200, body: textAnswer(["ok"]) },
    ]);
    const muse = new HttpMuse({
      fetch,
      api_key: "test-key",
      models: { contributor: CONTRIBUTOR_MODEL, private: null },
      guard_lanes: ["eval"],
      budget: () => Promise.resolve(),
      sleep: () => Promise.resolve(),
      now: () => FIXED_NOW,
    });
    await muse.respond(withNames("contributor", "eval:words"));
    await muse.respond(withNames("contributor", "bank:search"));
    expect(sent[0]?.raw).toContain("[NAME_1]");
    expect(sent[1]?.raw).not.toContain("[NAME_");
  });
});
