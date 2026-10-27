/**
 * The question type page: three tabs on the written examples, nothing judged. Try it fills a
 * scenario in and shows it as written, says so for an answer no scenario names, releases help rung
 * by rung up to the twin, and shows the solution read from the key after moving on. Review draws
 * every state, the miss with its written marks; Details shows the facts, every mode and the data.
 */

import { holdTheme } from "@jadwigo/ui";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { examplesFor } from "../examples/index.ts";
import { PlaygroundScreen } from "../PlaygroundScreen.tsx";
import { foundOf, specOf } from "../panels/question.ts";
import {
  askHelp,
  commitTry,
  initialTry,
  moveOn,
  nextVisible,
  type TryState,
} from "../panels/tryState.ts";

const PAGE = "/playground/choose/true_false/neighbour-row-claim";

beforeEach(() => window.history.replaceState(null, "", "/playground"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  holdTheme(document.documentElement, null);
});

function open(url: string): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("the playground calls no API"))),
  );
  window.history.replaceState(null, "", url);
  render(<PlaygroundScreen />);
}

const check = (): void => {
  const button = document.querySelector<HTMLElement>("[data-check]");
  if (button === null) throw new Error("no Check button");
  act(() => {
    fireEvent.click(button, { detail: 0 });
  });
};

describe("the page", () => {
  it("shows the type's name and status, and three tabs, with no lessons tab", () => {
    open(`${PAGE}?lang=en`);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("True or false");
    const tabs = screen.getAllByRole("tab").map((t) => t.textContent);
    expect(tabs).toEqual(["Try it", "Review", "Details"]);
  });
});

describe("Try it", () => {
  it("plays a written scenario from its button, with no Check, and says where it came from", () => {
    open(`${PAGE}?lang=en`);
    const button = document.querySelector<HTMLElement>('[data-play="1"]');
    if (button === null) throw new Error("no scenario button");
    act(() => {
      fireEvent.click(button);
    });
    expect(document.querySelector("[data-attempt]")?.getAttribute("data-attempt")).toBe(
      "incorrect",
    );
    expect(document.querySelector("[data-via]")?.getAttribute("data-via")).toBe("scenario");
    expect(document.querySelector("[data-bar]")?.getAttribute("data-band")).toBe("miss");
  });

  it("looks a free answer up in the authored data and shows it as written", () => {
    open(`${PAGE}?lang=en`);
    act(() => {
      fireEvent.click(
        within(screen.getByRole("region", { name: "The example" })).getByRole("radio", {
          name: /No/,
        }),
        { detail: 0 },
      );
    });
    check();
    expect(document.querySelector("[data-attempt]")?.getAttribute("data-attempt")).toBe("correct");
    expect(document.querySelector("[data-bar]")?.getAttribute("data-band")).toBe("right");
  });

  it("says an answer no scenario names is not judged, and leaves the step open", () => {
    const example = examplesFor("production")[0];
    if (example === undefined) throw new Error("no production example");
    const spec = specOf(example, "en");
    const state = commitTry(spec, initialTry, { entered: "123456" }, null);
    expect(state.phase).toBe("live");
    expect(state.feedback).toBeNull();
    expect(state.attempts).toEqual([{ n: 1, value: { entered: "123456" }, found: null }]);
  });

  it("releases help rung by rung, rungs 3 and 4 after a miss, and rung 4 plays the twin", () => {
    const example = examplesFor("true_false").find((e) => e.id === "neighbour-row-claim");
    if (example === undefined) throw new Error("no example");
    const spec = specOf(example, "en");
    const miss = example.scenarios.find((s) => s.outcome === "incorrect") ?? null;
    let state: TryState = askHelp(spec, initialTry);
    expect(state.help?.rung).toBe(1);
    state = askHelp(spec, state);
    expect(state.help?.rung).toBe(2);
    // Rung 3 waits for one real attempt.
    expect(askHelp(spec, state).helpRefused).toBe(true);
    state = commitTry(spec, state, { chosen: ["true"] }, miss === null ? null : foundOf(miss));
    expect(state.feedback?.kind).toBe("try_again");
    state = askHelp(spec, state);
    expect(state.help?.rung).toBe(3);
    state = askHelp(spec, state);
    expect(state.help?.rung).toBe(4);
    expect(state.onTwin).toBe(true);
    expect(JSON.stringify(state.help?.twin)).not.toMatch(/"key"/);
    expect(state.feedback).toBeNull();
  });

  it("moves on to the solution read from the key, and offers Dalej", () => {
    const example = examplesFor("true_false").find((e) => e.id === "neighbour-row-claim");
    if (example === undefined) throw new Error("no example");
    const spec = specOf(example, "en");
    const state = moveOn(spec, initialTry);
    expect(state.phase).toBe("solution");
    expect(state.solution).toEqual({ chosen: ["false"] });
    expect(nextVisible(state)).toBe(true);
  });
});

describe("Review", () => {
  it("draws every state, and the miss carries its written marks", () => {
    open(`/playground/choose/multi_select?tab=review&lang=en`);
    const states = screen.getByRole("region", { name: "Every state" });
    for (const id of ["untouched", "picked", "missed", "right", "solution"])
      expect(states.querySelector(`[data-state="${id}"]`), id).not.toBeNull();
    expect(states.querySelector('[data-state="incomplete"]')).toBeNull();
    expect(states.querySelector('[data-state="missed"] [data-tone="amber"]')).not.toBeNull();
  });

  it("greys a level the type cannot show, and keeps it in place", () => {
    open("/playground/sequence/order?tab=review&lang=en");
    const toolbar = within(screen.getByRole("toolbar", { name: "Review settings" }));
    expect(toolbar.getByRole("radio", { name: "Pictures" }).hasAttribute("disabled")).toBe(true);
    expect(toolbar.getByRole("radio", { name: "Numbers only" }).hasAttribute("disabled")).toBe(
      false,
    );
  });

  it("holds the page dark while the tab is open, and leaving releases it", () => {
    open(`${PAGE}?tab=review&theme=dark`);
    expect(document.documentElement.getAttribute("theme")).toBe("dark");
    cleanup();
    expect(document.documentElement.getAttribute("theme")).toBeNull();
  });
});

describe("Details", () => {
  it("shows the type's facts, every mode, the data and the family's guide", () => {
    open(`${PAGE}?tab=details&lang=en`);
    for (const name of [
      "This question type",
      "Every way it is shown",
      "As data",
      "The Choose family",
    ])
      expect(screen.getByRole("region", { name }), name).toBeTruthy();
    const data = screen.getByRole("region", { name: "Each scenario, as written" });
    expect(data.textContent).toContain('"outcome": "correct"');
    expect(screen.getByRole("region", { name: "The twin" })).toBeTruthy();
  });
});
