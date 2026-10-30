import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_MEDIA_URL } from "../../media.ts";
import { ConformanceScreen } from "./ConformanceScreen.tsx";

// Made-up items in the conversion's shape: no bank item is ever in git (AGENTS.md fence 8).
const ENTER = {
  id: "item-enter",
  exercise: "made-up-exercise",
  spec: {
    family: "enter",
    question_type: "production",
    say: "Pomnóż.",
    data: { entry: "keypad", input: "number", figure: { kind: "expression", text: "4 × 3 =" } },
    key: { accept: ["12"] },
  },
};
const items = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ ...ENTER, id: `item-${String(i).padStart(2, "0")}` }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.__jadwigoConformance;
});

describe("the conformance page", () => {
  it("refuses to run with no media URL, since every picture would read as missing", async () => {
    vi.stubEnv("VITE_MEDIA_URL", "");
    render(<ConformanceScreen />);
    await waitFor(() => expect(window.__jadwigoConformance?.done).toBe(true));
    expect(window.__jadwigoConformance?.error).toBe(NO_MEDIA_URL);
  });

  it("checks every item across batches, each once", async () => {
    vi.stubEnv("VITE_MEDIA_URL", "https://media.invalid");
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ items: items(23) })));
    render(<ConformanceScreen />);
    await waitFor(() => expect(window.__jadwigoConformance?.done).toBe(true), { timeout: 5_000 });
    const state = window.__jadwigoConformance;
    expect(state?.error).toBeUndefined();
    expect(state?.total).toBe(23);
    expect(state?.results.map((r) => r.item_id)).toEqual(items(23).map((i) => i.id));
    expect(state?.results.flatMap((r) => r.findings.map((f) => f.rule))).toEqual([]);
  });
});
