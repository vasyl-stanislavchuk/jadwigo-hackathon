import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_MEDIA_URL } from "../../media.ts";
import { ConformanceScreen } from "./ConformanceScreen.tsx";
import { PLANTED, plantedFile } from "./planted.ts";

// Made-up items in the conversion's shape: no bank item is ever in git (AGENTS.md fence 8).
const ENTER = {
  id: "item-enter",
  language: "pl",
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

  it("gives each planted item its reason, and the ready one none", async () => {
    vi.stubEnv("VITE_MEDIA_URL", "https://media.invalid");
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json(plantedFile())));
    render(<ConformanceScreen />);
    await waitFor(() => expect(window.__jadwigoConformance?.done).toBe(true), { timeout: 5_000 });
    const rules = Object.fromEntries(
      (window.__jadwigoConformance?.results ?? []).map((r) => [
        r.item_id,
        r.findings.map((f) => f.rule),
      ]),
    );
    expect(rules).toEqual({
      [PLANTED.ready.id]: [],
      [PLANTED.tex.id]: [],
      [PLANTED.key.id]: ["key-grades"],
      [PLANTED.picture.id]: ["render-picture-missing"],
      // "not checked" is the status's, which jw reads; the page finds nothing to refuse.
      [PLANTED.unchecked.id]: [],
      [PLANTED.loose.id]: ["unknown-field"],
    });
  });

  it("draws each item in its own language, and refuses one the app does not speak", async () => {
    vi.stubEnv("VITE_MEDIA_URL", "https://media.invalid");
    // A "none of these" option draws the app's own words, which follow the language.
    const data = {
      ...PLANTED.ready.spec.data,
      options: [...PLANTED.ready.spec.data.options, { id: "o3", content: { kind: "none" } }],
    };
    const item = { ...PLANTED.ready, spec: { ...PLANTED.ready.spec, data } };
    const variants = [
      { ...item, id: "variant-pl", language: "pl" },
      { ...item, id: "variant-en", language: "en" },
      { ...item, id: "variant-de", language: "de" },
    ];
    // The page draws a batch and moves on, so the copy is read while the batch is up.
    const drawn = new Map<string, string>();
    const observer = new MutationObserver(() => {
      for (const el of document.querySelectorAll("[data-item]")) {
        const id = el.getAttribute("data-item");
        if (id !== null && el.textContent) drawn.set(id, el.textContent);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    vi.stubGlobal("fetch", () => Promise.resolve(Response.json({ items: variants })));
    render(<ConformanceScreen />);
    await waitFor(() => expect(window.__jadwigoConformance?.done).toBe(true), { timeout: 5_000 });
    observer.disconnect();
    expect(drawn.get("variant-pl")).toBeTruthy();
    expect(drawn.get("variant-en")).toBeTruthy();
    expect(drawn.get("variant-en")).not.toEqual(drawn.get("variant-pl"));
    const rules = Object.fromEntries(
      (window.__jadwigoConformance?.results ?? []).map((r) => [
        r.item_id,
        r.findings.map((f) => f.rule),
      ]),
    );
    expect(rules).toEqual({
      "variant-pl": [],
      "variant-en": [],
      "variant-de": ["render-unplayable"],
    });
  });
});
