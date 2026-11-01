import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import type { MuseRequest } from "./client.ts";
import { CONTRIBUTOR_MODEL, HttpMuse, type LiveText } from "./http.ts";
import { leaks } from "./pii.ts";
import { callAnswer, type Reply, scriptedFetch, textAnswer } from "./recorded.test-helpers.ts";

/**
 * Frozen (dl-z5ja.35's second test, moved to dl-z5ja.18 by lead decision 29): a contributor-tier
 * call never carries a learner's name on the wire, and a private-tier call sends the names as
 * they are (draft decision dl-2uq1). The wire is the body `fetch` was handed, read as a reader
 * would, so no spelling the matcher misses can pass by looking different.
 */

const NAMES = ["Kasia", "Łucja"];

/** A request with a learner's name in every place a prompt carries text. */
function withNames(tier: MuseRequest["tier"]): MuseRequest {
  return {
    ...requestFor(runId(), 1, tier === "private" ? "product:lesson-compose" : "bank:search"),
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

function http(replies: Reply[]) {
  const { fetch, sent } = scriptedFetch(replies);
  const live: LiveText[] = [];
  const muse = new HttpMuse({
    fetch,
    api_key: "test-key",
    models: { contributor: CONTRIBUTOR_MODEL, private: "muse-private-test-model" },
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

describe("a learner's name and the tiers (frozen)", () => {
  it("a contributor-tier call never carries a learner's name on the wire", async () => {
    const { muse, sent } = http([{ status: 200, body: textAnswer(["ok"]) }]);
    await muse.respond(withNames("contributor"));
    const wire = sent[0]?.raw ?? "";
    expect(leaks(wire, NAMES)).toEqual([]);
    // Read the decoded body too, in case an escape hid a letter from the raw one.
    const decoded = JSON.stringify(sent[0]?.body);
    for (const text of [wire, decoded]) {
      expect(asRead(text)).not.toMatch(/kasi|lucj/);
    }
    expect(wire).toContain("[NAME_1]");
    expect(wire).toContain("[NAME_2]");
  });

  it("a private-tier call sends the names as they are", async () => {
    const { muse, sent } = http([{ status: 200, body: textAnswer(["ok"]) }]);
    const request = withNames("private");
    await muse.respond(request);
    const body = sent[0]?.body ?? {};
    expect(body["instructions"]).toBe(request.instructions);
    expect(JSON.stringify(body["input"])).toContain("Kasia is in grade 1, a Lucja i KASIĄ też.");
    expect(JSON.stringify(body["input"])).toContain("Łucja pomaga");
    expect(sent[0]?.raw).not.toContain("[NAME_");
  });

  it("restores a contributor answer, its live text and its tool arguments", async () => {
    const { muse, live } = http([
      { status: 200, body: textAnswer(["Brawo, [NA", "ME_1]! I ", "[NAME_2], [NAME_7]."]) },
      { status: 200, body: callAnswer("lesson_draft", { topic: "dla [NAME_1]" }) },
    ]);
    const r = await muse.respond(withNames("contributor"));
    expect(r.text).toBe("Brawo, Kasia! I Łucja, [NAME_7].");
    expect(live.map((l) => l.text).join("")).toBe("Brawo, Kasia! I Łucja, [NAME_7].");
    const call = await muse.respond(withNames("contributor"));
    expect(call.tool_calls[0]?.input).toEqual({ topic: "dla Kasia" });
  });
});
